/**
 * Path Resolver Utility
 *
 * Owns game path resolution, value operations, and watchable-property checks.
 * Raw Search paths retain their explicit Haxe wrapper segments.
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

/** Require a value key for Account operations; a missing leaf value is still valid. */
function resolveValuePath(path) {
    const resolved = resolvePath(path);
    if (resolved.error) return resolved;
    if (resolved.prop === undefined) return { error: "Path must include at least one key below the root" };
    return resolved;
}

/** Resolve an existing, configurable property without changing its descriptor. */
export function resolveWatchablePath(path) {
    const resolved = resolvePath(path);
    if (resolved.error) return resolved;
    const { target, prop } = resolved;
    // Keep missing leaves on Monitor's transient-retry path without creating a property.
    if (!(prop in target)) return { error: `Cannot resolve path segment: ${prop}` };

    const original = Object.getOwnPropertyDescriptor(target, prop);
    if (original && original.configurable === false) return { error: "Property is not configurable" };
    return { target, prop, original };
}

/**
 * Read a game value by dot/bracket path string.
 * @param {string} path - Path like "gga.StampLevel" or "gga.StampLevel[0][3]"
 * @returns {{ value: any } | { error: string }}
 */
export function readPath(path) {
    const resolved = resolveValuePath(path);
    if (resolved.error) return resolved;
    const { target, prop } = resolved;
    const raw = target[prop];
    // CDP returnByValue cannot serialize Haxe arrays/objects directly — they come
    // back as {}. JSON round-trip coerces them into plain serializable values.
    try {
        const value = JSON.parse(JSON.stringify(raw));
        return { value };
    } catch {
        return { value: raw };
    }
}

/** Read multiple paths independently, preserving input order and per-path failures. */
export function readPaths(paths) {
    if (!Array.isArray(paths) || paths.length === 0) return { error: "paths must be a non-empty array" };
    if (!paths.every((path) => typeof path === "string" && path.length > 0)) {
        return { error: "paths must contain non-empty strings" };
    }

    const results = paths.map((path) => {
        try {
            const result = readPath(path);
            if (result.error) return { path, ok: false, error: result.error };
            // Keep a non-serializable value from failing the entire CDP response.
            JSON.stringify(result.value);
            return { path, ok: true, value: result.value };
        } catch (error) {
            return { path, ok: false, error: error?.message ?? String(error) };
        }
    });
    return { results };
}

/**
 * Read selected entries from a root object path.
 * Optional field picking reads from entry.h first (Haxe objects), then falls back
 * to direct entry fields.
 *
 * @param {string} rootPath - Path to an object map like "gga.ItemDefinitionsGET.h"
 * @param {string[]} keys - Entry keys to read
 * @param {string[]=} fields - Optional field names to pick from each entry
 * @returns {{ value: object } | { error: string }}
 */
export function readEntries(rootPath, keys, fields = null) {
    if (!rootPath || typeof rootPath !== "string") return { error: "Missing or invalid rootPath" };
    if (!Array.isArray(keys) || keys.length === 0) return { error: "keys must be a non-empty array" };
    if (!keys.every((key) => typeof key === "string" && key.length > 0)) {
        return { error: "keys must contain non-empty strings" };
    }
    if (fields !== null && fields !== undefined) {
        if (!Array.isArray(fields)) return { error: "fields must be an array of strings" };
        if (!fields.every((field) => typeof field === "string" && field.length > 0)) {
            return { error: "fields must contain non-empty strings" };
        }
    }

    const resolved = resolveValuePath(rootPath);
    if (resolved.error) return resolved;

    const { target, prop } = resolved;

    const root = target[prop];
    if (!root || typeof root !== "object") {
        return { error: "Resolved root is not an object" };
    }

    const value = {};
    const shouldPickFields = Array.isArray(fields) && fields.length > 0;

    for (const key of keys) {
        const entry = root[key];
        if (entry === undefined) continue;

        if (!shouldPickFields) {
            value[key] = entry;
            continue;
        }

        const source = entry && typeof entry === "object" && entry.h && typeof entry.h === "object" ? entry.h : entry;
        const picked = {};

        for (const field of fields) {
            picked[field] = source?.[field];
        }

        value[key] = picked;
    }

    return { value };
}

/**
 * Delete a game value by dot/bracket path string.
 * @param {string} path - Path like "gga.DNSM.h.GrimoireTotLV"
 * @returns {{ ok: true } | { error: string }}
 */
export function deletePath(path) {
    const resolved = resolveValuePath(path);
    if (resolved.error) return resolved;
    const { target, prop } = resolved;
    if (!delete target[prop]) return { error: `Unable to delete ${path}` };
    return { ok: true };
}

/**
 * Write a game value by dot/bracket path string.
 * @param {string} path - Path like "gga.StampLevel[0][3]"
 * @param {any} value - JSON-serializable value to write
 * @returns {{ ok: true } | { error: string }}
 */
export function writePath(path, value) {
    if (value === undefined) return { error: "Missing value" };
    const resolved = resolveValuePath(path);
    if (resolved.error) return resolved;
    const { target, prop } = resolved;
    target[prop] = value;
    return { ok: true };
}

/**
 * Write many game values by dot/bracket path strings.
 *
 * Non-atomic: each entry is attempted independently; earlier successful writes
 * are not rolled back if a later entry fails. UI callers should read back each
 * path and verify before treating the batch as committed.
 *
 * @param {Array<{ path: string, value: any }>} writes
 * @returns {{ ok: boolean, results: Array<{ path: string, ok: boolean, error?: string }> } | { error: string }}
 */
export function writePaths(writes = []) {
    if (!Array.isArray(writes) || writes.length === 0) {
        return { error: "writes must be a non-empty array" };
    }

    const results = writes.map((entry, index) => {
        const path = entry?.path;
        if (!path || typeof path !== "string") {
            return { path: String(path ?? ""), ok: false, error: `Invalid path at index ${index}` };
        }
        if (!Object.prototype.hasOwnProperty.call(entry, "value")) {
            return { path, ok: false, error: `Missing value at index ${index}` };
        }

        try {
            const resolved = resolveValuePath(path);
            if (resolved.error) return { path, ok: false, error: resolved.error };

            const { target, prop } = resolved;
            target[prop] = entry.value;
            return { path, ok: true };
        } catch (error) {
            return { path, ok: false, error: error?.message ?? String(error) };
        }
    });

    return {
        ok: results.every((result) => result.ok),
        results,
    };
}

/** Read an exact path relative to a root, without implicit Haxe unwrapping. */
export function readRawPath(root, path) {
    const parts = parsePath(path);
    let cur = root;

    for (const key of parts) {
        if (cur === null || cur === undefined) return undefined;
        cur = cur[key];
    }

    return cur;
}
