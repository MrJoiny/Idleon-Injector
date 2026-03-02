/**
 * Game Memory Helper
 *
 * Thin domain wrappers around the API service layer.
 * All HTTP / error handling lives in services/api.js — these functions
 * just provide a convenient interface for UI components.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *   // Write a nested attribute (PREFERRED for all mutations)
 *   await writeGga("StampLevel", [0, 3], 50);
 *   await writeGga("TowerInfo", [4], 10);
 *   await writeGga("OptionsListAccount", [384], "0,_0,a1,");
 *
 *   // Read a single attribute
 *   const levels = await readGga("StampLevel");         // whole array
 *   const lvl    = await readGga("StampLevel", [0, 3]); // one cell
 *
 *   // Complex/cList read (use readGga for plain gga keys instead)
 *   const names = await readExpr(`cList.StampData ? cList.StampData.map(p => p.map(s => s[0])) : null`);
 */

import { readGameAttr, writeGameAttr, readGameExpr } from "../services/api.js";

/**
 * Write a primitive value into a nested game attribute.
 *
 * @param {string}   key    Top-level gga key, e.g. "StampLevel"
 * @param {number[]} path   Index path, e.g. [0, 3] → gga["StampLevel"][0][3]
 * @param {number|string|boolean|null} value  Must be a primitive.
 */
export async function writeGga(key, path, value) {
    await writeGameAttr(key, path, value);
}

/**
 * Read any game attribute or nested value by key + optional path.
 *
 * @param {string}    key   Top-level gga key, e.g. "TowerInfo"
 * @param {number[]} [path] Optional index path, e.g. [4] → gga["TowerInfo"][4]
 * @returns {Promise<*>}
 */
export async function readGga(key, path = []) {
    const data = await readGameAttr(key, path);
    return data.value;
}

/**
 * Evaluate a raw JS expression in game context (read-only).
 * Only use this when readGga() is insufficient — e.g. cList lookups,
 * method calls, or custom computed values.
 * @param {string} expression  Must produce a JSON-serialisable result.
 * @returns {Promise<*>}
 */
export async function readExpr(expression) {
    const data = await readGameExpr(expression);
    return data.value;
}
