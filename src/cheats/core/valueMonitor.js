import { gga } from "./globals.js";
import { webPort } from "./state.js";

/**
 * Value Monitor Module
 *
 * Polls arbitrary game values and broadcasts updates via WebSocket.
 */
class ValueMonitor {
    constructor() {
        /** @type {Map<string, { path: string, hasLastValue: boolean, lastComparable: string }>} */
        this.watchers = new Map();
        this.ws = null;
        this.lastUpdates = new Map(); // For throttling
        this.throttleMs = 50;
        this.pollMs = 120;
        this.pollTimer = null;
    }

    /**
     * Initializes the WebSocket connection to the server.
     */
    init() {
        if (this.ws) return;

        this.ws = new WebSocket(`ws://localhost:${webPort}`);

        this.ws.onopen = () => {
            console.log("[ValueMonitor] Connected to server");
            this.ws.send(JSON.stringify({ type: "identify", clientType: "game" }));
            this.flushWatchers();
            this.ensurePolling();
        };

        this.ws.onclose = () => {
            console.log("[ValueMonitor] Disconnected from server");
            this.ws = null;
            // Attempt to reconnect after delay
            setTimeout(() => this.init(), 5000);
        };

        this.ws.onerror = (err) => {
            console.error("[ValueMonitor] WS error:", err);
        };
    }

    ensurePolling() {
        if (this.pollTimer) return;

        this.pollTimer = setInterval(() => {
            this.pollWatchers();
        }, this.pollMs);
    }

    stopPollingIfIdle() {
        if (this.watchers.size > 0 || !this.pollTimer) return;

        clearInterval(this.pollTimer);
        this.pollTimer = null;
    }

    /**
     * Parses a path string into segments, handling both dot notation and bracket notation.
     * e.g., "gga.ItemQuantity[13]" -> ["gga", "ItemQuantity", "13"]
     * e.g., "gga.PlayerDATABASE.h._1_.h.ItemQuantity[13]" -> ["gga", "PlayerDATABASE", "h", "_1_", "h", "ItemQuantity", "13"]
     * @param {string} path
     * @returns {string[]}
     */
    parsePath(path) {
        const segments = [];
        let current = "";

        for (let i = 0; i < path.length; i++) {
            const char = path[i];

            if (char === ".") {
                if (current) {
                    segments.push(current);
                    current = "";
                }
            } else if (char === "[") {
                if (current) {
                    segments.push(current);
                    current = "";
                }
            } else if (char === "]") {
                if (current) {
                    segments.push(current);
                    current = "";
                }
            } else {
                current += char;
            }
        }

        if (current) {
            segments.push(current);
        }

        return segments;
    }

    /**
     * Resolves a dotted path (supporting .h and bracket notation) into a target object and property.
     * @param {string} path - Path like "gga.GemsOwned" or "gga.ItemQuantity[13]"
     * @returns {{ target: object, prop: string } | { error: string }}
     */
    resolvePath(path) {
        if (!path) return { error: "Empty path" };

        const segments = this.parsePath(path);
        let current = window;

        // Handle "gga" shortcut if it's the first segment
        if (segments[0] === "gga") {
            current = gga;
            segments.shift();
        } else if (segments[0] === "bEngine" && segments[1] === "gameAttributes") {
            // Handle full path like "bEngine.gameAttributes.h.X"
            current = gga;
            segments.shift(); // remove "bEngine"
            segments.shift(); // remove "gameAttributes"
        }

        for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i];
            const nextSeg = segments[i + 1];

            // Only auto-unwrap .h if the next segment is NOT explicitly "h"
            // This prevents double-unwrapping when path already contains ".h."
            if (seg !== "h" && nextSeg !== "h" && current[seg] && current[seg].h) {
                current = current[seg].h;
            } else {
                current = current[seg];
            }

