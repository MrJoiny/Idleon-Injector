/**
 * WebSocket Client Module
 *
 * Manages WebSocket connection to the server for real-time cheat state updates.
 * Handles connection lifecycle, auto-reconnect, and message dispatching.
 */

/** @type {WebSocket|null} */
let ws = null;

/** @type {boolean} */
let isConnected = false;

/** @type {number|null} */
let reconnectTimer = null;

/** @type {Function|null} */
let stateUpdateHandler = null;

/** @type {Function|null} */
let monitorUpdateHandler = null;

/** @type {Function|null} */
let savedListStateHandler = null;

/** @type {Function|null} */
let favoriteKeysStateHandler = null;

/** @type {Function|null} */
let selectedKeysStateHandler = null;

/** Reconnect interval in milliseconds (same as heartbeat) */
const RECONNECT_INTERVAL = 10000;

/**
 * Gets the WebSocket URL based on current page location
 * @returns {string} WebSocket URL
 */
function getWebSocketUrl() {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}`;
}

/**
 * Handles incoming WebSocket messages
 * @param {MessageEvent} event - WebSocket message event
 */
function handleMessage(event) {
    try {
        const message = JSON.parse(event.data);

        if (message.type === "cheat-states" && stateUpdateHandler) {
            stateUpdateHandler(message.data);
        } else if (message.type === "monitor-state" && monitorUpdateHandler) {
            monitorUpdateHandler(message.data);
        } else if (message.type === "saved-list-state" && savedListStateHandler) {
            savedListStateHandler(message.data);
        } else if (message.type === "favorite-keys-state" && favoriteKeysStateHandler) {
            favoriteKeysStateHandler(message.data);
        } else if (message.type === "selected-keys-state" && selectedKeysStateHandler) {
            selectedKeysStateHandler(message.data);
        }
    } catch (err) {
        console.error("[WebSocket] Error parsing message:", err);
    }
}

/**
 * Attempts to reconnect to the WebSocket server
 */
function scheduleReconnect() {
    if (reconnectTimer) return;

    reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (!isConnected) {
            console.log("[WebSocket] Attempting to reconnect");
            connect();
        }
    }, RECONNECT_INTERVAL);
}

/**
 * Establishes WebSocket connection to the server
 */
function connect() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        return;
    }

    try {
        const url = getWebSocketUrl();
        ws = new WebSocket(url);

        ws.onopen = () => {
            isConnected = true;
            console.log("[WebSocket] Connected to server");
        };

        ws.onmessage = handleMessage;

        ws.onclose = () => {
            isConnected = false;
            ws = null;
            console.log("[WebSocket] Disconnected from server");
            scheduleReconnect();
        };

        ws.onerror = () => {
            console.error("[WebSocket] Connection error");
            // onclose will be called after onerror, which will trigger reconnect
        };
    } catch (err) {
        console.error("[WebSocket] Failed to create connection:", err);
        scheduleReconnect();
    }
}

/**
 * Initializes the WebSocket client and establishes connection
 */
export function initWebSocket() {
    connect();
}

/**
 * Registers a handler for cheat state updates
 * @param {Function} handler - Callback function receiving state data
 */
export function onStateUpdate(handler) {
    stateUpdateHandler = handler;
}

/**
 * Registers a handler for monitor updates
 * @param {Function} handler - Callback function receiving monitor data
 */
export function onMonitorUpdate(handler) {
    monitorUpdateHandler = handler;
}

/**
 * Registers a handler for shared saved list state updates.
 * @param {Function} handler - Callback function receiving saved list entries array
 */
export function onSavedListState(handler) {
    savedListStateHandler = handler;
}

/**
 * Registers a handler for shared favorite-keys state updates.
 * @param {Function} handler - Callback function receiving favorite keys array
 */
export function onFavoriteKeysState(handler) {
    favoriteKeysStateHandler = handler;
}

/**
 * Registers a handler for shared selected-keys state updates.
 * @param {Function} handler - Callback function receiving selected keys array
 */
export function onSelectedKeysState(handler) {
    selectedKeysStateHandler = handler;
}

/**
 * Sends a monitor subscription request to the server
 * @param {string} id
 * @param {string} path
 */
export function sendMonitorSubscribe(id, path) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "monitor-subscribe", id, path }));
    }
}

/**
 * Sends a monitor unsubscription request to the server
 * @param {string} id
 */
export function sendMonitorUnsubscribe(id) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "monitor-unsubscribe", id }));
    }
}

/**
 * Sends a local saved-list snapshot to merge with shared session state.
 * @param {Array<Object>} entries
 */
export function sendSavedListSync(entries) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "saved-list-sync", entries }));
    }
}

/**
 * Sends an explicit saved-list mutation event.
 * @param {Object} event
 */
export function sendSavedListEvent(event) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "saved-list-event", event }));
    }
}

/**
 * Sends a local favorite-keys snapshot to merge with shared session state.
 * @param {Array<string>} keys
 */
export function sendFavoriteKeysSync(keys) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "favorite-keys-sync", keys }));
    }
}

/**
 * Sends an explicit favorite-keys mutation event.
 * @param {Object} event
 */
export function sendFavoriteKeysEvent(event) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "favorite-keys-event", event }));
    }
}

/**
 * Sends a local selected-keys snapshot to merge with shared session state.
 * @param {Array<string>} keys
 */
export function sendSelectedKeysSync(keys) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "selected-keys-sync", keys }));
    }
}

/**
 * Sends an explicit selected-keys mutation event.
 * @param {Object} event
 */
export function sendSelectedKeysEvent(event) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "selected-keys-event", event }));
    }
}

/**
 * Gets the current WebSocket connection status
 * @returns {boolean} True if connected
 */
export function getConnectionStatus() {
    return isConnected;
}

/**
 * Closes the WebSocket connection
 */
export function closeWebSocket() {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (ws) {
        ws.close();
        ws = null;
    }

    isConnected = false;
}
