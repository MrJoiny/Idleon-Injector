/**
 * Search API
 *
 * Provides GGA (Game Attributes) search functionality.
 * Allows searching for values within specified top-level keys.
 */

import { gga } from "../core/globals.js";
import { traverseAll, buildPath } from "../utils/traverse.js";
import { blacklist_gga } from "../constants.js";

/**
 * Get all available GGA keys (excluding blacklisted ones).
 * @returns {string[]} Array of available key names
 */
export function getGgaKeys() {
    return Object.keys(gga)
        .filter((key) => !blacklist_gga.has(key))
        .sort();
}

/**
 * Parse a search query string into a typed value.
 * Empty string => match ALL leaf values.
 * @param {string} query - The search query string
 * @returns {{ value: any, type: string, isContains: boolean, min?: number, max?: number }}
 */
function parseQuery(query) {
    const trimmed = String(query ?? "").trim();

    // empty => match-all
    if (trimmed === "") {
        return { value: null, type: "any", isContains: false };
    }

    // Range query: "min-max"
    const rangeMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
        const min = Number(rangeMatch[1]);
        const max = Number(rangeMatch[2]);
        if (!isNaN(min) && !isNaN(max)) {
            return {
                value: null,
                type: "range",
                isContains: false,
                min: Math.min(min, max),
                max: Math.max(min, max),
            };
        }
    }

    if (trimmed === "null") return { value: null, type: "null", isContains: false };
    if (trimmed === "undefined") return { value: undefined, type: "undefined", isContains: false };
    if (trimmed === "true") return { value: true, type: "boolean", isContains: false };
    if (trimmed === "false") return { value: false, type: "boolean", isContains: false };

    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== "") {
        return { value: num, type: "number", isContains: false };
    }

    // Default: string contains
    return { value: trimmed, type: "string", isContains: true };
}

/**
 * Check if a value matches the parsed query.
 * For integers, also matches floats that round to that integer (floor or ceil).
 * For ranges, matches numbers within the min-max range (inclusive).
 * @param {any} value - The value to check
 * @param {{ value: any, type: string, isContains: boolean, min?: number, max?: number }} parsedQuery - The parsed query
 * @returns {boolean}
 */
function matchesQuery(value, parsedQuery) {
    // match-all
    if (parsedQuery.type === "any") return true;

    if (parsedQuery.isContains && parsedQuery.type === "string") {
        if (typeof value === "string") {
            return value.toLowerCase().includes(String(parsedQuery.value).toLowerCase());
        }
        return false;
    }

    if (parsedQuery.type === "range" && typeof value === "number") {
        return value >= parsedQuery.min && value <= parsedQuery.max;
    }

    if (parsedQuery.type === "number" && typeof value === "number") {
        if (value === parsedQuery.value) return true;

        if (Number.isInteger(parsedQuery.value)) {
            const floor = Math.floor(value);
            const ceil = Math.ceil(value);
            return floor === parsedQuery.value || ceil === parsedQuery.value;
        }
        return false;
    }

    return value === parsedQuery.value;
}

/**
 * Format a value for display, truncating if too long.
 * @param {any} value - The value to format
 * @returns {string}
 */
function formatValue(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") {
        const maxLen = 100;
        if (value.length > maxLen) {
            return `"${value.substring(0, maxLen)}..."`;
        }
        return `"${value}"`;
    }
    if (typeof value === "object") {
        return "[object]";
    }
    return String(value);
}

/**
 * Resolve a value inside `gga` from a result path like:
 *   "player.health", "inventory.items[0].count", "foo['bar']"
 * Supports dot-notation and [index]/["key"] bracket notation.
 * @param {string} path
 * @returns {string[]} path segments
 */
