/**
 * Proxy Infrastructure Utility
 *
 * Consolidates all proxy-related utilities and high-level helpers into a single layer.
 * This file handles the "How" of proxying game functions and data structures.
 */

import { cheatState, cheatConfig } from "../core/state.js";
import { traverse } from "./traverse.js";

/**
 * Resolves a dot-notation path on an object (e.g., "w1.owl" -> obj.w1.owl).
 * @param {object} obj - The root object.
 * @param {string} path - The dot-separated path string.
 * @returns {any} The value at the path, or undefined.
 */
function resolvePath(obj, path) {
    if (!path) return undefined;
    return path.split(".").reduce((o, i) => o?.[i], obj);
}

/**
 * Method Proxy Utility
 *
 * Standardizes the "Base First" proxy pattern used across many cheats.
 * This pattern ensures that the original game logic is always executed first,
 * which is critical for maintaining game state and side-effects.
 * The handler then receives the original result and can modify it.
 *
 * @param {Object} target - The object containing the method to proxy (e.g., ActorEvents_579).
 * @param {string} methodName - Name of the method to proxy (e.g., "_customBlock_Summoning").
 * @param {Function} handler - Callback function: (baseResult, ...args) => newResult.
 *                             The `this` context from the original call is preserved.
 *
 * @example
 * createMethodProxy(ActorEvents12, "_customBlock_PlayerReach", (base, ...args) => {
 *     if (cheatState.godlike.reach) return 666;
 *     return base;
 * });
 */
export function createMethodProxy(target, methodName, handler) {
    const original = target[methodName];
    target[methodName] = function (...args) {
        const base = Reflect.apply(original, this, args);
        return handler.call(this, base, ...args);
    };
}

/**
 * Create Proxy Utility
 *
 * Creates a proxy for a specific property on an object, allowing custom getter and setter logic.
 * This is typically used for game constants or list elements (cList) rather than methods.
 * The original value is stored in a hidden property prefixed with an underscore (e.g., _ID).
 *
 * @param {object} targetObj - The object on which to create the proxy (e.g., itemDefs.Timecandy1.h).
 * @param {string | number} index - The name of the property to proxy (e.g., "ID").
 * @param {function(any): any | {get?: function(any): any, set?: function(any, string): void}} callback -
 *   A function to be used as a simple getter, or an object containing `get` and/or `set` methods.
 *   - Simple function: receives `originalValue`, returns `newValue`.
 *   - Object format: `get` receives `originalValue`; `set` receives `newValue` and `backupKey`.
 */
export function createProxy(targetObj, index, callback) {
    const backupKey = "_" + index;

    // Hidden backup value
    Object.defineProperty(targetObj, backupKey, {
        value: targetObj[index],
        writable: true,
        enumerable: false,
    });

    const isSimpleCallback = typeof callback === "function";

    Object.defineProperty(targetObj, index, {
        get: function () {
            const original = this[backupKey];
            if (isSimpleCallback) return callback(original);
            if (callback.get) return callback.get.call(this, original);
            return original;
        },

        set: function (value) {
            if (isSimpleCallback) return;
            if (callback.set) {
                callback.set.call(this, value, backupKey);
                return;
            }
            this[backupKey] = value;
        },
        enumerable: true,
        configurable: true,
    });
}

/**
 * Applies a list of config-based cheats to a method.
 * Reduces massive if/else chains where multiple cheats hook into the same method.
 *
 * @param {object} target - The object containing the method.
 * @param {string} methodName - The name of the method to proxy.
 * @param {Array<Mapping>} mappings - List of cheat mappings.
 *
 * @typedef {object} Mapping
 * @property {string} state - The path in `cheatState` to check if enabled (e.g. "w1.owl").
 * @property {string} [config] - The path in `cheatConfig` to look up the override. Defaults to `state`.
 * @property {any} [fixedKey] - If provided, the override only applies if `args[0] === fixedKey`.
 * @property {any} [value] - The value to return if `fixedKey` matches.
 */
export function createConfigLookupProxy(target, methodName, mappings) {
    createMethodProxy(target, methodName, (base, ...args) => {
        const key = args[0];

        for (const mapping of mappings) {
            const isEnabled = resolvePath(cheatState, mapping.state);
            if (!isEnabled) continue;

            if (mapping.fixedKey !== undefined && key === mapping.fixedKey) {
                return mapping.value;
            }

            const configPath = mapping.config ?? mapping.state;
            if (configPath) {
                const configGroup = resolvePath(cheatConfig, configPath);
                if (configGroup && configGroup[key]) {
                    return configGroup[key](base, args);
                }
            }
        }

        return base;
    });
}

/**
 * Nullifies costs (or sets other fixed values) in a cList data structure.
 * This helper automates the common pattern of traversing a game list (like MTXinfo or PrayerInfo)
 * and replacing specific indices with a fixed value (usually "0") when a cheat is enabled.
 *
 * @param {object} list - The root cList object to traverse.
 * @param {number} depth - The depth of nested arrays to traverse before reaching target objects.
 * @param {number|number[]|string} indices - The property key(s) or array index/indices to proxy.
 * @param {string} statePath - The dot-notation path in `cheatState` (e.g., "wide.mtx").
 * @param {any} [zeroValue="0"] - The value to return when enabled.
 */
export function nullifyListCost(list, depth, indices, statePath, zeroValue = "0") {
    traverse(list, depth, (data) => {
        const idxArray = Array.isArray(indices) ? indices : [indices];

        idxArray.forEach((index) => {
            createProxy(data, index, (original) => {
                if (resolvePath(cheatState, statePath)) return zeroValue;
                return original;
            });
        });
    });
}
