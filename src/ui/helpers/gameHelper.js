/**
 * Game Memory Helper
 *
 * Single generic interface between UI components and live game memory.
 * Uses two generic backend endpoints so no new API route is needed
 * when adding a new feature.
 *
 * ── Backend endpoints consumed ──────────────────────────────────────────────
 *   POST /api/game/read   { expression }  → { value }
 *   POST /api/game/write  { expression }  → { ok }
 *
 * ── Usage ───────────────────────────────────────────────────────────────────
 *   import { readAttr, writeAttr, readMany } from "../../helpers/gameHelper.js";
 *
 *   // Read a single game attribute
 *   const levels = await readAttr("StampLevel");
 *
 *   // Read multiple at once (one round-trip)
 *   const { levels, maxLevels, names } = await readMany({
 *       levels:    `gga.StampLevel`,
 *       maxLevels: `gga.StampLevelMAX`,
 *       names:     `cList.StampData ? cList.StampData.map(p => p.map(s => s[0])) : null`,
 *   });
 *
 *   // Write to a nested attribute
 *   await writeAttr(`gga.StampLevel[0][3] = 50`);
 *   await writeAttr(`gga.StampLevelMAX[0][3] = 50`);
 */

const BASE = "/api/game";

async function _post(endpoint, body) {
    const res = await fetch(`${BASE}/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

// ── Low-level primitives ───────────────────────────────────────────────────

/**
 * Evaluate a JS expression in game context and return its value.
 * The expression must produce a JSON-serialisable result.
 * @param {string} expression
 * @returns {Promise<*>}
 */
export async function readExpr(expression) {
    const data = await _post("read", { expression });
    return data.value;
}

/**
 * Execute a JS statement in game context (assignment, method call, etc.).
 * @param {string} expression
 * @returns {Promise<void>}
 */
export async function writeExpr(expression) {
    await _post("write", { expression });
}

// ── Typed game-attribute helpers ──────────────────────────────────────────

/**
 * Read any top-level game attribute by name.
 * Equivalent to: gga[name]
 * @param {string} name  e.g. "StampLevel"
 */
export function readAttr(name) {
    return readExpr(`gga.${name}`);
}

/**
 * Write a raw JS expression into game context.
 * Prefer using this over raw writeExpr for clarity.
 * @param {string} expression  e.g. `gga.StampLevel[0][3] = 50`
 */
export function writeAttr(expression) {
    return writeExpr(expression);
}

/**
 * Read a key from cList (CustomLists).
 * @param {string} key  e.g. "StampData"
 */
export function readCList(key) {
    return readExpr(
        `(cList && cList["${key}"] !== undefined) ? cList["${key}"] : null`
    );
}

/**
 * Read multiple expressions in a single round-trip.
 * @param {Record<string, string>} specs  { resultKey: jsExpression, ... }
 * @returns {Promise<Record<string, *>>}
 *
 * @example
 * const { levels, names } = await readMany({
 *     levels: `gga.StampLevel`,
 *     names:  `cList.StampData ? cList.StampData.map(p => p.map(s => s[0])) : null`,
 * });
 */
export async function readMany(specs) {
    const keys = Object.keys(specs);
    // Build a single object literal expression so it's one CDP round-trip
    const objExpr =
        "({" +
        keys.map((k) => `"${k}": (function(){ try { return ${specs[k]}; } catch(e){ return null; } })()`).join(",") +
        "})";

    return readExpr(objExpr);
}