function splitPath(path) {
    if (typeof path !== "string" || !path) return [];

    const parts = [];
    let buf = "";
    let i = 0;

    const flush = () => {
        const t = buf.trim();
        if (t) parts.push(t);
        buf = "";
    };

    while (i < path.length) {
        const ch = path[i];

        if (ch === ".") {
            flush();
            i += 1;
            continue;
        }

        if (ch === "[") {
            flush();
            const end = path.indexOf("]", i);
            if (end === -1) {
                buf += ch;
                i += 1;
                continue;
            }

            let inside = path.slice(i + 1, end).trim();
            if (
                (inside.startsWith('"') && inside.endsWith('"')) ||
                (inside.startsWith("'") && inside.endsWith("'"))
            ) {
                inside = inside.slice(1, -1);
            }
            if (inside) parts.push(inside);
            i = end + 1;
            continue;
        }

        buf += ch;
        i += 1;
    }

    flush();
    return parts;
}

/**
 * Get a value from an object using a split path.
 * @param {any} root
 * @param {string} path
 * @returns {any}
 */
function getValueAtPath(root, path) {
    const parts = splitPath(path);
    let cur = root;

    for (const key of parts) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[key];
    }

    return cur;
}

/**
 * Resolve parent object and property key for a path.
 * @param {any} root
 * @param {string} path
 * @returns {{ parent: any, key: string } | null}
 */
function getParentAndKey(root, path) {
    const parts = splitPath(path);
    if (parts.length === 0) return null;

    const key = parts[parts.length - 1];
    let parent = root;

    for (let i = 0; i < parts.length - 1; i++) {
        if (parent === null || parent === undefined) return null;
        parent = parent[parts[i]];
    }

    if (parent === null || parent === undefined) return null;
    return { parent, key };
}

/**
 * Search within an existing list of result paths (NEXT search).
 * This re-reads the current value from `gga` at each path, so it works after in-game changes.
 * @param {string} query - The search query
 * @param {string[]} withinPaths - Paths to check (from previous results)
 * @returns {{ results: Array<{ path: string, value: any, formattedValue: string, type: string }>, totalCount: number }}
 */
function searchGgaWithinPaths(query, withinPaths) {
    if (!gga || !Array.isArray(withinPaths) || withinPaths.length === 0) {
        return { results: [], totalCount: 0 };
    }

    const parsedQuery = parseQuery(query);
    const results = [];
    const seenPaths = new Set();

    for (const fullPath of withinPaths) {
        if (typeof fullPath !== "string" || !fullPath) continue;

        const topKey = splitPath(fullPath)[0];
        if (!topKey) continue;
        if (!(topKey in gga) || blacklist_gga.has(topKey)) continue;

        const value = getValueAtPath(gga, fullPath);

        // Only leaf primitives (null allowed)
        if (typeof value === "object" && value !== null) continue;

        if (matchesQuery(value, parsedQuery)) {
            if (seenPaths.has(fullPath)) continue;
            seenPaths.add(fullPath);

            results.push({
                path: fullPath,
                value,
                formattedValue: formatValue(value),
                type: typeof value,
            });
        }
    }

    return { results, totalCount: results.length };
}

/**
 * Search GGA for values matching the query within specified keys (NEW search),
 * OR refine an existing result list when `withinPaths` is provided (NEXT search).
 *
 * @param {string} query - The search query ("" means match-all)
 * @param {string[]} keys - Array of top-level GGA keys to search in
 * @param {string[] | { withinPaths?: string[] } | null} [optionsOrWithinPaths] - Optional refinement scope
 * @returns {{ results: Array<{ path: string, value: any, formattedValue: string, type: string }>, totalCount: number }}
 */
