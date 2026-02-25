export function seedEditValue(result) {
    const formattedValue = String(result.formattedValue ?? "");

    if (result.type === "string") {
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

    if (type === "number" && (trimmed === "" || Number.isNaN(Number(trimmed)))) {
        return { ok: false, error: "Not a valid number" };
    }

    if (type === "boolean" && !/^(true|false)$/i.test(trimmed)) {
        return { ok: false, error: 'Use "true" or "false"' };
    }

    if (type === "null" && trimmed.toLowerCase() !== "null") {
        return { ok: false, error: 'Use "null"' };
    }

    if (type === "undefined" && trimmed.toLowerCase() !== "undefined") {
        return { ok: false, error: 'Use "undefined"' };
    }

    return {
        ok: true,
        valueToSend: type === "string" ? raw : trimmed,
    };
}

export function monitorPathForSearchResult(path) {
    return "gga." + path;
}

export function monitorIdFromMonitorPath(path) {
    return path.replace(/[[\]]/g, "-").replace(/\./g, "-");
}

export function formatMonitorValue(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return "'" + value + "'";
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
