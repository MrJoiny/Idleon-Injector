/**
 * WebSocket Server Module
 *
 * Manages WebSocket connections for real-time cheat state updates and value monitoring.
 * Provides broadcast functionality to push state changes to all connected UI clients.
 */

const { WebSocketServer } = require("ws");
const { createLogger } = require("../utils/logger");

const log = createLogger("WebSocket");

/** @type {WebSocketServer|null} */
let wss = null;

/** @type {Set<WebSocket>} */
const clients = new Set();

/** @type {Map<string, { path: string, history: Array<{ value: any, ts: number }> }>} */
const monitorState = new Map();
const HISTORY_LIMIT = 10;

/** @type {Object|null} CDP Runtime reference for fetching cheat states */
let runtimeRef = null;

/** @type {string|null} Game context expression */
let contextRef = null;

/**
 * Initializes the WebSocket server attached to the HTTP server
 * @param {Object} httpServer - Node.js HTTP server instance
 * @param {Object} runtime - CDP Runtime client
 * @param {string} context - JavaScript expression for game context
 */
function initWebSocket(httpServer, runtime, context) {
    runtimeRef = runtime;
    contextRef = context;

    wss = new WebSocketServer({ server: httpServer });

    wss.on("connection", (ws) => {
        clients.add(ws);
        ws.clientType = "ui"; // Default to UI, game will re-identify
        log.debug(`WS client connected (${clients.size} total)`);

        // Push current state immediately on connection
        sendCheatStatesToClient(ws);
        sendMonitorStateToClient(ws);

        ws.on("message", async (message) => {
            try {
                const msg = JSON.parse(message.toString());
                await handleMessage(ws, msg);
            } catch (err) {
                log.error("Failed to handle WS message:", err.message);
            }
        });

        ws.on("close", () => {
            clients.delete(ws);
            log.debug(`WS client disconnected (${clients.size} total)`);
        });

        ws.on("error", (err) => {
            log.error("WS client error:", err.message);
            clients.delete(ws);
        });
    });

    log.debug("WebSocket server attached to HTTP server");
}

/**
 * Handles incoming WebSocket messages
 * @param {WebSocket} ws
 * @param {Object} msg
 */
async function handleMessage(ws, msg) {
    switch (msg.type) {
        case "identify":
            ws.clientType = msg.clientType;
            log.debug(`Client identified as: ${ws.clientType}`);
            break;

        case "monitor-update":
            handleMonitorUpdate(msg);
            break;

        case "monitor-subscribe":
            await handleMonitorSubscribe(msg.id, msg.path);
            break;

        case "monitor-unsubscribe":
            await handleMonitorUnsubscribe(msg.id);
            break;
    }
}

/**
 * Handles value updates from the game
 * @param {Object} msg
 */
function handleMonitorUpdate(msg) {
    const { id, value, ts } = msg;
    if (!id) return;

    let state = monitorState.get(id);
    if (!state) {
        // This shouldn't happen if we subscribe correctly, but let's handle it
        state = { path: "unknown", history: [] };
        monitorState.set(id, state);
    }

    state.history.unshift({ value, ts });
    if (state.history.length > HISTORY_LIMIT) {
        state.history.pop();
    }

    broadcastMonitorState();
}

/**
 * Handles subscription requests from the UI
 * @param {string} id
 * @param {string} path
 */
async function handleMonitorSubscribe(id, path) {
    if (!runtimeRef || !contextRef) return;

    // Pre-create the state entry so initial broadcast from wrap() is captured
    if (!monitorState.has(id)) {
        monitorState.set(id, { path, history: [] });
    }

    try {
        const result = await runtimeRef.evaluate({
            expression: `window.monitorWrap("${id}", "${path}")`,
            awaitPromise: true,
            returnByValue: true,
        });

        if (result.exceptionDetails) {
            log.error(`Failed to subscribe monitor ${id}:`, result.exceptionDetails.text);
            monitorState.delete(id);
            return;
        }

        if (result.result.value && result.result.value.success) {
            // State already exists, just broadcast
            broadcastMonitorState();
        } else if (result.result.value && result.result.value.error) {
            log.error(`Monitor subscribe error for ${id}:`, result.result.value.error);
            monitorState.delete(id);
        }
    } catch (err) {
        log.error(`Error subscribing monitor ${id}:`, err.message);
        monitorState.delete(id);
    }
}

