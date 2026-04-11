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

/** @type {Map<WebSocket, Map<string, { path: string, history: Array<{ value: any, ts: number }> }>>} */
const clientMonitorState = new Map();

/** @type {Map<string, { id: string, path: string, refCount: number }>} */
const globalWatchersByPath = new Map();

/** @type {Map<string, string>} */
const globalWatchersById = new Map();

const HISTORY_LIMIT = 10;
const MONITOR_SUBSCRIBE_RETRY_DELAY_MS = 1000;
const MONITOR_SUBSCRIBE_MAX_RETRIES = 20;

/** @type {Object|null} CDP Runtime reference for fetching cheat states */
let runtimeRef = null;

/** @type {string|null} Game context expression */
let contextRef = null;

/** @type {Map<WebSocket, Map<string, NodeJS.Timeout>>} */
const monitorSubscribeRetryTimers = new Map();

function monitorIdFromPath(path) {
    return "mon:" + encodeURIComponent(path);
}

function escapeForDoubleQuotedJsString(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getClientMonitorMap(ws) {
    let monitorMap = clientMonitorState.get(ws);
    if (!monitorMap) {
        monitorMap = new Map();
        clientMonitorState.set(ws, monitorMap);
    }
    return monitorMap;
}

function getClientRetryMap(ws) {
    let retryMap = monitorSubscribeRetryTimers.get(ws);
    if (!retryMap) {
        retryMap = new Map();
        monitorSubscribeRetryTimers.set(ws, retryMap);
    }
    return retryMap;
}

function clearMonitorSubscribeRetry(ws, id) {
    const retryMap = monitorSubscribeRetryTimers.get(ws);
    if (!retryMap) return;

    const timer = retryMap.get(id);
    if (timer) {
        clearTimeout(timer);
        retryMap.delete(id);
    }

    if (retryMap.size === 0) {
        monitorSubscribeRetryTimers.delete(ws);
    }
}

function clearAllMonitorSubscribeRetries(ws) {
    const retryMap = monitorSubscribeRetryTimers.get(ws);
    if (!retryMap) return;

    for (const timer of retryMap.values()) {
        clearTimeout(timer);
    }

    monitorSubscribeRetryTimers.delete(ws);
}

function isTransientMonitorSubscribeError(errorText) {
    if (!errorText) return false;

    const text = String(errorText);
    return text.includes("Target object is null or undefined") || text.includes("Cannot resolve path segment");
}

function scheduleMonitorSubscribeRetry(ws, path, id, retryAttempt) {
    if (retryAttempt >= MONITOR_SUBSCRIBE_MAX_RETRIES) {
        const monitorMap = clientMonitorState.get(ws);
        if (monitorMap) {
            monitorMap.delete(id);
            sendMonitorStateToClient(ws);
        }

        log.error(`Monitor subscribe failed after retries for ${id}`);
        clearMonitorSubscribeRetry(ws, id);
        return;
    }

    const retryMap = getClientRetryMap(ws);
    if (retryMap.has(id)) return;

    const timer = setTimeout(() => {
        retryMap.delete(id);
        if (retryMap.size === 0) {
            monitorSubscribeRetryTimers.delete(ws);
        }

        const monitorMap = clientMonitorState.get(ws);
        if (!monitorMap || !monitorMap.has(id)) return;
        void handleMonitorSubscribe(ws, path, retryAttempt + 1, true);
    }, MONITOR_SUBSCRIBE_RETRY_DELAY_MS);

    retryMap.set(id, timer);
}

function sendMonitorStateToClient(ws) {
    const monitorMap = clientMonitorState.get(ws) || new Map();
    const data = {};

    for (const [id, entry] of monitorMap.entries()) {
        data[id] = { path: entry.path, history: entry.history };
    }

    const message = JSON.stringify({
        type: "monitor-state",
        data,
    });

    if (ws.readyState === ws.OPEN) {
        ws.send(message);
    }
}

async function seedClientCurrentValue(ws, id, path) {
    if (!runtimeRef || !contextRef) return;

    const escapedPath = escapeForDoubleQuotedJsString(path);

    try {
        const result = await runtimeRef.evaluate({
            expression: `window.readGamePath("${escapedPath}")`,
            awaitPromise: true,
            returnByValue: true,
        });

        if (result.exceptionDetails) {
            return;
        }

        const payload = result.result && result.result.value;
        if (!payload || !Object.prototype.hasOwnProperty.call(payload, "value")) {
            return;
        }

        const monitorMap = clientMonitorState.get(ws);
        const entry = monitorMap && monitorMap.get(id);
        if (!entry) return;

        entry.history.unshift({ value: payload.value, ts: Date.now() });
        if (entry.history.length > HISTORY_LIMIT) {
            entry.history.pop();
        }
    } catch (err) {
        log.debug(`Could not seed monitor value for ${path}: ${err.message}`);
    }
}

async function releaseGlobalWatcher(path) {
    const watcher = globalWatchersByPath.get(path);
    if (!watcher) return;

    watcher.refCount -= 1;
    if (watcher.refCount > 0) {
        return;
    }

    globalWatchersByPath.delete(path);
    globalWatchersById.delete(watcher.id);

    if (!runtimeRef || !contextRef) return;

    try {
        const escapedId = escapeForDoubleQuotedJsString(watcher.id);
        await runtimeRef.evaluate({
            expression: `window.monitorUnwrap("${escapedId}")`,
            awaitPromise: true,
            returnByValue: true,
        });
    } catch (err) {
        log.error(`Error unsubscribing monitor ${watcher.id}:`, err.message);
    }
}

async function cleanupClientSubscriptions(ws) {
    const monitorMap = clientMonitorState.get(ws);
    if (!monitorMap) return;

    clientMonitorState.delete(ws);

    const paths = new Set();
    for (const entry of monitorMap.values()) {
        paths.add(entry.path);
    }

    for (const path of paths) {
        await releaseGlobalWatcher(path);
    }

    clearAllMonitorSubscribeRetries(ws);
}

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
        getClientMonitorMap(ws);
        ws.clientType = "ui";
        log.debug(`WS client connected (${clients.size} total)`);

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
            void cleanupClientSubscriptions(ws);
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
                broadcastMonitorState();
            }
            break;

        case "monitor-update":
            handleMonitorUpdate(msg);
            break;

        case "monitor-subscribe":
            await handleMonitorSubscribe(ws, msg.path);
            break;

        case "monitor-unsubscribe":
            await handleMonitorUnsubscribe(ws, msg.id, msg.path);
            break;
    }
}

