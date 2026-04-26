/**
 * State Accessors API
 *
 * Functions for accessing and modifying game state:
 * - Unified path-based read/write (readPath, writePath)
 * - Selective object-entry reads for large maps (readEntries)
 * - Small computed-value bridge for internal helper families
 * - cheatState access
 */

import { cheatState } from "../core/state.js";
import { events } from "../core/globals.js";
import { resolvePath } from "../utils/pathResolver.js";

const COMPUTED_SOURCES = {
    workbench: { eventId: 345, method: "_customBlock_WorkbenchStuff" },
    alchemy: { eventId: 189, method: "_customBlock_cauldronp2wbonuses" },
    summoning: { eventId: 579, method: "_customBlock_Summoning" },
    atomCollider: { eventId: 579, method: "_customBlock_AtomCollider" },
    runCode: { eventId: 12, method: "_customBlock_RunCodeOfTypeXforThingY" },
    runCodeType: { eventId: 12, method: "_customBlock_RunCodeOfType" },
    dream: { eventId: 579, method: "_customBlock_Dreamstuff" },
    skillStats: { eventId: 12, method: "_customBlock_SkillStats" },
};

export function getcheatStateList() {
    return cheatState;
}

/**
 * Read a game value by dot/bracket path string.
 * @param {string} path - Path like "gga.StampLevel" or "gga.StampLevel[0][3]"
 * @returns {{ value: any } | { error: string }}
 */
export function readPath(path) {
    const resolved = resolvePath(path);
    if (resolved.error) return resolved;
    const { target, prop } = resolved;
    if (prop === undefined) return { error: "Path must include at least one key below the root" };
    const raw = target[prop];
    // CDP returnByValue cannot serialize Haxe arrays/objects directly — they come
    // back as {}. JSON round-trip coerces them into plain serializable values.
    try {
        const value = JSON.parse(JSON.stringify(raw));
        return { value };
    } catch {
        return { value: raw };
    }
}

/**
 * Read selected entries from a root object path.
 * Optional field picking reads from entry.h first (Haxe objects), then falls back
 * to direct entry fields.
 *
 * @param {string} rootPath - Path to an object map like "gga.ItemDefinitionsGET.h"
 * @param {string[]} keys - Entry keys to read
 * @param {string[]=} fields - Optional field names to pick from each entry
 * @returns {{ value: object } | { error: string }}
 */
export function readEntries(rootPath, keys, fields = null) {
    if (!rootPath || typeof rootPath !== "string") return { error: "Missing or invalid rootPath" };
    if (!Array.isArray(keys) || keys.length === 0) return { error: "keys must be a non-empty array" };
    if (!keys.every((key) => typeof key === "string" && key.length > 0)) {
        return { error: "keys must contain non-empty strings" };
    }
    if (fields !== null && fields !== undefined) {
        if (!Array.isArray(fields)) return { error: "fields must be an array of strings" };
        if (!fields.every((field) => typeof field === "string" && field.length > 0)) {
            return { error: "fields must contain non-empty strings" };
        }
    }

    const resolved = resolvePath(rootPath);
    if (resolved.error) return resolved;

    const { target, prop } = resolved;
    if (prop === undefined) return { error: "Path must include at least one key below the root" };

    const root = target[prop];
    if (!root || typeof root !== "object") {
        return { error: "Resolved root is not an object" };
    }

    const value = {};
    const shouldPickFields = Array.isArray(fields) && fields.length > 0;

    for (const key of keys) {
        const entry = root[key];
        if (entry === undefined) continue;

        if (!shouldPickFields) {
            value[key] = entry;
            continue;
        }

        const source = entry && typeof entry === "object" && entry.h && typeof entry.h === "object" ? entry.h : entry;
        const picked = {};

        for (const field of fields) {
            picked[field] = source?.[field];
        }

        value[key] = picked;
    }

    return { value };
}

/**
 * Read a computed value from a game helper family.
 * Uses the same injected ActorEvents access pattern as the minigame cheats:
 * events(345), events(579), etc. The UI never touches ActorEvents directly.
 *
 * @param {string} namespace
 * @param {string} name
 * @param {Array=} args
 * @returns {{ value: any } | { error: string }}
 */
