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

/** @type {Map<WebSocket, Map<string, { path: string, history: Array<{ value: any, ts: number }>, error?: string }>>} */
const clientMonitorState = new Map();

/**
 * Game-side wraps currently installed, keyed by path. Subscriber counts are
 * always derived from clientMonitorState so competing subscribe/cleanup
 * interleavings cannot drift out of sync with reality.
 * @type {Map<string, { id: string, releasePromise?: Promise<void>|null }>}
 */
const globalWatchersByPath = new Map();

const HISTORY_LIMIT = 10;
const MONITOR_SUBSCRIBE_RETRY_DELAY_MS = 1000;
const MONITOR_SUBSCRIBE_MAX_RETRIES = 20;
// ponytail: coalesced full-state sends; switch to per-id delta messages if
// clients ever watch enough paths for serialization to matter
const MONITOR_SEND_COALESCE_MS = 100;

/** @type {Map<WebSocket, NodeJS.Timeout>} */
const monitorSendTimers = new Map();

/** @type {Object|null} CDP Runtime reference for fetching cheat states */
let runtimeRef = null;

/** @type {string|null} Game context expression */
let contextRef = null;

/** @type {Map<WebSocket, Map<string, NodeJS.Timeout>>} */
const monitorSubscribeRetryTimers = new Map();

function monitorIdFromPath(path) {
    return "mon:" + encodeURIComponent(path);
}

