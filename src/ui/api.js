/**
 * API Module
 * Centralizes all fetch requests to the backend.
 * purely handles data: Returns Promises that resolve with data or reject with Error.
 */

const API_BASE = '/api';

/**
 * Generic internal request helper
 * @param {string} endpoint - relative path (e.g. '/config')
 * @param {object} options - fetch options
 */
async function _request(endpoint, options = {}) {
    // FIX: Ensure we don't accidentally ignore API_BASE or create double slashes
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${API_BASE}/${cleanEndpoint}`;

    try {
        const response = await fetch(url, options);

        // specific handling for 204 No Content
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
        throw error; // Propagate to UI layer
    }
}

// --- CHEATS ---

export async function fetchCheatsData() {
    // Parallel fetch for cheats and confirmation list
    const [cheats, needsConfirmation] = await Promise.all([
        _request('/cheats'),
        _request('/needs-confirmation').catch(() => []) // Fallback to empty array if this fails
    ]);

    return { cheats, needsConfirmation };
}

export async function executeCheatAction(action) {
    return _request('/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: action }),
    });
}

export async function fetchAvailableCheats() {
    return _request('/cheats');
}

// --- CONFIG ---

export async function fetchConfig() {
    return _request('/config');
}

export async function updateSessionConfig(updatedConfig) {
    return _request('/config/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig),
    });
}

export async function saveConfigFile(configToSave) {
    return _request('/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSave),
    });
}

// --- DEVTOOLS ---

export async function fetchDevToolsUrl() {
    const data = await _request('/devtools-url');
    if (data && data.url) return data.url;
    throw new Error('No URL received from backend.');
}


// --- OPTION LISTs ACCOUNT ---
export async function fetchOptionsAccount() {
    return _request('/options-account');
}

export async function updateOptionAccountIndex(index, value) {
    return _request('/options-account/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index, value })
    });
}

// --- SYSTEM ---
export async function checkHeartbeat() {
    // We expect a simple object or success. If it fails/timeouts, it throws/returns null from _request catch (if modified) 
    // actually _request throws on error, so we catch here to return boolean/null
    try {
        return await _request('/heartbeat');
    } catch (e) {
        return null;
    }
}