            if (current === null || current === undefined || typeof current !== "object") {
                return { error: `Cannot resolve path segment: ${seg}` };
            }
        }

        const prop = segments[segments.length - 1];
        if (current === null || current === undefined) {
            return { error: "Target object is null or undefined" };
        }

        return { target: current, prop };
    }

    /**
     * Wraps a value to monitor changes.
     * @param {string} id - Unique identifier
     * @param {string} path - Property path
     */
    wrap(id, path) {
        if (!id) return { error: "Missing monitor id" };
        if (!path) return { error: "Empty path" };

        const resolved = this.resolvePath(path);
        if (resolved.error) return resolved;

        const existing = this.watchers.get(id);
        if (existing) {
            existing.path = path;
            this.init();
            this.ensurePolling();
            this.pollWatcher(id, existing, true);
            return { success: true };
        }

        this.watchers.set(id, {
            path,
            hasLastValue: false,
            lastComparable: "",
        });

        this.init();
        this.ensurePolling();

        const watcher = this.watchers.get(id);
        this.pollWatcher(id, watcher, true);

        console.log(`[ValueMonitor] Now watching: ${path} (id: ${id})`);
        return { success: true };
    }

    /**
     * Stops watching a value path.
     * @param {string} id - Unique identifier
     */
    unwrap(id) {
        if (!this.watchers.has(id)) return { error: "ID not found" };

        this.watchers.delete(id);
        this.lastUpdates.delete(id);
        this.stopPollingIfIdle();

        console.log(`[ValueMonitor] Unwatched: id ${id}`);
        return { success: true };
    }

    /**
     * Unwraps all watchers.
     */
    unwrapAll() {
        for (const id of Array.from(this.watchers.keys())) {
            this.unwrap(id);
        }
    }

    toComparable(value) {
        if (value === undefined) return "undefined";
        if (value === null) return "null";

        const type = typeof value;

        if (type === "number") {
            if (Number.isNaN(value)) return "number:NaN";
            if (!Number.isFinite(value)) return value > 0 ? "number:Infinity" : "number:-Infinity";
            return "number:" + value;
        }

        if (type === "string" || type === "boolean" || type === "bigint" || type === "symbol") {
            return type + ":" + String(value);
        }

        if (type === "function") {
            return "function:" + String(value);
        }

        try {
            return "object:" + JSON.stringify(value);
        } catch {
            return "object:[unserializable]";
        }
    }

    readPathValue(path) {
        const resolved = this.resolvePath(path);
        if (resolved.error) return { error: resolved.error };

        try {
            return { value: resolved.target[resolved.prop] };
        } catch (err) {
            return { error: err?.message || "Failed to read value" };
        }
    }

    pollWatcher(id, watcher, force = false) {
        if (!watcher) return;

        const next = this.readPathValue(watcher.path);
        if (next.error) return;

        const comparable = this.toComparable(next.value);

        if (!force && watcher.hasLastValue && watcher.lastComparable === comparable) return;

        watcher.hasLastValue = true;
        watcher.lastComparable = comparable;
        this.broadcast(id, next.value);
    }

    pollWatchers(force = false) {
        if (this.watchers.size === 0) return;

        for (const [id, watcher] of this.watchers.entries()) {
            this.pollWatcher(id, watcher, force);
        }
    }

    flushWatchers() {
        this.pollWatchers(true);
    }

    /**
     * Broadcasts a value update via WebSocket with throttling.
     * @param {string} id
     * @param {any} value
     */
    broadcast(id, value) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const now = Date.now();
        const last = this.lastUpdates.get(id) || 0;

        if (now - last < this.throttleMs) {
            // Optional: Store the very last value to send after throttle expires
            return;
        }

        this.lastUpdates.set(id, now);

        try {
            this.ws.send(JSON.stringify({ type: "monitor-update", id, value, ts: now }));
        } catch (err) {
            console.error("[ValueMonitor] Failed to send update:", err);
        }
    }

    /**
     * Lists active watchers.
     */
    list() {
        const list = {};
        for (const [id, watcher] of this.watchers.entries()) {
            list[id] = watcher.path;
        }
        return list;
    }
}

export const monitor = new ValueMonitor();
