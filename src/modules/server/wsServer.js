/**
 * WebSocket Server Module
 *
 * Manages WebSocket connections for real-time cheat state updates.
 * Provides broadcast functionality to push state changes to all connected UI clients.
 */

const { WebSocketServer } = require("ws");

/** @type {WebSocketServer|null} */
let wss = null;

/** @type {Set<WebSocket>} */
const clients = new Set();

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
        console.log(`[WebSocket] Client connected. Total clients: ${clients.size}`);

        // Push current state immediately on connection
        sendCheatStatesToClient(ws);

        ws.on("close", () => {
            clients.delete(ws);
            console.log(`[WebSocket] Client disconnected. Total clients: ${clients.size}`);
        });

        ws.on("error", (err) => {
            console.error("[WebSocket] Client error:", err.message);
            clients.delete(ws);
        });
    });

    console.log("[WebSocket] Server initialized and attached to HTTP server");
}

/**
 * Fetches current cheat states from game context via CDP
 * @returns {Promise<Object>} Cheat states object
 */
async function fetchCheatStates() {
    if (!runtimeRef || !contextRef) {
        console.error("[WebSocket] Runtime or context not available");
        return {};
    }

    try {
        const statesResult = await runtimeRef.evaluate({
            expression: `cheatStateList.call(${contextRef})`,
            awaitPromise: true,
            returnByValue: true,
        });

        if (statesResult.exceptionDetails) {
            console.error("[WebSocket] Error fetching cheat states:", statesResult.exceptionDetails.text);
            return {};
        }

        return statesResult.result.value || {};
    } catch (err) {
        console.error("[WebSocket] Error fetching cheat states:", err.message);
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
 * Broadcasts current cheat states to all connected clients
 * Called after cheat execution to push updated state
 */
async function broadcastCheatStates() {
    if (clients.size === 0) return;

    const states = await fetchCheatStates();
    const message = JSON.stringify({
        type: "cheat-states",
        data: states,
    });

    for (const client of clients) {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    }

    console.log(`[WebSocket] Broadcasted cheat states to ${clients.size} client(s)`);
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
        console.log("[WebSocket] Server closed");
    }
}

module.exports = {
    initWebSocket,
    broadcastCheatStates,
    getConnectedClients,
    closeWebSocket,
};