export function searchGga(query, keys, optionsOrWithinPaths = null) {
    // allow empty-string; only reject null/undefined
    if (!gga || query === undefined || query === null) {
        return { results: [], totalCount: 0 };
    }

    const withinPaths = Array.isArray(optionsOrWithinPaths)
        ? optionsOrWithinPaths
        : optionsOrWithinPaths && Array.isArray(optionsOrWithinPaths.withinPaths)
          ? optionsOrWithinPaths.withinPaths
          : null;

    if (withinPaths && withinPaths.length > 0) {
        return searchGgaWithinPaths(query, withinPaths);
    }

    if (!keys || keys.length === 0) {
        return { results: [], totalCount: 0 };
    }

    const parsedQuery = parseQuery(query);
    const results = [];
    const seenPaths = new Set();

    for (const key of keys) {
        if (!(key in gga) || blacklist_gga.has(key)) continue;

        const rootValue = gga[key];

        // Don't include objects/arrays as results (keeps match-all sane)
        if ((typeof rootValue !== "object" || rootValue === null) && matchesQuery(rootValue, parsedQuery)) {
            results.push({
                path: key,
                value: rootValue,
                formattedValue: formatValue(rootValue),
                type: typeof rootValue,
            });
            seenPaths.add(key);
        }

        traverseAll(rootValue, (value, pathArray) => {
            if (typeof value === "object" && value !== null) return;

            if (matchesQuery(value, parsedQuery)) {
                const fullPath = buildPath([key, ...pathArray]);
                if (seenPaths.has(fullPath)) return;
                seenPaths.add(fullPath);

                results.push({
                    path: fullPath,
                    value: value,
                    formattedValue: formatValue(value),
                    type: typeof value,
                });
            }
        });
    }

    return {
        results: results,
        totalCount: results.length,
    };
}

/**
 * Detect the type of a query string for UI display.
 * @param {string} query - The search query
 * @returns {string} The detected type name
 */
export function detectQueryType(query) {
    const parsed = parseQuery(query);
    return parsed.type;
}

/**
 * Type-safe set of a searched GGA path.
 * Input value is always a string and converted to the current runtime type.
 * @param {string} path
 * @param {string} rawValue
 * @returns {{ success: boolean, path: string, type?: string, value?: any, formattedValue?: string, error?: string }}
 */
export function setGgaValue(path, rawValue) {
    if (typeof path !== "string" || path.trim() === "") {
        return { success: false, path: String(path || ""), error: "Path is required" };
    }

    if (typeof rawValue !== "string") {
        return { success: false, path, error: "Value must be a string" };
    }

    const currentValue = getValueAtPath(gga, path);

    if (typeof currentValue === "object" && currentValue !== null) {
        return { success: false, path, error: "This value is an object/array and cannot be edited here" };
    }

    const expectedType = currentValue === null ? "null" : typeof currentValue;
    const trimmed = rawValue.trim();
    let parsed;

    if (expectedType === "number") {
        const nextNumber = Number(trimmed);
        if (trimmed === "" || Number.isNaN(nextNumber)) {
            return { success: false, path, error: "Value must be a valid number" };
        }
        parsed = nextNumber;
    } else if (expectedType === "boolean") {
        const lower = trimmed.toLowerCase();
        if (lower === "true") parsed = true;
        else if (lower === "false") parsed = false;
        else return { success: false, path, error: 'Value must be "true" or "false"' };
    } else if (expectedType === "null") {
        if (trimmed.toLowerCase() !== "null") return { success: false, path, error: 'Value must be "null"' };
        parsed = null;
    } else if (expectedType === "undefined") {
        if (trimmed.toLowerCase() !== "undefined") {
            return { success: false, path, error: 'Value must be "undefined"' };
        }
        parsed = undefined;
    } else if (expectedType === "string") {
        let nextString = rawValue;
        if (nextString.length >= 2) {
            const start = nextString[0];
            const end = nextString[nextString.length - 1];
            if ((start === '"' && end === '"') || (start === "'" && end === "'")) {
                nextString = nextString.slice(1, -1);
            }
        }
        parsed = String(nextString);
    } else {
        return { success: false, path, error: "Unsupported type" };
    }

    const target = getParentAndKey(gga, path);
    if (!target) return { success: false, path, error: "Path not found" };

    try {
        target.parent[target.key] = parsed;
    } catch {
        return { success: false, path, error: "Failed to set value at path" };
    }

    return {
        success: true,
        path,
        type: parsed === null ? "object" : typeof parsed,
        value: parsed,
        formattedValue: formatValue(parsed),
    };
}
