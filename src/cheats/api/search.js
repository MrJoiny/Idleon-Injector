/**
 * Search API
 *
 * Provides GGA (Game Attributes) search functionality.
 */

import { gga } from "../core/globals.js";
import { traverseAll, buildPath } from "../utils/traverse.js";
import { blacklist_gga } from "../constants.js";

export function getGgaKeys() {
    return Object.keys(gga)
        .filter((key) => !blacklist_gga.has(key))
        .sort();
}

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

    return { value: trimmed, type: "string", isContains: true };
}

function matchesQuery(value, parsedQuery) {
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
            if ((inside.startsWith('"') && inside.endsWith('"')) || (inside.startsWith("'") && inside.endsWith("'"))) {
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

function getValueAtPath(root, path) {
    const parts = splitPath(path);
    let cur = root;

    for (const key of parts) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[key];
    }

    return cur;
}

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

export function searchGga(query, keys, optionsOrWithinPaths = null) {
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
                    value,
                    formattedValue: formatValue(value),
                    type: typeof value,
                });
            }
        });
    }

    return { results, totalCount: results.length };
}

export function detectQueryType(query) {
    const parsed = parseQuery(query);
    return parsed.type;
}
