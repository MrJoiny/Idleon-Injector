/**
 * Shared hooks and helpers for account feature tabs.
 *
 * Pattern guide - choose one per tab:
 *
 *  A) Persistent-pane tabs (Anvil, Forge, Liquid, P2W, PostOffice, Sigil):
 *       Build the DOM once before the first load. Reactive van.state objects
 *       update individual cells in place, so refresh does not rebuild the list
 *       or reset scroll position.
 *       -> use persistentState on AccountPageShell + useWriteStatus
 *
 *  B) Re-render-on-load tabs (Vials, AtomCollider, SaltLick):
 *       The list is cheap to rebuild and does not keep persistent row DOM.
 *       -> use useAccountLoad + inline renderBody + useWriteStatus
 */

import van from "../../../vendor/van-1.6.0.js";
import { gga, ggaMany } from "../../../services/api.js";
import { Icons } from "../../../assets/icons.js";
import { Loader } from "../../Loader.js";
import { EmptyState } from "../../EmptyState.js";
import { formatNumber, formattedStep, parseNumber } from "../../../utils/numberFormat.js";

const { div } = van.tags;

/** Unwrap a plain value, van.state, or zero-arg function. */
export const resolveValue = (valueOrState) => {
    if (typeof valueOrState === "function") return valueOrState();
    if (valueOrState && typeof valueOrState === "object" && "val" in valueOrState) return valueOrState.val;
    return valueOrState;
};

/** Normalize nullable/single/array content into an array of renderable nodes. */
export const toNodes = (content) => {
    if (content === null || content === undefined) return [];
    return Array.isArray(content) ? content : [content];
};

/** Join nullable class-name parts into a single class string. */
export const joinClasses = (...parts) => parts.filter(Boolean).join(" ");

/** Reuse a keyed van.state instance across refreshes. */
export const getOrCreateState = (map, key, initial = 0) => {
    if (!map.has(key)) map.set(key, van.state(initial));
    return map.get(key);
};

/** Create a lazy indexed van.state getter for sparse numeric/list indexes. */
export const createIndexedStateGetter = (initial = 0) => {
    const states = [];
    return (index) => {
        if (!states[index]) states[index] = van.state(typeof initial === "function" ? initial(index) : initial);
        return states[index];
    };
};

/**
 * Safely coerce a value to a finite number.
 * Returns `fallback` when coercion yields NaN/Infinity.
 */
export const toNum = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

/** Unwrap Idleon-style wrapper objects that store payload in `.h`. */
export const unwrapH = (value) => (value && typeof value === "object" && "h" in value ? value.h : value);

/**
 * Safely coerce a value to a finite integer with configurable behavior.
 * - Default: round to nearest integer.
 * - mode: "floor" for floor behavior.
 * - min: clamp lower bound (e.g. 0 for non-negative ints).
 *
 * Backward compatible call style is supported:
 *   toInt(value, fallbackNumber)
 */
export const toInt = (value, opts = 0) => {
    const hasConfig = opts !== null && typeof opts === "object" && !Array.isArray(opts);
    const fallback = hasConfig ? (opts.fallback ?? 0) : opts;
    const mode = hasConfig ? (opts.mode ?? "round") : "round";
    const min = hasConfig ? (opts.min ?? -Infinity) : -Infinity;

    const n = toNum(value, toNum(fallback, 0));
    const asInt = mode === "floor" ? Math.floor(n) : Math.round(n);
    return Math.max(min, asInt);
};

/**
 * Normalize raw NumberInput text into a finite numeric value.
 * Supports formatted strings (e.g. "1.2M", "12,345"), float/int output,
 * optional clamping, and a nullable fallback for invalid input.
 */
export const resolveNumberInput = (
    raw,
    { formatted = false, float = false, min = -Infinity, max = Infinity, fallback = null } = {}
) => {
    let next = null;

    if (formatted) {
        next = parseNumber(String(raw));
    }

    if (next === null) {
        const coerced = Number(raw);
        if (!Number.isFinite(coerced)) return fallback;
        next = coerced;
    }

    const normalized = float ? next : Math.round(next);
    return Math.max(min, Math.min(max, normalized));
};

/** Normalize formatted NumberInput text into a clamped integer value. */
export const resolveFormattedIntInput = (raw, fallback = null, { min = 0, max = Infinity } = {}) =>
    resolveNumberInput(raw, {
        formatted: true,
        min,
        max,
        fallback,
    });

/** Increment or decrement formatted integer input text by the least significant displayed digit. */
export const adjustFormattedIntInput = (raw, delta, fallback = 0, { min = 0, max = Infinity } = {}) => {
    const base = resolveFormattedIntInput(raw, fallback, { min, max });
    const current = base ?? fallback ?? min;
    return Math.max(min, Math.min(max, current + delta * formattedStep(current)));
};

export const largeFormatter = (raw) => {
    const n = parseNumber(String(raw));
    return n !== null ? formatNumber(n) : String(raw);
};

export const largeParser = (display) => {
    const n = parseNumber(display);
    return n !== null ? String(n) : null;
};

export const cleanName = (raw, fallback = "", { stripMarker = false } = {}) => {
    const base = String(raw ?? fallback);
    const normalized = stripMarker ? base.replace(/製.*$/, "") : base;
    return normalized.replace(/_/g, " ").trim();
};

