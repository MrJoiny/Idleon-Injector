export function seedEditValue(result) {
    const formattedValue = String(result.formattedValue ?? "");

    if (result.type === "string") {
        // Search result display strings are truncated for the list UI, so edits must start from the raw value.
        if (Object.prototype.hasOwnProperty.call(result, "value")) {
            return String(result.value ?? "");
        }

        if (
            (formattedValue.startsWith('"') && formattedValue.endsWith('"')) ||
            (formattedValue.startsWith("'") && formattedValue.endsWith("'"))
        ) {
            return formattedValue.slice(1, -1);
        }
        return formattedValue;
    }

    return formattedValue;
}

export function expectedUiType(result) {
    if (result.type === "object" && String(result.formattedValue).toLowerCase() === "null") return "null";
    return result.type;
}

export function validateEditDraft(type, raw) {
    const trimmed = String(raw ?? "").trim();

    if (type === "number") {
        if (trimmed === "" || Number.isNaN(Number(trimmed))) {
            return { ok: false, error: "Not a valid number" };
        }

        return { ok: true, valueToSend: Number(trimmed) };
    }

    if (type === "boolean") {
        if (!/^(true|false)$/i.test(trimmed)) {
            return { ok: false, error: 'Use "true" or "false"' };
        }

        return { ok: true, valueToSend: /^true$/i.test(trimmed) };
    }

    if (type === "null") {
        if (trimmed.toLowerCase() !== "null") {
            return { ok: false, error: 'Use "null"' };
        }

        return { ok: true, valueToSend: null };
    }

    if (type === "undefined") {
        return { ok: false, error: "Undefined values are read-only" };
    }

    return { ok: true, valueToSend: String(raw ?? "") };
}

export function monitorPathForSearchResult(path) {
    return "gga." + path;
}

export function monitorIdFromMonitorPath(path) {
    return "mon:" + encodeURIComponent(path);
}

const MAX_MONITOR_STRING_LENGTH = 100;

function escapeMonitorString(value) {
    return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function truncateMonitorString(value) {
    if (value.length <= MAX_MONITOR_STRING_LENGTH) return value;
    return value.slice(0, MAX_MONITOR_STRING_LENGTH) + "...";
}

export function formatMonitorValue(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
        const escaped = escapeMonitorString(String(value));
        const truncated = truncateMonitorString(escaped);
        return "'" + truncated + "'";
    }
    if (typeof value === "object") return "[obj]";
    return String(value);
}

export function getMonitorHistory(monitorEntry) {
    return Array.isArray(monitorEntry?.history) ? monitorEntry.history : [];
}

export function getMonitorCurrentValue(monitorEntry) {
    return getMonitorHistory(monitorEntry)[0]?.value;
}

export function resolveMonitorEntry(path, monitorValues = {}) {
    const expectedId = monitorIdFromMonitorPath(path);

    if (monitorValues[expectedId]) {
        return { id: expectedId, entry: monitorValues[expectedId] };
    }

    for (const [id, entry] of Object.entries(monitorValues)) {
        if (entry?.path === path) {
            return { id, entry };
        }
    }

    return { id: expectedId, entry: null };
}

export function getUiTypeFromRawValue(value, fallback = "string") {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return fallback;
}

export function getDraftFromRawValue(value, fallback = "") {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return fallback;
}

export function getResultValue(result) {
    if (!result || typeof result !== "object") return undefined;
    if (result.type === "undefined") return undefined;
    return Object.prototype.hasOwnProperty.call(result, "value") ? result.value : undefined;
}
