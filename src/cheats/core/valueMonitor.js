import { resolvePath } from "../utils/pathResolver.js";
import { webPort } from "./state.js";

/**
 * Value Monitor Module
 *
 * Intercepts sets to arbitrary game values and broadcasts them via WebSocket.
 */
class ValueMonitor {
    constructor() {
        /** @type {Map<string, { target: object, prop: string, original: PropertyDescriptor, path: string }>} */
        this.watchers = new Map();
        this.ws = null;
        this.lastUpdates = new Map(); // For throttling
        this.throttleMs = 50;
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

    /**
     * Wraps a value to monitor changes.
     * @param {string} id - Unique identifier
     * @param {string} path - Property path
     */
    wrap(id, path) {
        if (this.watchers.has(id)) {
            return { error: "Already watching this ID" };
        }

        const resolved = resolvePath(path);
        if (resolved.error) return resolved;

        const { target, prop } = resolved;
        const original = Object.getOwnPropertyDescriptor(target, prop);

        if (original && original.configurable === false) {
            return { error: "Property is not configurable" };
        }

        // Store the current value for simple data properties
        // For accessor properties, we delegate to the original getter/setter
        const hasOriginalAccessor = original && (original.get || original.set);
        let storedValue = hasOriginalAccessor ? undefined : target[prop];
        const getStoredValue = () => storedValue;

        const self = this;
        Object.defineProperty(target, prop, {
            get() {
                if (hasOriginalAccessor && original.get) {
                    return original.get.call(this);
                }
                return storedValue;
            },
            set(newVal) {
                let valueToReport;

                if (hasOriginalAccessor) {
                    if (original.set) {
                        original.set.call(this, newVal);
                    }
                    // For accessor properties, read from original getter to get actual value
                    valueToReport = original.get ? original.get.call(this) : newVal;
                } else {
                    storedValue = newVal;
                    valueToReport = newVal;
                }

                self.broadcast(id, valueToReport);
            },
            enumerable: original ? original.enumerable : true,
            configurable: true,
        });

        this.watchers.set(id, { target, prop, original, path, getStoredValue });
        console.log(`[ValueMonitor] Now watching: ${path} (id: ${id})`);

        const initialValue = hasOriginalAccessor && original.get ? original.get.call(target) : storedValue;
        this.broadcast(id, initialValue);

        return { success: true };
    }

    /**
     * Restores the original property descriptor.
     * @param {string} id - Unique identifier
     */
    unwrap(id) {
        const watcher = this.watchers.get(id);
        if (!watcher) return { error: "ID not found" };

        const { target, prop, original, getStoredValue } = watcher;

        if (original) {
            Object.defineProperty(target, prop, original);
        } else {
            const val = getStoredValue();
            delete target[prop];
            target[prop] = val;
        }

        this.watchers.delete(id);
        console.log(`[ValueMonitor] Unwatched: id ${id}`);
        return { success: true };
    }

    /**
     * Unwraps all watchers.
     */
    unwrapAll() {
        for (const id of this.watchers.keys()) {
            this.unwrap(id);
        }
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
