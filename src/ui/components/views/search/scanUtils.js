import { getResultValue } from "./valueUtils.js";

const INPUTLESS_SCAN_TYPES = new Set([
    "unknown_initial_value",
    "increased_value",
    "decreased_value",
    "changed_value",
    "unchanged_value",
]);

const SECONDARY_INPUT_SCAN_TYPES = new Set(["value_between"]);

const NUMERIC_INPUT_SCAN_TYPES = new Set(["bigger_than", "smaller_than", "increased_value_by", "decreased_value_by"]);

const NEXT_COMPARISON_SCAN_TYPES = new Set([
    "increased_value",
    "increased_value_by",
    "decreased_value",
    "decreased_value_by",
    "changed_value",
    "unchanged_value",
]);

export const NEW_SCAN_TYPES = ["exact_value", "unknown_initial_value", "bigger_than", "smaller_than", "value_between"];

export const NEXT_SCAN_TYPES = [
    "exact_value",
    "bigger_than",
    "smaller_than",
    "value_between",
    "increased_value",
    "increased_value_by",
    "decreased_value",
    "decreased_value_by",
    "changed_value",
    "unchanged_value",
];

const SCAN_TYPE_LABELS = {
    exact_value: "Exact Value",
    unknown_initial_value: "Unknown Initial Value",
    bigger_than: "Bigger Than",
    smaller_than: "Smaller Than",
    value_between: "Value Between",
    increased_value: "Increased Value",
    increased_value_by: "Increased Value By",
    decreased_value: "Decreased Value",
    decreased_value_by: "Decreased Value By",
    changed_value: "Changed Value",
    unchanged_value: "Unchanged Value",
};

const SCAN_TYPE_PLACEHOLDERS = {
    bigger_than: "BIGGER THAN",
    smaller_than: "SMALLER THAN",
    value_between: "MIN VALUE",
    increased_value_by: "INCREASED BY",
    decreased_value_by: "DECREASED BY",
};

export function getScanTypeLabel(scanType) {
    return SCAN_TYPE_LABELS[scanType] || scanType;
}

export function getScanTypePlaceholder(scanType) {
    return SCAN_TYPE_PLACEHOLDERS[scanType] || "VALUE";
}

export function requiresNumericInput(scanType) {
    return NUMERIC_INPUT_SCAN_TYPES.has(scanType);
}

export function isInputlessScanType(scanType) {
    return INPUTLESS_SCAN_TYPES.has(scanType);
}

export function requiresSecondaryInput(scanType) {
    return SECONDARY_INPUT_SCAN_TYPES.has(scanType);
}

export function needsPreviousSnapshot(scanType) {
    return NEXT_COMPARISON_SCAN_TYPES.has(scanType);
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

// exact_value scans are matched game-side by searchGga; this filter only
// handles the fetch-all-then-compare scan types.
export function filterResultsByScanType(results, options) {
    const scanType = options.scanType;
    const query = String(options.query ?? "");
    const query2 = String(options.query2 ?? "");
    const previousSnapshot =
        options.previousSnapshot && typeof options.previousSnapshot === "object" ? options.previousSnapshot : {};

    const qNum = Number(query.trim());
    const q2Num = Number(query2.trim());
    const min = Math.min(qNum, q2Num);
    const max = Math.max(qNum, q2Num);

    return (results || []).filter((entry) => {
        const path = entry.path;
        const currentType = entry.type;
        const currentValue = getResultValue(entry);

        if (scanType === "unknown_initial_value") {
            return true;
        }

        if (scanType === "bigger_than") {
            return typeof currentValue === "number" && !Number.isNaN(qNum) && currentValue > qNum;
        }

        if (scanType === "smaller_than") {
            return typeof currentValue === "number" && !Number.isNaN(qNum) && currentValue < qNum;
        }

        if (scanType === "value_between") {
            return (
                typeof currentValue === "number" &&
                !Number.isNaN(min) &&
                !Number.isNaN(max) &&
                currentValue >= min &&
                currentValue <= max
            );
        }

        const previous = parseSnapshotValue(previousSnapshot[path]);
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