export function readComputed(namespace, name, args = []) {
    if (!namespace || typeof namespace !== "string") return { error: "Missing or invalid namespace" };
    if (!name || typeof name !== "string") return { error: "Missing or invalid name" };
    if (!Array.isArray(args)) return { error: "args must be an array" };

    const source = COMPUTED_SOURCES[namespace];
    if (!source) return { error: `Unsupported computed namespace: ${namespace}` };
    if (typeof events !== "function") return { error: "ActorEvents bridge unavailable" };

    try {
        const actorEvents = events(source.eventId);
        const fn = actorEvents?.[source.method];
        if (typeof fn !== "function") {
            return { error: `Computed helper unavailable: ${namespace}.${name}` };
        }
        return { value: Reflect.apply(fn, actorEvents, [name, ...args]) };
    } catch (e) {
        return { error: `Computed helper threw (${namespace}.${name}): ${e?.message ?? String(e)}` };
    }
}

/**
 * Read many computed values from one game helper family.
 * Resolves ActorEvents and helper once, then preserves per-item failures.
 *
 * @param {string} namespace
 * @param {string} name
 * @param {Array[]=} argSets
 * @returns {{ value: Array<{ ok: boolean, value?: any, error?: string }> } | { error: string }}
 */
export function readComputedMany(namespace, name, argSets = []) {
    if (!namespace || typeof namespace !== "string") return { error: "Missing or invalid namespace" };
    if (!name || typeof name !== "string") return { error: "Missing or invalid name" };
    if (!Array.isArray(argSets)) return { error: "argSets must be an array" };
    if (!argSets.every(Array.isArray)) return { error: "argSets must contain arrays" };

    const source = COMPUTED_SOURCES[namespace];
    if (!source) return { error: `Unsupported computed namespace: ${namespace}` };
    if (typeof events !== "function") return { error: "ActorEvents bridge unavailable" };

    try {
        const actorEvents = events(source.eventId);
        const fn = actorEvents?.[source.method];
        if (typeof fn !== "function") {
            return { error: `Computed helper unavailable: ${namespace}.${name}` };
        }

        const value = argSets.map((args) => {
            try {
                return { ok: true, value: Reflect.apply(fn, actorEvents, [name, ...args]) };
            } catch (e) {
                return { ok: false, error: `Computed helper threw (${namespace}.${name}): ${e?.message ?? String(e)}` };
            }
        });

        return { value };
    } catch (e) {
        return { error: `Computed helper threw (${namespace}.${name}): ${e?.message ?? String(e)}` };
    }
}

/**
 * Write a game value by dot/bracket path string.
 * @param {string} path - Path like "gga.StampLevel[0][3]"
 * @param {any} value - JSON-serializable value to write
 * @returns {{ ok: true } | { error: string }}
 */
export function writePath(path, value) {
    if (value === undefined) return { error: "Missing value" };
    const resolved = resolvePath(path);
    if (resolved.error) return resolved;
    const { target, prop } = resolved;
    if (prop === undefined) return { error: "Path must include at least one key below the root" };
    target[prop] = value;
    return { ok: true };
}

/**
 * Write many game values by dot/bracket path strings.
 *
 * Non-atomic: each entry is attempted independently; earlier successful writes
 * are not rolled back if a later entry fails. UI callers should read back each
 * path and verify before treating the batch as committed.
 *
 * @param {Array<{ path: string, value: any }>} writes
 * @returns {{ ok: boolean, results: Array<{ path: string, ok: boolean, error?: string }> } | { error: string }}
 */
export function writePaths(writes = []) {
    if (!Array.isArray(writes) || writes.length === 0) {
        return { error: "writes must be a non-empty array" };
    }

    const results = writes.map((entry, index) => {
        const path = entry?.path;
        if (!path || typeof path !== "string") {
            return { path: String(path ?? ""), ok: false, error: `Invalid path at index ${index}` };
        }
        if (!Object.prototype.hasOwnProperty.call(entry, "value")) {
            return { path, ok: false, error: `Missing value at index ${index}` };
        }

        try {
            const resolved = resolvePath(path);
            if (resolved.error) return { path, ok: false, error: resolved.error };

            const { target, prop } = resolved;
            if (prop === undefined) {
                return { path, ok: false, error: "Path must include at least one key below the root" };
            }

            target[prop] = entry.value;
            return { path, ok: true };
        } catch (error) {
            return { path, ok: false, error: error?.message ?? String(error) };
        }
    });

    return {
        ok: results.every((result) => result.ok),
        results,
    };
}
