import { getResultValue } from "./valueUtils.js";

/**
 * One descriptor per scan type. Insertion order drives the NEW/NEXT dropdowns.
 * Flags:
 *  - modes: which scan phases offer this type ("new" and/or "next")
 *  - inputless: no value input needed
 *  - secondary: needs a second value input (VALUE BETWEEN)
 *  - numeric: primary input must be a number
 *  - comparison: compares against the previous result snapshot (NEXT only)
 *  - placeholder: primary input placeholder (defaults to "VALUE")
 */
const SCAN_TYPES = {
    // Labeled "Find Value" rather than "Exact Value" because matching is
    // intentionally fuzzy (integer queries also catch nearby floats; string
    // queries match substrings). bigger/smaller/between cover strict ranges.
    exact_value: { label: "Find Value", modes: ["new", "next"] },
    unknown_initial_value: { label: "Unknown Initial Value", modes: ["new"], inputless: true },
    bigger_than: { label: "Bigger Than", modes: ["new", "next"], numeric: true, placeholder: "BIGGER THAN" },
    smaller_than: { label: "Smaller Than", modes: ["new", "next"], numeric: true, placeholder: "SMALLER THAN" },
    value_between: { label: "Value Between", modes: ["new", "next"], secondary: true, placeholder: "MIN VALUE" },
    increased_value: { label: "Increased Value", modes: ["next"], inputless: true, comparison: true },
    increased_value_by: {
        label: "Increased Value By",
        modes: ["next"],
        numeric: true,
        comparison: true,
        placeholder: "INCREASED BY",
    },
    decreased_value: { label: "Decreased Value", modes: ["next"], inputless: true, comparison: true },
    decreased_value_by: {
        label: "Decreased Value By",
        modes: ["next"],
        numeric: true,
        comparison: true,
        placeholder: "DECREASED BY",
    },
    changed_value: { label: "Changed Value", modes: ["next"], inputless: true, comparison: true },
    unchanged_value: { label: "Unchanged Value", modes: ["next"], inputless: true, comparison: true },
};

const scanTypesForMode = (mode) => Object.keys(SCAN_TYPES).filter((type) => SCAN_TYPES[type].modes.includes(mode));

export const NEW_SCAN_TYPES = scanTypesForMode("new");
export const NEXT_SCAN_TYPES = scanTypesForMode("next");

export function getScanTypeLabel(scanType) {
    return SCAN_TYPES[scanType]?.label || scanType;
}

export function getScanTypePlaceholder(scanType) {
    return SCAN_TYPES[scanType]?.placeholder || "VALUE";
}

export function requiresNumericInput(scanType) {
    return !!SCAN_TYPES[scanType]?.numeric;
}

export function isInputlessScanType(scanType) {
    return !!SCAN_TYPES[scanType]?.inputless;
}

export function requiresSecondaryInput(scanType) {
    return !!SCAN_TYPES[scanType]?.secondary;
}

export function needsPreviousSnapshot(scanType) {
    return !!SCAN_TYPES[scanType]?.comparison;
}

function parseSnapshotValue(snapshotEntry) {
    if (!snapshotEntry || typeof snapshotEntry !== "object") {
        return { exists: false, type: "undefined", value: undefined };
    }

    if (snapshotEntry.type === "undefined") {
        return { exists: true, type: "undefined", value: undefined };
    }

    return {
        exists: true,
        type: snapshotEntry.type,
        value: snapshotEntry.value,
    };
}

export function buildSnapshotFromResults(results) {
    const snapshot = {};

    for (const entry of results || []) {
        if (!entry || !entry.path) continue;

        const next = {
            type: entry.type,
            value: entry.value,
        };

        if (entry.type === "undefined") {
            delete next.value;
        }

        snapshot[entry.path] = next;
    }

    return snapshot;
}

/**
 * Filter results for the comparison scan types, which compare each current
 * value against the previous result snapshot. Absolute predicates
 * (exact/bigger/smaller/between) are matched game-side in searchGga instead.
 * @param {Array} results
 * @param {{scanType:string, query?:string, previousSnapshot?:object}} options
 * @returns {Array}
 */
export function filterResultsByScanType(results, options) {
    const scanType = options.scanType;
    const previousSnapshot =
        options.previousSnapshot && typeof options.previousSnapshot === "object" ? options.previousSnapshot : {};
    const qNum = Number(String(options.query ?? "").trim());

    return (results || []).filter((entry) => {
        const currentType = entry.type;
        const currentValue = getResultValue(entry);

        const previous = parseSnapshotValue(previousSnapshot[entry.path]);
        if (!previous.exists) return false;

        const prevValue = previous.value;
        const prevType = previous.type;

        if (scanType === "changed_value") {
            return prevType !== currentType || !Object.is(prevValue, currentValue);
        }

        if (scanType === "unchanged_value") {
            return prevType === currentType && Object.is(prevValue, currentValue);
        }

        if (typeof currentValue !== "number" || prevType !== "number" || typeof prevValue !== "number") {
            return false;
        }

        if (scanType === "increased_value") return currentValue > prevValue;
        if (scanType === "increased_value_by") return !Number.isNaN(qNum) && currentValue - prevValue === qNum;
        if (scanType === "decreased_value") return currentValue < prevValue;
        if (scanType === "decreased_value_by") return !Number.isNaN(qNum) && prevValue - currentValue === qNum;

        return false;
    });
}
