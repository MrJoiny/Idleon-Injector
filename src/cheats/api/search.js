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
 * @param {string} query - The search query string
 * @returns {{ value: any, type: string, isContains: boolean, min?: number, max?: number }}
 */
function parseQuery(query) {
    const trimmed = query.trim();

    // Check for range query format: "min-max" (e.g., "100-200")
    // Must have exactly one dash with numbers on both sides
    const rangeMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
    if (rangeMatch) {
        const min = Number(rangeMatch[1]);
        const max = Number(rangeMatch[2]);
        if (!isNaN(min) && !isNaN(max)) {
            return { value: null, type: "range", isContains: false, min: Math.min(min, max), max: Math.max(min, max) };
        }
    }

    // Check for explicit null/undefined
    if (trimmed === "null") {
        return { value: null, type: "null", isContains: false };
    }
    if (trimmed === "undefined") {
        return { value: undefined, type: "undefined", isContains: false };
    }

    // Check for booleans
    if (trimmed === "true") {
        return { value: true, type: "boolean", isContains: false };
    }
    if (trimmed === "false") {
        return { value: false, type: "boolean", isContains: false };
    }

    // Check for numbers
    const num = Number(trimmed);
    if (!isNaN(num) && trimmed !== "") {
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
    if (parsedQuery.isContains && parsedQuery.type === "string") {
        // String contains matching (case-insensitive)
        if (typeof value === "string") {
            return value.toLowerCase().includes(parsedQuery.value.toLowerCase());
        }
        return false;
    }

    // Range matching for numbers
    if (parsedQuery.type === "range" && typeof value === "number") {
        return value >= parsedQuery.min && value <= parsedQuery.max;
    }

    // Number matching with int/float tolerance
    if (parsedQuery.type === "number" && typeof value === "number") {
        // Exact match
        if (value === parsedQuery.value) return true;

        // If searching for an integer, also match floats that round to it
        // e.g., searching for 131 matches 131.1 (floor) and 130.9 (ceil)
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
 * Search GGA for values matching the query within specified keys.
 * @param {string} query - The search query
 * @param {string[]} keys - Array of top-level GGA keys to search in
 * @returns {{ results: Array<{ path: string, value: any, formattedValue: string, type: string }>, totalCount: number }}
 */
export function searchGga(query, keys) {
    if (!gga || !query || !keys || keys.length === 0) {
        return { results: [], totalCount: 0 };
    }

    const parsedQuery = parseQuery(query);
    const results = [];

    for (const key of keys) {
        if (!(key in gga) || blacklist_gga.has(key)) continue;

        const rootValue = gga[key];

        // Check if root value itself matches
        if (matchesQuery(rootValue, parsedQuery)) {
            results.push({
                path: key,
                value: rootValue,
                formattedValue: formatValue(rootValue),
                type: typeof rootValue,
            });
        }

        // Traverse nested structure
        traverseAll(rootValue, (value, pathArray) => {
            // Skip objects, we only want leaf values
            if (typeof value === "object" && value !== null) return;

            if (matchesQuery(value, parsedQuery)) {
                const fullPath = buildPath([key, ...pathArray]);
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