function pushHistory(entry, value, ts = Date.now()) {
    entry.history.unshift({ value, ts });
    if (entry.history.length > HISTORY_LIMIT) {
        entry.history.pop();
    }
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

function countMonitorSubscribers(id) {
    let count = 0;
    for (const monitorMap of clientMonitorState.values()) {
        if (monitorMap.has(id)) {
            count += 1;
        }
    }
    return count;
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
        failMonitorSubscription(ws, id, `Gave up after ${MONITOR_SUBSCRIBE_MAX_RETRIES} retries`);
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

/**
 * Parks a client subscription with an error instead of deleting it: a deleted
 * entry makes the UI's reconcile resubscribe immediately, which loops forever
 * for permanently failing paths. A parked entry is retried only when the user
 * toggles the watcher or the game context is replaced.
 */
function failMonitorSubscription(ws, id, errorText) {
    clearMonitorSubscribeRetry(ws, id);

    const monitorMap = clientMonitorState.get(ws);
    const entry = monitorMap && monitorMap.get(id);
    if (entry) {
        entry.error = String(errorText || "Monitor subscribe failed");
        sendMonitorStateToClient(ws);
    }

    log.error(`Monitor subscribe failed for ${id}: ${errorText}`);
}

function sendMonitorStateToClient(ws) {
    const pendingTimer = monitorSendTimers.get(ws);
    if (pendingTimer) {
        clearTimeout(pendingTimer);
        monitorSendTimers.delete(ws);
    }

    const monitorMap = clientMonitorState.get(ws) || new Map();
    const data = {};

    for (const [id, entry] of monitorMap.entries()) {
        data[id] = { path: entry.path, history: entry.history, error: entry.error || null };
    }

    const message = JSON.stringify({
        type: "monitor-state",
        data,
    });

    if (ws.readyState === ws.OPEN) {
        ws.send(message);
    }
}

function queueMonitorStateSend(ws) {
    if (monitorSendTimers.has(ws)) return;

    monitorSendTimers.set(
        ws,
        setTimeout(() => {
            monitorSendTimers.delete(ws);
            sendMonitorStateToClient(ws);
        }, MONITOR_SEND_COALESCE_MS)
    );
}

async function seedClientCurrentValue(ws, id, path) {
    if (!runtimeRef || !contextRef) return;

    try {
        const result = await runtimeRef.evaluate({
            expression: `window.readGamePath(${JSON.stringify(path)})`,
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

        pushHistory(entry, payload.value);
    } catch (err) {
        log.debug(`Could not seed monitor value for ${path}: ${err.message}`);
    }
}

async function releaseGlobalWatcher(path) {
    const watcher = globalWatchersByPath.get(path);
    if (!watcher) return;

    if (countMonitorSubscribers(watcher.id) > 0) return;

    if (watcher.releasePromise) {
        await watcher.releasePromise;
        return;
    }

    watcher.releasePromise = (async () => {
        if (runtimeRef && contextRef) {
            try {
                const result = await runtimeRef.evaluate({
                    expression: `window.monitorUnwrap(${JSON.stringify(watcher.id)})`,
                    awaitPromise: true,
                    returnByValue: true,
                });
                if (result.exceptionDetails) {
                    log.error(`Error unsubscribing monitor ${watcher.id}:`, result.exceptionDetails.text);
                }
            } catch (err) {
                log.error(`Error unsubscribing monitor ${watcher.id}:`, err.message);
            }
        }

        // Only remove our own entry: rewrapAllWatchers may have replaced it
        // with a fresh watcher while the unwrap was in flight. A failed unwrap
        // still drops bookkeeping — a later subscribe re-wraps and the game
        // returns "Already watching this ID", which the subscribe path accepts.
        if (globalWatchersByPath.get(path) === watcher) {
            globalWatchersByPath.delete(path);
        }
    })();

    await watcher.releasePromise;
}

async function cleanupClientSubscriptions(ws) {
    clearAllMonitorSubscribeRetries(ws);

    const sendTimer = monitorSendTimers.get(ws);
    if (sendTimer) {
        clearTimeout(sendTimer);
        monitorSendTimers.delete(ws);
    }

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
                rewrapAllWatchers();
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

    // Routed purely by client subscription: entries exist before the wrap
    // evaluate resolves, so wrap()'s immediate initial broadcast is captured.
    for (const [ws, monitorMap] of clientMonitorState.entries()) {
        const entry = monitorMap.get(id);
        if (!entry) continue;

        delete entry.error;
        pushHistory(entry, value, ts);
        queueMonitorStateSend(ws);
    }
}

/**
 * The game reconnected with a fresh JS context: every previously installed
 * wrap is gone. Drop the stale bookkeeping and resubscribe all current client
 * subscriptions through the normal flow (its transient retries cover a game
 * that is still booting).
 */
function rewrapAllWatchers() {
    globalWatchersByPath.clear();

    for (const [ws, monitorMap] of clientMonitorState.entries()) {
        for (const entry of monitorMap.values()) {
            void handleMonitorSubscribe(ws, entry.path, 0, true);
        }
    }
}

/**
 * Ensures a game-side wrap exists for the path.
 * @param {string} path
 * @returns {Promise<{ ok: true, value?: any } | { ok: false, error: string, transient: boolean }>}
 *   `value` is only present when this call installed the wrap.
 */
async function ensureGlobalWatcher(path) {
    const id = monitorIdFromPath(path);

    let watcher = globalWatchersByPath.get(path);
    if (watcher?.releasePromise) {
        await watcher.releasePromise;
        watcher = globalWatchersByPath.get(path);
    }
    if (watcher) return { ok: true };

    const result = await runtimeRef.evaluate({
        expression: `window.monitorWrap(${JSON.stringify(id)}, ${JSON.stringify(path)})`,
        awaitPromise: true,
        returnByValue: true,
    });

    if (result.exceptionDetails) {
        const errorText = result.exceptionDetails.text;
        return { ok: false, error: errorText, transient: isTransientMonitorSubscribeError(errorText) };
    }

    const payload = result.result && result.result.value;
    if (payload && payload.success) {
        globalWatchersByPath.set(path, { id });
        return { ok: true, value: payload.value };
    }
    if (payload && payload.error === "Already watching this ID") {
        globalWatchersByPath.set(path, { id });
        return { ok: true };
    }

    const errorText = (payload && payload.error) || "monitorWrap failed";
    return { ok: false, error: errorText, transient: isTransientMonitorSubscribeError(errorText) };
}

/**
 * Handles subscription requests from a specific UI client.
 * Uses per-client monitor lists and shared global runtime hooks.
 * @param {WebSocket} ws
 * @param {string} path
 * @param {number} [retryAttempt]
 * @param {boolean} [forceAttempt] - Re-run the wrap even if a client entry already exists
 */
async function handleMonitorSubscribe(ws, path, retryAttempt = 0, forceAttempt = false) {
    if (!runtimeRef || !contextRef) return;
    if (typeof path !== "string" || !path.trim()) return;

    const normalizedPath = path.trim();
    const id = monitorIdFromPath(normalizedPath);
    const monitorMap = getClientMonitorMap(ws);
    const existing = monitorMap.get(id);

    if (existing && !existing.error && !forceAttempt) {
        sendMonitorStateToClient(ws);
        return;
    }

    // Optimistic entry (history preserved on rewrap): it also catches wrap()'s
    // initial broadcast, which can arrive before the evaluate below resolves.
    const entry = { path: normalizedPath, history: existing ? existing.history : [] };
    monitorMap.set(id, entry);

    try {
        const result = await ensureGlobalWatcher(normalizedPath);

        if (!result.ok) {
            if (result.transient) {
                log.debug(`Monitor subscribe pending for ${id}: ${result.error}`);
                scheduleMonitorSubscribeRetry(ws, normalizedPath, id, retryAttempt);
                return;
            }
            failMonitorSubscription(ws, id, result.error);
            return;
        }

        clearMonitorSubscribeRetry(ws, id);

        const current = clientMonitorState.get(ws)?.get(id);
        if (!current) {
            // Client unsubscribed (or disconnected) while the wrap was in flight.
            await releaseGlobalWatcher(normalizedPath);
            return;
        }
        if (current !== entry) return; // superseded by a newer subscribe

        if (entry.history.length === 0) {
            if (Object.prototype.hasOwnProperty.call(result, "value")) {
                pushHistory(entry, result.value);
            } else {
                await seedClientCurrentValue(ws, id, normalizedPath);
            }
        }
        sendMonitorStateToClient(ws);
    } catch (err) {
        if (isTransientMonitorSubscribeError(err.message)) {
            log.debug(`Monitor subscribe pending for ${id}: ${err.message}`);
            scheduleMonitorSubscribeRetry(ws, normalizedPath, id, retryAttempt);
            return;
        }
        failMonitorSubscription(ws, id, err.message);
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
        // Best-effort, non-blocking: awaiting a CDP evaluate during shutdown can
        // hang if the connection is already gone. We still inspect
        // exceptionDetails so a game-context failure is logged rather than lost.
        if (runtimeRef && contextRef) {
            void (async () => {
                try {
                    const result = await runtimeRef.evaluate({
                        expression: "window.monitorUnwrapAll()",
                        awaitPromise: true,
                        returnByValue: true,
                    });
                    if (result.exceptionDetails) {
                        log.error("Error unwrapping all monitors during shutdown:", result.exceptionDetails.text);
                    }
                } catch (err) {
                    log.error("Error unwrapping all monitors during shutdown:", err.message);
                }
            })();
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
        for (const timer of monitorSendTimers.values()) {
            clearTimeout(timer);
        }
        monitorSendTimers.clear();
        globalWatchersByPath.clear();
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
