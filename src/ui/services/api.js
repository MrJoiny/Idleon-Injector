/**
 * API Module
 * Centralizes all fetch requests to the backend.
 * purely handles data: Returns Promises that resolve with data or reject with Error.
 */

const API_BASE = "/api";

/**
 * Generic internal request helper
 * @param {string} endpoint - relative path (e.g. '/config')
 * @param {object} options - fetch options
 */
async function _request(endpoint, options = {}) {
    // Clean endpoint to prevent double slashes when joining with API_BASE
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    const url = `${API_BASE}/${cleanEndpoint}`;

    try {
        const response = await fetch(url, options);

        if (response.status === 204) return null;

        const contentType = response.headers.get("content-type");
        let data = {};

        if (contentType && contentType.includes("application/json")) {
            data = await response.json().catch(() => ({}));
        }

        if (!response.ok) {
            throw new Error(data.details || data.error || `HTTP Error ${response.status}`);
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

export async function fetchCheatStates() {
    return _request("/cheat-states");
}

export async function fetchCheatsData() {
    return _request("/cheats");
}

export async function executeCheatAction(action) {
    return _request("/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: action }),
    });
}

export async function fetchConfig() {
    return _request("/config");
}

export async function fetchAppInfo() {
    return _request("/app-info");
}

export async function updateSessionConfig(updatedConfig) {
    return _request("/config/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedConfig),
    });
}

export async function saveConfigFile(configToSave) {
    return _request("/config/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configToSave),
    });
}

export async function fetchDevToolsUrl() {
    const data = await _request("/devtools-url");
    if (data && data.url) return data.url;
    throw new Error("No URL received from backend");
}

export async function checkHeartbeat() {
    try {
        return await _request("/heartbeat");
    } catch {
        return null;
    }
}

export async function openExternalUrl(url) {
    return _request("/open-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
    });
}

export async function fetchGgaKeys() {
    const data = await _request("/search/keys");
    return data.keys || [];
}

export async function searchGga(query, keys) {
    return _request("/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, keys }),
    });
}

/**
 * Read a value from cList (gga.CustomLists.h) by dot/bracket path.
 * @param {string} path - e.g. "Tome[27]" or "RANDOlist[16]"
 * @returns {Promise<any>} The resolved value (unwrapped from { value } envelope)
 */
export async function readCList(path) {
    const data = await _request("/game/gga/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `gga.CustomLists.h.${path}` }),
    });
    return data.value;
}

/**
 * Read selected entries from a large GGA object map.
 * The "gga." prefix is automatically prepended to rootPath.
 * @param {string} rootPath - e.g. "ItemDefinitionsGET.h"
 * @param {string[]} keys - Entry keys to read
 * @param {string[]=} fields - Optional field whitelist per entry
 * @returns {Promise<object>} Object keyed by requested entries
 */
export async function readGgaEntries(rootPath, keys, fields) {
    const normalizedRootPath = rootPath.startsWith("gga.") ? rootPath : `gga.${rootPath}`;
    const data = await _request("/game/gga/read-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rootPath: normalizedRootPath, keys, fields }),
    });
    return data.value || {};
}

const normalizeForCompare = (input) => {
    if (Array.isArray(input)) return input.map((entry) => normalizeForCompare(entry));
    if (input && typeof input === "object") {
        const out = {};
        for (const key of Object.keys(input).sort()) out[key] = normalizeForCompare(input[key]);
        return out;
    }
    return input;
};

