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

/** @type {Map<string, { path: string, formattedValue: string, type: string, monitorEnabled: boolean, value?: any, lastLiveRaw?: any, lastLiveFormatted?: string, lastLiveType?: string, lastHistory?: Array<{ value: any, ts: number }> }>} */
const savedListState = new Map();

/** @type {Object|null} CDP Runtime reference for fetching cheat states */
let runtimeRef = null;

/** @type {string|null} Game context expression */
let contextRef = null;

function formatMonitorValue(value) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return "'" + value + "'";
    if (typeof value === "object") return "[obj]";
    return String(value);
}

function getUiTypeFromRawValue(value, fallback = "string") {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "string") return "string";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    return fallback;
}

function getSavedPathFromMonitorPath(path) {
    if (typeof path !== "string") return "";
    return path.startsWith("gga.") ? path.slice(4) : path;
}

function normalizeSavedEntry(entry) {
    if (!entry || typeof entry !== "object" || typeof entry.path !== "string" || !entry.path) {
        return null;
    }

    const normalized = {
        path: entry.path,
        formattedValue: typeof entry.formattedValue === "string" ? entry.formattedValue : "",
        type: typeof entry.type === "string" ? entry.type : "undefined",
        monitorEnabled: entry.monitorEnabled !== false,
    };

    if (Object.prototype.hasOwnProperty.call(entry, "value")) {
        normalized.value = entry.value;
    }

    if (Object.prototype.hasOwnProperty.call(entry, "lastLiveRaw")) {
        normalized.lastLiveRaw = entry.lastLiveRaw;
    }

    if (typeof entry.lastLiveFormatted === "string") {
        normalized.lastLiveFormatted = entry.lastLiveFormatted;
    }

    if (typeof entry.lastLiveType === "string") {
        normalized.lastLiveType = entry.lastLiveType;
    }

    if (Array.isArray(entry.lastHistory)) {
        normalized.lastHistory = entry.lastHistory
            .filter((point) => point && typeof point === "object" && typeof point.ts === "number")
            .slice(0, HISTORY_LIMIT)
            .map((point) => ({ value: point.value, ts: point.ts }));
    }

    return normalized;
}

function setSavedEntry(path, updater) {
    const previous = savedListState.get(path) || null;
    const next = updater(previous);
    if (!next) {
        savedListState.delete(path);
        return previous !== null;
    }

    const normalized = normalizeSavedEntry(next);
    if (!normalized) return false;

    const before = previous ? JSON.stringify(previous) : "";
    const after = JSON.stringify(normalized);
    savedListState.set(path, normalized);
    return before !== after;
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
        ws.clientType = "ui"; // Default to UI, game will re-identify
        log.debug(`WS client connected (${clients.size} total)`);

        // Push current state immediately on connection
        sendCheatStatesToClient(ws);
        sendMonitorStateToClient(ws);
        sendSavedListStateToClient(ws);

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
            if (msg.clientType === "game") {
                await broadcastCheatStates();
                broadcastMonitorState();
            }
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

        case "saved-list-sync":
            handleSavedListSync(msg.entries);
            break;

        case "saved-list-event":
            handleSavedListEvent(msg.event);
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

    const savedPath = getSavedPathFromMonitorPath(state.path);
    if (savedPath && savedListState.has(savedPath)) {
        setSavedEntry(savedPath, (previous) => {
            const base = previous || {
                path: savedPath,
                formattedValue: formatMonitorValue(value),
                type: getUiTypeFromRawValue(value, "undefined"),
                monitorEnabled: true,
            };

            return {
                ...base,
                monitorEnabled: base.monitorEnabled,
                value,
                type: getUiTypeFromRawValue(value, base.type),
                formattedValue: formatMonitorValue(value),
                lastLiveRaw: value,
                lastLiveFormatted: formatMonitorValue(value),
                lastLiveType: getUiTypeFromRawValue(value, base.type),
                lastHistory: state.history.slice(0, HISTORY_LIMIT),
            };
        });
    }

    broadcastMonitorState();
    broadcastSavedListState();
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

        const payload = result.result.value || {};

        if (payload.success) {
            // State already exists, just broadcast
            const savedPath = getSavedPathFromMonitorPath(path);
            if (savedPath) {
                setSavedEntry(savedPath, (previous) => {
                    if (!previous) return null;

                    const liveHistory = monitorState.get(id)?.history || [];
                    const latest = liveHistory[0];

                    if (latest) {
                        return {
                            ...previous,
                            monitorEnabled: true,
                            value: latest.value,
                            formattedValue: formatMonitorValue(latest.value),
                            type: getUiTypeFromRawValue(latest.value, previous.type || "undefined"),
                            lastLiveRaw: latest.value,
                            lastLiveFormatted: formatMonitorValue(latest.value),
                            lastLiveType: getUiTypeFromRawValue(latest.value, previous.type || "undefined"),
                            lastHistory: liveHistory.slice(0, HISTORY_LIMIT),
                        };
                    }

                    return {
                        ...previous,
                        monitorEnabled: true,
                    };
                });
            }

            broadcastMonitorState();
            broadcastSavedListState();
        } else if (payload.error) {
            const errorText = String(payload.error);

            if (errorText.includes("Already watching this ID")) {
                const existing = monitorState.get(id);
                if (existing) {
                    existing.path = path;
                } else {
                    monitorState.set(id, { path, history: [] });
                }
                const savedPath = getSavedPathFromMonitorPath(path);
                if (savedPath) {
                    setSavedEntry(savedPath, (previous) => ({
                        ...previous,
                        monitorEnabled: true,
                    }));
                }
                broadcastMonitorState();
                broadcastSavedListState();
                return;
            }

            log.error(`Monitor subscribe error for ${id}:`, payload.error);
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
        const existing = monitorState.get(id);

        await runtimeRef.evaluate({
            expression: `window.monitorUnwrap("${id}")`,
            awaitPromise: true,
            returnByValue: true,
        });

        monitorState.delete(id);

        const savedPath = getSavedPathFromMonitorPath(existing?.path);
        if (savedPath && savedListState.has(savedPath)) {
            setSavedEntry(savedPath, (previous) => {
                if (!previous) return null;
                return {
                    ...previous,
                    monitorEnabled: false,
                };
            });
        }

        broadcastMonitorState();
        broadcastSavedListState();
    } catch (err) {
        log.error(`Error unsubscribing monitor ${id}:`, err.message);
    }
}

