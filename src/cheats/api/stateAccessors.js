/**
 * State Accessors API
 *
 * Functions for accessing and modifying game state:
 * - Unified path-based read/write (readPath, writePath)
 * - Selective object-entry reads for large maps (readEntries)
 * - cheatState access
 */

import { cheatState } from "../core/state.js";
import { resolvePath } from "../utils/pathResolver.js";

export function getcheatStateList() {
    return cheatState;
}

/**
 * Read a game value by dot/bracket path string.
 * @param {string} path - Path like "gga.StampLevel" or "gga.StampLevel[0][3]"
 * @returns {{ value: any } | { error: string }}
 */
export function readPath(path) {
    const resolved = resolvePath(path);
    if (resolved.error) return resolved;
    const { target, prop } = resolved;
    if (prop === undefined) return { error: "Path must include at least one key below the root" };
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

    const resolved = resolvePath(rootPath);
    if (resolved.error) return resolved;

    const { target, prop } = resolved;
    if (prop === undefined) return { error: "Path must include at least one key below the root" };

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
 * Write a game value by dot/bracket path string.
 * @param {string} path - Path like "gga.StampLevel[0][3]"
 * @param {number|string|boolean|null} value - Primitive value to write
 * @returns {{ ok: true } | { error: string }}
 */
export function writePath(path, value) {
    if (value === undefined) return { error: "Missing value" };
    if (typeof value !== "number" && typeof value !== "string" && typeof value !== "boolean" && value !== null) {
        return { error: "value must be a primitive (number, string, boolean, or null)" };
    }
    const resolved = resolvePath(path);
    if (resolved.error) return resolved;
    const { target, prop } = resolved;
    if (prop === undefined) return { error: "Path must include at least one key below the root" };
    target[prop] = value;
    return { ok: true };
}
