/**
 * Seed an edit input from a search result. Strings use the raw value (result
 * display strings are truncated for the list), falling back to unquoting the
 * formatted value.
 * @param {{type:string, value?:any, formattedValue?:string}} result
 * @returns {string}
 */
export function seedEditValue(result) {
    const formattedValue = String(result.formattedValue ?? "");

    if (result.type === "string") {
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

/**
 * The UI edit type for a result: distinguishes `null` from other objects.
 * @param {{type:string, formattedValue?:string}} result
 * @returns {string}
 */
export function expectedUiType(result) {
    if (result.type === "object" && String(result.formattedValue).toLowerCase() === "null") return "null";
    return result.type;
}

/**
 * Validate an edit draft for the given type and produce the value to send.
 * @param {string} type
 * @param {string} raw
 * @returns {{ok:true, valueToSend:any} | {ok:false, error:string}}
 */
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

/**
 * Format a value for display, matching the game-side result formatter so search
 * results and saved/live rows render the same value identically.
 * @param {any} value
 * @returns {string}
 */
export function formatDisplayValue(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
        const maxLen = 100;
        if (value.length > maxLen) {
            return `"${value.substring(0, maxLen)}..."`;
        }
        return `"${value}"`;
    }
    if (typeof value === "object") return "[object]";
    return String(value);
}

/** The monitor bridge path for a search result path (adds the "gga." prefix). */
export function monitorPathForSearchResult(path) {
    return "gga." + path;
}

/**
 * Canonical UI encoder for a monitor subscription id. Must stay in sync with the
 * server-side encoder (they cannot share a module across the Node/browser split).
 * @param {string} path - The monitor bridge path (e.g. "gga.GemsOwned")
 * @returns {string}
 */
export function monitorIdFromMonitorPath(path) {
    return "mon:" + encodeURIComponent(path);
}

/** The history array for a monitor entry, or an empty array. */
export function getMonitorHistory(monitorEntry) {
    return Array.isArray(monitorEntry?.history) ? monitorEntry.history : [];
}

/**
 * Resolve a monitor entry from the live monitor map by bridge path.
 * @param {string} path
 * @param {Object<string, {path:string, history:Array}>} monitorValues
 * @returns {{id:string, entry:object|null}}
 */
export function resolveMonitorEntry(path, monitorValues = {}) {
    const id = monitorIdFromMonitorPath(path);
    return { id, entry: monitorValues[id] || null };
}

/** UI type tag for a raw value (null/undefined/string/number/boolean), else `fallback`. */
export function getUiTypeFromRawValue(value, fallback = "string") {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return fallback;
}

/** Edit-draft string for a raw value, else `fallback`. */
export function getDraftFromRawValue(value, fallback = "") {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return fallback;
}

/** The stored value of a search/saved result, or undefined. */
export function getResultValue(result) {
    if (!result || typeof result !== "object") return undefined;
    if (result.type === "undefined") return undefined;
    return Object.prototype.hasOwnProperty.call(result, "value") ? result.value : undefined;
}