function mergeSavedEntry(previous, incoming) {
    const merged = {
        ...previous,
        ...incoming,
    };

    merged.monitorEnabled = previous ? previous.monitorEnabled : incoming.monitorEnabled;

    if (previous && !Object.prototype.hasOwnProperty.call(incoming, "value") && Object.prototype.hasOwnProperty.call(previous, "value")) {
        merged.value = previous.value;
    }

    if (previous && !Object.prototype.hasOwnProperty.call(incoming, "lastLiveRaw") && Object.prototype.hasOwnProperty.call(previous, "lastLiveRaw")) {
        merged.lastLiveRaw = previous.lastLiveRaw;
    }

    if (previous && typeof incoming.lastLiveFormatted !== "string" && typeof previous.lastLiveFormatted === "string") {
        merged.lastLiveFormatted = previous.lastLiveFormatted;
    }

    if (previous && typeof incoming.lastLiveType !== "string" && typeof previous.lastLiveType === "string") {
        merged.lastLiveType = previous.lastLiveType;
    }

    const prevHistory = Array.isArray(previous?.lastHistory) ? previous.lastHistory : [];
    const nextHistory = Array.isArray(incoming.lastHistory) ? incoming.lastHistory : [];
    if (nextHistory.length === 0 && prevHistory.length > 0) {
        merged.lastHistory = prevHistory;
    } else if (nextHistory.length > 0 && prevHistory.length > 0) {
        const prevTs = prevHistory[0]?.ts || 0;
        const nextTs = nextHistory[0]?.ts || 0;
        merged.lastHistory = nextTs >= prevTs ? nextHistory : prevHistory;
    }

    return merged;
}

function handleSavedListSync(entries) {
    if (!Array.isArray(entries)) return;

    let changed = false;

    for (const rawEntry of entries) {
        const entry = normalizeSavedEntry(rawEntry);
        if (!entry) continue;

        const previous = savedListState.get(entry.path);
        const next = previous ? mergeSavedEntry(previous, entry) : entry;
        const before = previous ? JSON.stringify(previous) : "";
        const after = JSON.stringify(next);

        if (before !== after) {
            savedListState.set(entry.path, next);
            changed = true;
        }
    }

    if (changed) {
        broadcastSavedListState();
    }
}

function handleSavedListEvent(event) {
    if (!event || typeof event !== "object") return;

    let changed = false;

    if (event.action === "upsert") {
        const entry = normalizeSavedEntry(event.entry);
        if (!entry) return;

        const previous = savedListState.get(entry.path);
        const next = previous ? mergeSavedEntry(previous, entry) : entry;
        const before = previous ? JSON.stringify(previous) : "";
        const after = JSON.stringify(next);

        if (before !== after) {
            savedListState.set(entry.path, next);
            changed = true;
        }
    }

    if (event.action === "remove" && typeof event.path === "string" && event.path) {
        changed = savedListState.delete(event.path) || changed;
    }

    if (event.action === "clear") {
        changed = savedListState.size > 0;
        savedListState.clear();
    }

    if (event.action === "set-monitor-enabled" && typeof event.path === "string" && event.path) {
        const enabled = event.enabled === true;
        changed =
            setSavedEntry(event.path, (previous) => {
                if (!previous) {
                    if (!enabled) return null;
                    return {
                        path: event.path,
                        formattedValue: "undefined",
                        type: "undefined",
                        monitorEnabled: enabled,
                    };
                }

                return {
                    ...previous,
                    monitorEnabled: enabled,
                };
            }) || changed;
    }

    if (changed) {
        broadcastSavedListState();
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

function sendSavedListStateToClient(ws) {
    const data = Array.from(savedListState.values()).sort((a, b) => a.path.localeCompare(b.path));
    const message = JSON.stringify({
        type: "saved-list-state",
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

function broadcastSavedListState() {
    const uiClients = Array.from(clients).filter((c) => c.clientType === "ui");
    if (uiClients.length === 0) return;

    const data = Array.from(savedListState.values()).sort((a, b) => a.path.localeCompare(b.path));
    const message = JSON.stringify({
        type: "saved-list-state",
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
        monitorState.clear();
        savedListState.clear();
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