/**
 * Handles unsubscription requests from the UI
 * @param {string} id
 */
async function handleMonitorUnsubscribe(id) {
    if (!runtimeRef || !contextRef) return;

    try {
        await runtimeRef.evaluate({
            expression: `window.monitorUnwrap("${id}")`,
            awaitPromise: true,
            returnByValue: true,
        });

        monitorState.delete(id);
        broadcastMonitorState();
    } catch (err) {
        log.error(`Error unsubscribing monitor ${id}:`, err.message);
    }
}

/**
 * Fetches current cheat states from game context via CDP
 * @returns {Promise<Object>} Cheat states object
 */
async function fetchCheatStates() {
    if (!runtimeRef || !contextRef) {
        log.debug("Cannot fetch cheat states - context not ready");
        return {};
    }

    try {
        const statesResult = await runtimeRef.evaluate({
            expression: `cheatStateList.call(${contextRef})`,
            awaitPromise: true,
            returnByValue: true,
        });

        if (statesResult.exceptionDetails) {
            log.error("Failed to fetch cheat states:", statesResult.exceptionDetails.text);
            return {};
        }

        return statesResult.result.value || {};
    } catch (err) {
        log.error("Failed to fetch cheat states:", err.message);
        return {};
    }
}

/**
 * Sends cheat states to a specific client
 * @param {WebSocket} ws - WebSocket client
 */
async function sendCheatStatesToClient(ws) {
    const states = await fetchCheatStates();
    const message = JSON.stringify({
        type: "cheat-states",
        data: states,
    });

    if (ws.readyState === ws.OPEN) {
        ws.send(message);
    }
}

/**
 * Sends current monitor state to a specific client
 * @param {WebSocket} ws
 */
function sendMonitorStateToClient(ws) {
    const data = Object.fromEntries(monitorState);
    const message = JSON.stringify({
        type: "monitor-state",
        data,
    });

    if (ws.readyState === ws.OPEN) {
        ws.send(message);
    }
}

/**
 * Broadcasts current cheat states to all connected UI clients
 * Called after cheat execution to push updated state
 */
async function broadcastCheatStates() {
    const uiClients = Array.from(clients).filter((c) => c.clientType === "ui");
    if (uiClients.length === 0) return;

    const states = await fetchCheatStates();
    const message = JSON.stringify({
        type: "cheat-states",
        data: states,
    });

    for (const client of uiClients) {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    }

    log.debug(`Broadcasted states to ${uiClients.length} UI client(s)`);
}

/**
 * Broadcasts current monitor state to all connected UI clients
 */
function broadcastMonitorState() {
    const uiClients = Array.from(clients).filter((c) => c.clientType === "ui");
    if (uiClients.length === 0) return;

    const data = Object.fromEntries(monitorState);
    const message = JSON.stringify({
        type: "monitor-state",
        data,
    });

    for (const client of uiClients) {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    }
}

/**
 * Gets the number of connected WebSocket clients
 * @returns {number} Number of connected clients
 */
function getConnectedClients() {
    return clients.size;
}

/**
 * Closes the WebSocket server and all connections
 */
function closeWebSocket() {
    if (wss) {
        for (const client of clients) {
            client.close();
        }
        clients.clear();
        wss.close();
        wss = null;
        log.info("Server closed");
    }
}

module.exports = {
    initWebSocket,
    broadcastCheatStates,
    getConnectedClients,
    closeWebSocket,
};