/**
 * Handles value updates from the game.
 * Updates only clients subscribed to the specific monitor id.
 * @param {Object} msg
 */
function handleMonitorUpdate(msg) {
    const { id, value } = msg;
    const ts = typeof msg.ts === "number" ? msg.ts : Date.now();
    if (!id) return;

    const path = globalWatchersById.get(id);
    if (!path) return;

    for (const [ws, monitorMap] of clientMonitorState.entries()) {
        const entry = monitorMap.get(id);
        if (!entry) continue;

        entry.history.unshift({ value, ts });
        if (entry.history.length > HISTORY_LIMIT) {
            entry.history.pop();
        }

        sendMonitorStateToClient(ws);
    }
}

/**
 * Handles subscription requests from a specific UI client.
 * Uses per-client monitor lists and shared global runtime hooks.
 * @param {WebSocket} ws
 * @param {string} path
 */
async function handleMonitorSubscribe(ws, path, retryAttempt = 0, forceAttempt = false) {
    if (!runtimeRef || !contextRef) return;
    if (typeof path !== "string" || !path.trim()) return;

    const normalizedPath = path.trim();
    const id = monitorIdFromPath(normalizedPath);
    const monitorMap = getClientMonitorMap(ws);

    if (monitorMap.has(id) && !forceAttempt) {
        sendMonitorStateToClient(ws);
        return;
    }

    monitorMap.set(id, { path: normalizedPath, history: [] });

    const existingWatcher = globalWatchersByPath.get(normalizedPath);
    if (existingWatcher) {
        existingWatcher.refCount += 1;
        clearMonitorSubscribeRetry(ws, id);
        await seedClientCurrentValue(ws, id, normalizedPath);
        sendMonitorStateToClient(ws);
        return;
    }

    try {
        const escapedId = escapeForDoubleQuotedJsString(id);
        const escapedPath = escapeForDoubleQuotedJsString(normalizedPath);

        const result = await runtimeRef.evaluate({
            expression: `window.monitorWrap("${escapedId}", "${escapedPath}")`,
            awaitPromise: true,
            returnByValue: true,
        });

        if (result.exceptionDetails) {
            const errorText = result.exceptionDetails.text;
            if (isTransientMonitorSubscribeError(errorText)) {
                log.debug(`Monitor subscribe pending for ${id}: ${errorText}`);
                scheduleMonitorSubscribeRetry(ws, normalizedPath, id, retryAttempt);
                return;
            }

            log.error(`Failed to subscribe monitor ${id}:`, errorText);
            clearMonitorSubscribeRetry(ws, id);
            monitorMap.delete(id);
            sendMonitorStateToClient(ws);
            return;
        }

        const payload = result.result && result.result.value;
        const alreadyWatching = payload && payload.error === "Already watching this ID";
        const success = payload && payload.success;

        if (!success && !alreadyWatching) {
            const errorText = payload && payload.error;
            if (isTransientMonitorSubscribeError(errorText)) {
                log.debug(`Monitor subscribe pending for ${id}: ${errorText}`);
                scheduleMonitorSubscribeRetry(ws, normalizedPath, id, retryAttempt);
                return;
            }

            if (errorText) {
                log.error(`Monitor subscribe error for ${id}:`, errorText);
            }
            clearMonitorSubscribeRetry(ws, id);
            monitorMap.delete(id);
            sendMonitorStateToClient(ws);
            return;
        }

        clearMonitorSubscribeRetry(ws, id);

        const watcherAfterWrap = globalWatchersByPath.get(normalizedPath);
        if (watcherAfterWrap) {
            watcherAfterWrap.refCount += 1;
        } else {
            globalWatchersByPath.set(normalizedPath, { id, path: normalizedPath, refCount: 1 });
            globalWatchersById.set(id, normalizedPath);
        }

        await seedClientCurrentValue(ws, id, normalizedPath);

        sendMonitorStateToClient(ws);
    } catch (err) {
        if (isTransientMonitorSubscribeError(err.message)) {
            log.debug(`Monitor subscribe pending for ${id}: ${err.message}`);
            scheduleMonitorSubscribeRetry(ws, normalizedPath, id, retryAttempt);
            return;
        }

        log.error(`Error subscribing monitor ${id}:`, err.message);
        clearMonitorSubscribeRetry(ws, id);
        monitorMap.delete(id);
        sendMonitorStateToClient(ws);
    }
}

