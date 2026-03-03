/**
 * State Accessors API
 *
 * Functions for accessing and modifying game state:
 * - Unified path-based read/write (readPath, writePath)
 * - OptionsListAccount access
 * - cheatState access
 */

import { gga } from "../core/globals.js";
import { cheatState } from "../core/state.js";
import { resolvePath } from "../utils/pathResolver.js";

export function getOLA() {
    return [...gga.OptionsListAccount];
}

export function setOLAIndex(index, value) {
    const ola = gga.OptionsListAccount;
    ola[index] = value;
    return ola[index];
}

export function getOLAIndex(index) {
    return getOLA()[index];
}

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
    return { value: target[prop] };
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