const coerceNumericForCompare = (input) => {
    if (typeof input === "number") return Number.isNaN(input) ? undefined : input;
    if (typeof input === "string") {
        const trimmed = input.trim();
        if (!trimmed) return undefined;
        const parsed = Number(trimmed);
        return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
};

const coerceBooleanForCompare = (input) => {
    if (typeof input === "boolean") return input;
    if (typeof input === "number") {
        if (input === 1) return true;
        if (input === 0) return false;
        return undefined;
    }
    if (typeof input === "string") {
        const normalized = input.trim().toLowerCase();
        if (normalized === "true" || normalized === "1") return true;
        if (normalized === "false" || normalized === "0") return false;
        return undefined;
    }
    return undefined;
};

const matchesVerifiedValue = (expected, actual) => {
    if (typeof expected === "number") {
        const normalizedActual = coerceNumericForCompare(actual);
        if (typeof normalizedActual === "undefined") return false;
        return Object.is(expected, normalizedActual);
    }
    if (typeof expected === "string") return String(actual) === String(expected);
    if (typeof expected === "boolean") return coerceBooleanForCompare(actual) === expected;
    if (expected === null) return actual === null;
    if (Array.isArray(expected) || (expected && typeof expected === "object")) {
        return JSON.stringify(normalizeForCompare(actual)) === JSON.stringify(normalizeForCompare(expected));
    }
    if (typeof expected === "undefined") return typeof actual === "undefined";
    return Object.is(actual, expected);
};

/**
 * Unified read/write helper with built-in typed verification.
 * Read mode:
 *   gga(path) -> returns the raw resolved value
 * Write mode:
 *   gga(path, value) -> returns true/false
 *
 * Verification is semantic/coercive by design for account-page workflows:
 * - numbers can match numeric strings (e.g. 1 === "1")
 * - booleans can match 1/0 and "true"/"false"
 * - objects/arrays are normalized before structural comparison
 *
 * @param {string} path
 * @param {any=} value
 * @returns {Promise<any|boolean>}
 */
export async function gga(path, value) {
    const ggaPath = `gga.${path}`;
    const isWrite = arguments.length >= 2;

    if (!isWrite) {
        const data = await _request("/game/gga/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: ggaPath }),
        });
        return data.value;
    }

    try {
        await _request("/game/gga/write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: ggaPath, value }),
        });

        const verifiedData = await _request("/game/gga/read", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: ggaPath }),
        });
        const verifiedValue = verifiedData.value;
        const matches = matchesVerifiedValue(value, verifiedValue);

        if (!matches) {
            console.error(
                `[gga] Write mismatch at ${path}: expected ${JSON.stringify(value)}, got ${JSON.stringify(verifiedValue)}`
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error(`[gga] Write failed at ${path}:`, error);
        return false;
    }
}

/**
 * Write many GGA paths in one backend/CDP round-trip, then verify from the UI
 * using follow-up reads so batch verification matches the single-write gga flow.
 *
 * @param {Array<{ path: string, value: any }>} writes
 * @returns {Promise<{ ok: boolean, results: Array<{ path: string, ok: boolean, actual?: any, error?: string }> }>}
 */
export async function ggaMany(writes) {
    const normalizedWrites = Array.isArray(writes)
        ? writes.map((entry) => {
              const rawPath = typeof entry?.path === "string" ? entry.path : "";
              return {
                  path: rawPath.startsWith("gga.") ? rawPath : rawPath ? `gga.${rawPath}` : "",
                  value: entry?.value,
              };
          })
        : [];

    const writeResult = await _request("/game/gga/write-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ writes: normalizedWrites }),
    });

    const writeByPath = new Map(
        Array.isArray(writeResult?.results) ? writeResult.results.map((entry) => [entry?.path, entry]) : []
    );
    const results = await Promise.all(
        normalizedWrites.map(async (entry, index) => {
            const writeEntry = writeByPath.get(entry.path) ?? writeResult?.results?.[index];
            if (!writeEntry?.ok) {
                return {
                    path: writeEntry?.path ?? entry.path,
                    ok: false,
                    error: writeEntry?.error ?? "Batch write failed",
                };
            }

            try {
                const verifiedData = await _request("/game/gga/read", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ path: entry.path }),
                });
                const actual = verifiedData.value;
                const matches = matchesVerifiedValue(entry.value, actual);

                if (!matches) {
                    console.error(
                        `[ggaMany] Write mismatch at ${entry.path}: expected ${JSON.stringify(entry.value)}, got ${JSON.stringify(actual)}`
                    );
                    return { path: entry.path, ok: false, actual, error: "Write mismatch" };
                }

                return { path: entry.path, ok: true, actual };
            } catch (error) {
                console.error(`[ggaMany] Verification failed at ${entry.path}:`, error);
                return {
                    path: entry.path,
                    ok: false,
                    error: error?.message ?? String(error),
                };
            }
        })
    );

    return {
        ok: results.every((result) => result.ok),
        results,
    };
}

/**
 * Read a computed value from a game helper family.
 * Example: readComputed("workbench", "ExtraMaxLvAtom", [baseMax, index])
 *
 * @param {string} namespace
 * @param {string} name
 * @param {Array=} args
 * @returns {Promise<any>}
 */
export async function readComputed(namespace, name, args = []) {
    const data = await _request("/game/computed/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace, name, args }),
    });
    return data.value;
}

/**
 * Read many computed values from one game helper family in one backend/CDP round-trip.
 *
 * @param {string} namespace
 * @param {string} name
 * @param {Array[]=} argSets
 * @returns {Promise<Array<{ ok: boolean, value?: any, error?: string }>>}
 */
export async function readComputedMany(namespace, name, argSets = []) {
    const data = await _request("/game/computed/read-many", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namespace, name, argSets }),
    });
    return data.value || [];
}
