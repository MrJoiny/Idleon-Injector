const { createGameBridge } = require("../game/gameBridge");
const { createMonitor } = require("./monitor");
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

let gameBridge = null;
let monitors = null;

/**
 * Initializes the WebSocket server attached to the HTTP server
 * @param {Object} httpServer - Node.js HTTP server instance
 * @param {Object} runtime - CDP Runtime client
 * @param {string} context - JavaScript expression for game context
 */
function initWebSocket(httpServer, runtime, context) {
    gameBridge = runtime && context ? createGameBridge(runtime, context) : null;
    monitors = createMonitor({
        gameBridge,
        sendState: (client, data) => {
            if (client.readyState === client.OPEN) {
                client.send(JSON.stringify({ type: "monitor-state", data }));
            }
        },
    });

    wss = new WebSocketServer({ server: httpServer });

    wss.on("connection", (ws) => {
        clients.add(ws);
        ws.clientType = "ui";
        log.debug(`WS client connected (${clients.size} total)`);

        sendCheatStatesToClient(ws);
        monitors.sendState(ws);

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
            void monitors.disconnect(ws);
            log.debug(`WS client disconnected (${clients.size} total)`);
        });

        ws.on("error", (err) => {
            log.error("WS client error:", err.message);
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
            if (msg.clientType === "game") {
                await broadcastCheatStates();
                monitors.reconnect();
                broadcastMonitorState();
            }
            break;

        case "monitor-update":
            monitors.update(msg);
            break;

        case "monitor-subscribe":
            await monitors.subscribe(ws, msg.path);
            break;

        case "monitor-unsubscribe":
            await monitors.unsubscribe(ws, msg.id, msg.path);
            break;
    }
}

/**
 * Fetches current cheat states from game context via CDP
 * @returns {Promise<Object>} Cheat states object
 */
async function fetchCheatStates() {
    if (!gameBridge) {
        log.debug("Cannot fetch cheat states - context not ready");
        return {};
    }

    try {
        const statesResult = await gameBridge.callHelper("cheatStateList", [], true);

        if (statesResult.error) {
            log.error("Failed to fetch cheat states:", statesResult.error.text);
            return {};
        }

        return statesResult.value || {};
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
 * Broadcasts monitor state to all UI clients (each gets only its own list).
 */
function broadcastMonitorState() {
    const uiClients = Array.from(clients).filter((c) => c.clientType === "ui");
    for (const client of uiClients) {
        monitors.sendState(client);
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
        monitors.close();
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
