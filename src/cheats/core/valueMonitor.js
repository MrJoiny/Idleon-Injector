import { gga } from "./globals.js";
import { webPort } from "./state.js";

/**
 * Value Monitor Module
 *
 * Intercepts sets to arbitrary game values and broadcasts them via WebSocket.
 */
class ValueMonitor {
    constructor() {
        /** @type {Map<string, { target: object, prop: string, original: PropertyDescriptor|undefined, path: string, getStoredValue: (() => any) }>} */
        this.watchers = new Map();
        this.ws = null;
        this.lastUpdates = new Map();
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
            this.flushWatchers();
        };

        this.ws.onclose = () => {
            console.log("[ValueMonitor] Disconnected from server");
            this.ws = null;
            setTimeout(() => this.init(), 5000);
        };

        this.ws.onerror = (err) => {
            console.error("[ValueMonitor] WS error:", err);
        };
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

        if (segments[0] === "gga") {
            current = gga;
            segments.shift();
        } else if (segments[0] === "bEngine" && segments[1] === "gameAttributes") {
            current = gga;
            segments.shift();
            segments.shift();
        }

        for (let i = 0; i < segments.length - 1; i++) {
            const seg = segments[i];
            const nextSeg = segments[i + 1];

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

        if (this.watchers.has(id)) {
            return { error: "Already watching this ID" };
        }

        const resolved = this.resolvePath(path);
        if (resolved.error) return resolved;

        const { target, prop } = resolved;
        const original = Object.getOwnPropertyDescriptor(target, prop);

        if (original && original.configurable === false) {
            return { error: "Property is not configurable" };
        }

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
        this.init();

        const initialValue = hasOriginalAccessor && original.get ? original.get.call(target) : storedValue;
        this.broadcast(id, initialValue);

        console.log(`[ValueMonitor] Now watching: ${path} (id: ${id})`);
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
            const hasOriginalAccessor = original.get || original.set;
            if (hasOriginalAccessor) {
                Object.defineProperty(target, prop, original);
            } else {
                const value = getStoredValue();
                Object.defineProperty(target, prop, {
                    ...original,
                    value,
                });
            }
        } else {
            const value = getStoredValue();
            delete target[prop];
            target[prop] = value;
        }

        this.watchers.delete(id);
        this.lastUpdates.delete(id);

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

    getWatcherCurrentValue(watcher) {
        const { target, prop, original, getStoredValue } = watcher;
        const hasOriginalAccessor = original && (original.get || original.set);

        if (hasOriginalAccessor) {
            return original.get ? original.get.call(target) : target[prop];
        }

        return getStoredValue();
    }

    flushWatchers() {
        for (const [id, watcher] of this.watchers.entries()) {
            try {
                const value = this.getWatcherCurrentValue(watcher);
                this.broadcast(id, value);
            } catch {
                // Ignore one-off flush failures for specific watchers
            }
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
