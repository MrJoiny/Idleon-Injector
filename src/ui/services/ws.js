/**
 * WebSocket Client Module
 *
 * Manages WebSocket connection to the server for real-time cheat state updates.
 * Handles connection lifecycle, auto-reconnect, and message dispatching.
 */

import { IS_ELECTRON } from "../state/constants.js";

/** @type {WebSocket|null} */
let ws = null;

/** @type {boolean} */
let isConnected = false;

/** @type {number|null} */
let reconnectTimer = null;

/** @type {Function|null} */
let stateUpdateHandler = null;

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
            console.log("[WebSocket] Attempting to reconnect...");
            connect();
        }
    }, RECONNECT_INTERVAL);
}

/**
 * Establishes WebSocket connection to the server
 */
function connect() {
    if (IS_ELECTRON) {
        // In Electron mode, we don't use WebSocket
        return;
    }

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
    if (IS_ELECTRON) {
        console.log("[WebSocket] Skipped - running in Electron mode");
        return;
    }

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
