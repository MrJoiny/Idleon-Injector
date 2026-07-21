/**
 * Search API
 *
 * Provides GGA (Game Attributes) search functionality.
 */

import { gga } from "../core/globals.js";
import { traverseAll, buildPath } from "../utils/traverse.js";
import { blacklist_gga } from "../constants.js";
import { parsePath } from "../utils/pathResolver.js";

// Hard cap keeps a single CDP returnByValue payload bounded and stops the walk
// (and its getter invocations) once reached.
const MAX_SEARCH_RESULTS = 20000;

/**
 * Get all available GGA keys (excluding blacklisted ones).
 * @returns {string[]} Sorted array of available top-level key names
 */
export function getGgaKeys() {
    return Object.keys(gga)
        .filter((key) => !blacklist_gga.has(key))
        .sort();
}

/**
 * Parse a search query string into a typed value.
 * @param {string} query - The search query string
 * @returns {{ value: any, type: string, isContains: boolean, min?: number, max?: number }}
 */
function parseQuery(query) {
    const trimmed = String(query ?? "").trim();

    if (trimmed === "") {
        return { value: null, type: "any", isContains: false };
    }

    const rangeMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
        const min = Number(rangeMatch[1]);
        const max = Number(rangeMatch[2]);
        if (!Number.isNaN(min) && !Number.isNaN(max)) {
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
    if (!Number.isNaN(num) && trimmed !== "") {
        return { value: num, type: "number", isContains: false };
    }

    // Default to string with contains matching
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
    if (parsedQuery.type === "any") return true;

    if (parsedQuery.isContains && parsedQuery.type === "string") {
        if (typeof value === "string") {
            return value.toLowerCase().includes(parsedQuery.value.toLowerCase());
        }
        return false;
    }

    if (parsedQuery.type === "range" && typeof value === "number") {
        return value >= parsedQuery.min && value <= parsedQuery.max;
    }

    if (parsedQuery.type === "number" && typeof value === "number") {
        // Exact match
        if (value === parsedQuery.value) return true;

        if (Number.isInteger(parsedQuery.value)) {
            const floor = Math.floor(value);
            const ceil = Math.ceil(value);
            return floor === parsedQuery.value || ceil === parsedQuery.value;
        }
        return false;
    }

    // Exact match for booleans, null, undefined
    return value === parsedQuery.value;
}

/**
 * Builds the leaf-value predicate for a scan. A numeric `compare` option
 * (bigger/smaller than) is applied game-side so the result cap keeps matching
 * values instead of arbitrary leaves; otherwise the parsed query is used.
 * @param {object} parsedQuery
 * @param {{ op: "gt"|"lt", value: number }|null} compare
 * @returns {(value: any) => boolean}
 */
function makeLeafPredicate(parsedQuery, compare) {
    if (compare && typeof compare.value === "number") {
        const { op, value: bound } = compare;
        return (value) => typeof value === "number" && (op === "gt" ? value > bound : value < bound);
    }
    return (value) => matchesQuery(value, parsedQuery);
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
    if (typeof value === "object") return "[object]";
    return String(value);
}

function getValueAtPath(root, path) {
    const parts = parsePath(path);
    let cur = root;

    for (const key of parts) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[key];
    }

    return cur;
}

function searchGgaWithinPaths(query, withinPaths, compare) {
    if (!Array.isArray(withinPaths) || withinPaths.length === 0) {
        return { results: [], totalCount: 0 };
    }

    const predicate = makeLeafPredicate(parseQuery(query), compare);
    const results = [];
    const seenPaths = new Set();
    let truncated = false;

    for (const fullPath of withinPaths) {
        if (typeof fullPath !== "string" || !fullPath) continue;

        const topKey = parsePath(fullPath)[0];
        if (!topKey) continue;
        if (!(topKey in gga) || blacklist_gga.has(topKey)) continue;

        const value = getValueAtPath(gga, fullPath);
        if (typeof value === "object" && value !== null) continue;

        if (predicate(value)) {
            if (seenPaths.has(fullPath)) continue;
            seenPaths.add(fullPath);

            if (results.length >= MAX_SEARCH_RESULTS) {
                truncated = true;
                break;
            }

            results.push({
                path: fullPath,
                value,
                formattedValue: formatValue(value),
                type: typeof value,
            });
        }
    }

    return { results, totalCount: results.length, truncated };
}

/**
 * Search GGA leaf values for matches, either across whole keys or within an
 * explicit set of paths. Results are capped at MAX_SEARCH_RESULTS; a numeric
 * `compare` predicate (for bigger/smaller-than scans) is applied game-side so
 * the cap keeps matching values rather than arbitrary leaves.
 * @param {string} query - Query string ("" matches any; supports "min-max" ranges)
 * @param {string[]} keys - Top-level GGA keys to scan
 * @param {{ withinPaths?: string[], compare?: { op: "gt"|"lt", value: number } }|null} [options]
 * @returns {{ results: Array<{path:string,value:any,formattedValue:string,type:string}>, totalCount: number, truncated?: boolean }}
 */
export function searchGga(query, keys, options = null) {
    if (query === undefined || query === null) {
        return { results: [], totalCount: 0 };
    }

    const withinPaths = options && Array.isArray(options.withinPaths) ? options.withinPaths : null;
    const compare = options && options.compare ? options.compare : null;

    if (withinPaths && withinPaths.length > 0) {
        return searchGgaWithinPaths(query, withinPaths, compare);
    }

    if (!keys || keys.length === 0) {
        return { results: [], totalCount: 0 };
    }

    const predicate = makeLeafPredicate(parseQuery(query), compare);
    const results = [];
    const seenPaths = new Set();
    let truncated = false;

    for (const key of keys) {
        if (results.length >= MAX_SEARCH_RESULTS) {
            truncated = true;
            break;
        }
        if (!(key in gga) || blacklist_gga.has(key)) continue;

        const rootValue = gga[key];

        if ((typeof rootValue !== "object" || rootValue === null) && predicate(rootValue)) {
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
            if (!predicate(value)) return;

            const fullPath = buildPath([key, ...pathArray]);
            if (seenPaths.has(fullPath)) return;
            seenPaths.add(fullPath);

            if (results.length >= MAX_SEARCH_RESULTS) {
                truncated = true;
                return true; // stop the walk; no more getters invoked
            }

            results.push({
                path: fullPath,
                value,
                formattedValue: formatValue(value),
                type: typeof value,
            });
        });
    }

    return { results, totalCount: results.length, truncated };
}

/**
 * Classify a query string into a value type (any/range/number/string/etc.).
 * @param {string} query
 * @returns {string} The detected type tag
 */
export function detectQueryType(query) {
    const parsed = parseQuery(query);
    return parsed.type;
}