export const cleanNameEffect = (raw, fallback = "") =>
    cleanName(String(raw ?? fallback).replace(/^\+\{[%\s]*/, ""), fallback);

export const sortPrefixedNumericCodes = (a, b) => {
    const keyDelta = a.charCodeAt(0) - b.charCodeAt(0);
    if (keyDelta !== 0) return keyDelta;
    return Number(a.slice(1)) - Number(b.slice(1));
};

export const renderAccountLoading = () => div({ class: "account-loader" }, Loader());

export const renderAccountError = (message) =>
    EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: message });

/**
 * Write a value through gga (or a compatible writer) and fail if verification
 * reports a mismatch.
 */
export const writeVerified = async (path, value, { write = gga, message = null } = {}) => {
    const ok = await write(path, value);
    if (ok) return value;

    throw new Error(typeof message === "function" ? message(path, value) : (message ?? `Write mismatch at ${path}`));
};

const normalizeGgaPath = (path) => String(path ?? "").replace(/^gga\./, "");

/**
 * Write many GGA paths and throw a consistent error for the first failed write.
 *
 * @param {Array<{ path: string, value: any }>} writes
 * @returns {Promise<any>}
 */
export const writeManyVerified = async (writes) => {
    if (!writes.length) return { ok: true, results: [] };

    const result = await ggaMany(writes);
    const failed = result.results.find((entry) => !entry.ok);
    if (!failed) return result;

    const failedPath = normalizeGgaPath(failed.path);
    const failedWrite = writes.find((entry) => normalizeGgaPath(entry.path) === failedPath);
    const expected = failedWrite?.value ?? "unknown";

    throw new Error(`Write mismatch at ${failedPath}: expected ${expected}`);
};

const toWriteEntries = (writeOrWrites) => {
    if (writeOrWrites === null || writeOrWrites === undefined) return [];
    return Array.isArray(writeOrWrites) ? writeOrWrites.filter(Boolean) : [writeOrWrites];
};

/**
 * Shared bulk setter for account rows that write target values then update local state.
 *
 * @param {object} opts
 * @param {Array|function} opts.entries
 * @param {function} opts.getTargetValue
 * @param {function} opts.getValueState
 * @param {function} [opts.getPath]
 * @param {function} [opts.getWrites]
 * @param {function} [opts.shouldWrite]
 * @param {function} [opts.applyLocal]
 * @returns {Promise<void>}
 */
export const runBulkSet = async ({
    entries,
    getTargetValue,
    getValueState,
    getPath = null,
    getWrites = null,
    shouldWrite = ({ currentValue, targetValue }) => Number(currentValue ?? 0) !== targetValue,
    applyLocal = null,
}) => {
    const resolvedEntries = typeof entries === "function" ? entries() : (entries ?? []);
    const targets = [];
    const writes = [];

    resolvedEntries.forEach((entry, index) => {
        const targetValue = getTargetValue(entry, index);
        const valueState = getValueState(entry, index);
        const currentValue = resolveValue(valueState);
        targets[index] = targetValue;

        if (typeof getWrites === "function") {
            writes.push(...toWriteEntries(getWrites({ entry, index, currentValue, targetValue, valueState })));
            return;
        }

        if (!shouldWrite({ entry, index, currentValue, targetValue, valueState })) return;
        writes.push({ path: getPath(entry, index, targetValue), value: targetValue });
    });

    await writeManyVerified(writes);

    resolvedEntries.forEach((entry, index) => {
        const targetValue = targets[index];
        if (typeof applyLocal === "function") {
            applyLocal(entry, index, targetValue);
            return;
        }

        getValueState(entry, index).val = targetValue;
    });
};

/**
 * Hook that wraps an async write operation with loading / success / error
 * status tracking and automatic status-clear timers.
 *
 * Usage:
 *   const { status, run } = useWriteStatus();
 *
 *   await run(async () => {
 *       await gga("SomeKey", value);
 *       localState.val = value;
 *   });
 *
 *   // status.val is one of: null | "loading" | "success" | "error"
 *   // Bind it to CSS classes or button labels as needed.
 *
 * run() accepts an optional second argument to override per-call:
 *   await run(task, { successMs: 1000 });
 *   await run(task, { loadingState: "saving", successState: "saved" });
 *   await run(task, { onSuccess: (result) => ..., onError: (err) => ... });
 */
export const useWriteStatus = ({ successMs = 1200, errorMs = 1200 } = {}) => {
    const status = van.state(null);
    let clearTimer = null;

    const clearStatus = () => {
        if (clearTimer) {
            clearTimeout(clearTimer);
            clearTimer = null;
        }
        status.val = null;
    };

    const scheduleClear = (ms) => {
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
            status.val = null;
            clearTimer = null;
        }, ms);
    };

    const run = async (
        task,
        {
            loadingState = "loading",
            successState = "success",
            errorState = "error",
            onSuccess = null,
            onError = null,
        } = {}
    ) => {
        if (clearTimer) {
            clearTimeout(clearTimer);
            clearTimer = null;
        }

        status.val = loadingState;

        try {
            const result = await task();
            status.val = successState;
            if (typeof onSuccess === "function") onSuccess(result);
            if (successMs > 0) scheduleClear(successMs);
            return { ok: true, result };
        } catch (error) {
            status.val = errorState;
            if (typeof onError === "function") onError(error);
            if (errorMs > 0) scheduleClear(errorMs);
            return { ok: false, error };
        }
    };

    return { status, run, clearStatus };
};