/**
 * Handles unsubscription requests from a specific UI client.
 * @param {WebSocket} ws
 * @param {string} id
 * @param {string} path
 */
async function handleMonitorUnsubscribe(ws, id, path) {
    const monitorMap = clientMonitorState.get(ws);
    if (!monitorMap) return;

    let targetId = null;

    if (typeof id === "string" && id && monitorMap.has(id)) {
        targetId = id;
    }

    if (!targetId && typeof path === "string" && path.trim()) {
        const pathId = monitorIdFromPath(path.trim());
        if (monitorMap.has(pathId)) {
            targetId = pathId;
        }
    }

    if (!targetId) {
        return;
    }

    const entry = monitorMap.get(targetId);
    monitorMap.delete(targetId);
    clearMonitorSubscribeRetry(ws, targetId);
    sendMonitorStateToClient(ws);

    if (entry && entry.path) {
        await releaseGlobalWatcher(entry.path);
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
        sendMonitorStateToClient(client);
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
        if (runtimeRef && contextRef) {
            void runtimeRef
                .evaluate({
                    expression: "window.monitorUnwrapAll()",
                    awaitPromise: true,
                    returnByValue: true,
                })
                .catch((err) => {
                    log.error("Error unwrapping all monitors during shutdown:", err.message);
                });
        }

        for (const client of clients) {
            client.close();
        }
        clients.clear();
        clientMonitorState.clear();
        for (const retryMap of monitorSubscribeRetryTimers.values()) {
            for (const timer of retryMap.values()) {
                clearTimeout(timer);
            }
        }
        monitorSubscribeRetryTimers.clear();
        globalWatchersByPath.clear();
        globalWatchersById.clear();
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
