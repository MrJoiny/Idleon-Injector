/**
 * Path Resolver Utility
 *
 * Parses dot/bracket-notation path strings and resolves them to live game objects.
 * Shared by ValueMonitor, stateAccessors, and any future path-based API.
 */

import { gga } from "../core/globals.js";

/**
 * Parses a path string into segments, handling both dot notation and bracket notation.
 * e.g., "gga.ItemQuantity[13]" -> ["gga", "ItemQuantity", "13"]
 * e.g., "gga.PlayerDATABASE.h._1_.h.ItemQuantity[13]" -> ["gga", "PlayerDATABASE", "h", "_1_", "h", "ItemQuantity", "13"]
 * @param {string} path
 * @returns {string[]}
 */
export function parsePath(path) {
    const segments = [];
    let current = "";

    for (let i = 0; i < path.length; i++) {
        const char = path[i];

        if (char === ".") {
            if (current) {
                segments.push(current);
                current = "";
            }
        } else if (char === "[") {
            if (current) {
                segments.push(current);
                current = "";
            }
        } else if (char === "]") {
            if (current) {
                segments.push(current);
                current = "";
            }
        } else {
            current += char;
        }
    }

    if (current) {
        segments.push(current);
    }

    return segments;
}

/**
 * Resolves a dotted path (supporting .h and bracket notation) into a target object and property.
 * @param {string} path - Path like "gga.GemsOwned" or "gga.ItemQuantity[13]"
 * @returns {{ target: object, prop: string } | { error: string }}
 */
export function resolvePath(path) {
    if (!path) return { error: "Empty path" };

    const segments = parsePath(path);
    let current = window;

    // Handle "gga" shortcut if it's the first segment
    if (segments[0] === "gga") {
        current = gga;
        segments.shift();
    } else if (segments[0] === "bEngine" && segments[1] === "gameAttributes") {
        // Handle full paths like "bEngine.gameAttributes.X" and "bEngine.gameAttributes.h.X"
        current = gga;
        segments.shift(); // remove "bEngine"
        segments.shift(); // remove "gameAttributes"
        if (segments[0] === "h") {
            segments.shift(); // remove optional explicit ".h"
        }
    }

    for (let i = 0; i < segments.length - 1; i++) {
        const seg = segments[i];
        const nextSeg = segments[i + 1];

        // Only auto-unwrap .h if the next segment is NOT explicitly "h"
        // This prevents double-unwrapping when path already contains ".h."
        if (seg !== "h" && nextSeg !== "h" && current[seg] && current[seg].h) {
            current = current[seg].h;
        } else {
            current = current[seg];
        }

        if (current === null || current === undefined || typeof current !== "object") {
            return { error: `Cannot resolve path segment: ${seg}` };
        }
    }

    const prop = segments[segments.length - 1];
    if (current === null || current === undefined) {
        return { error: "Target object is null or undefined" };
    }

    return { target: current, prop };
}
