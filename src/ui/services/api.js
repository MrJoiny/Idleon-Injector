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
 * Read a game value by dot/bracket path.
 * The "gga." prefix is automatically prepended.
 * @param {string} path - e.g. "StampLevel" or "StampLevel[0][3]"
 * @returns {Promise<any>} The resolved value (unwrapped from { value } envelope)
 */
export async function readGga(path) {
    const data = await _request("/game/gga/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `gga.${path}` }),
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

/**
 * Write a primitive value to a game path.
 * The "gga." prefix is automatically prepended.
 * @param {string} path - e.g. "StampLevel[0][3]"
 * @param {number|string|boolean|null} value
 * @returns {Promise<{ ok: true }>}
 */
export async function writeGga(path, value) {
    return _request("/game/gga/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: `gga.${path}`, value }),
    });
}
