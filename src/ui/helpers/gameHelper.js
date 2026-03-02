/**
 * Game Memory Helper
 *
 * Single generic interface between UI components and live game memory.
 *
 * ── Architecture ────────────────────────────────────────────────────────────
 *
 *   Structured writes  →  /api/game/attr/write  { key, path, value }
 *   Structured reads   →  /api/game/attr/read   { key, path }
 *   Batch/complex reads →  /api/game/read        { expression }   (read-only)
 *
 *   Writes NEVER send raw JS to the server. The server validates key as a
 *   safe identifier and path as an array of non-negative integers, then
 *   builds the assignment itself.  Value must be a primitive.
 *
 *   readExpr() sends a raw expression for cases where readGga() is not
 *   sufficient — cList lookups, method calls, or computed values.
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *   // Write a nested attribute (PREFERRED for all mutations)
 *   await writeGga("StampLevel", [0, 3], 50);
 *   await writeGga("StampLevelMAX", [0, 3], 50);
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

// ── Structured write ──────────────────────────────────────────────────────

/**
 * Write a primitive value into a nested game attribute.
 *
 * @param {string}   key    Top-level gga key, e.g. "StampLevel"
 * @param {number[]} path   Index path, e.g. [0, 3] → gga["StampLevel"][0][3]
 * @param {number|string|boolean|null} value  Must be a primitive.
 *
 * @example
 *   await writeGga("FurnaceLevels", [2], 90);
 *   await writeGga("CauldronInfo",  [0, 5], 50000);
 *   await writeGga("OptionsListAccount", [384], "0,_0,a1,");
 */
export async function writeGga(key, path, value) {
    await _post("attr/write", { key, path, value });
}

// ── Structured read ───────────────────────────────────────────────────────

/**
 * Read any game attribute or nested value by key + optional path.
 *
 * @param {string}    key   Top-level gga key, e.g. "TowerInfo"
 * @param {number[]} [path] Optional index path, e.g. [4] → gga["TowerInfo"][4]
 * @returns {Promise<*>}
 */
export async function readGga(key, path = []) {
    const data = await _post("attr/read", { key, path });
    return data.value;
}

// ── Batch / complex read  (read-only, expression-based) ───────────────────

/**
 * Evaluate a raw JS expression in game context (read-only).
 * Only use this when readGga() is insufficient — e.g. cList lookups,
 * method calls, or custom computed values.
 * @param {string} expression  Must produce a JSON-serialisable result.
 * @returns {Promise<*>}
 */
export async function readExpr(expression) {
    const data = await _post("read", { expression });
    return data.value;
}


