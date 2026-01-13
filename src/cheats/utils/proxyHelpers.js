/**
 * Proxy Helpers
 *
 * Higher-level utilities for creating config-driven proxies.
 * Used to simplify repetitive proxy setup patterns in event files.
 */

/**
 * Creates a config-driven proxy that checks state and applies config transformers.
 * Replaces the target function with a wrapper that conditionally applies transformations.
 *
 * @param {object} target - Object containing the function to proxy
 * @param {string} prop - Name of the function to proxy
 * @param {function(): boolean} stateGetter - Returns boolean indicating if cheat is active
 * @param {function(): object} configGetter - Returns config object with transform functions
 *
 * @example
 * createConfigProxy(actorEvents579, "_customBlock_Summoning",
 *     () => cheatState.w1.owl,
 *     () => cheatConfig.w1.owl
 * );
 */
export function createConfigProxy(target, prop, stateGetter, configGetter) {
    const original = target[prop];
    target[prop] = function (...args) {
        if (stateGetter() && configGetter()?.hasOwnProperty?.(args[0])) {
            return configGetter()[args[0]](Reflect.apply(original, this, args));
        }
        return Reflect.apply(original, this, args);
    };
}

/**
 * Chains multiple config-driven proxies on the same function.
 * Each proxy in the chain can conditionally intercept and transform the result.
 *
 * @param {object} target - Object containing the function to proxy
 * @param {string} prop - Name of the function to proxy
 * @param {Array<{stateGetter: function, configGetter?: function, handler?: function}>} proxies
 *   - stateGetter: Returns boolean indicating if this proxy is active
 *   - configGetter: Returns config object with transform functions (optional if handler provided)
 *   - handler: Custom handler function (args, callOriginal) => result (optional)
 *
 * @example
 * chainProxies(actorEvents579, "_customBlock_Summoning", [
 *     { stateGetter: () => cheatState.w1.owl, configGetter: () => cheatConfig.w1.owl },
 *     { stateGetter: () => cheatState.w2.roo, configGetter: () => cheatConfig.w2.roo },
 *     { stateGetter: () => cheatState.w6.endless, handler: (args, callOriginal) =>
 *         args[0] === "EndlessModifierID" ? 1 : undefined },
 * ]);
 */
export function chainProxies(target, prop, proxies) {
    for (const { stateGetter, configGetter, handler } of proxies) {
        const original = target[prop];
        target[prop] = function (...args) {
            if (handler) {
                const result = handler(args, () => Reflect.apply(original, this, args));
                if (result !== undefined) return result;
            } else if (stateGetter() && configGetter?.()?.hasOwnProperty?.(args[0])) {
                return configGetter()[args[0]](Reflect.apply(original, this, args));
            }
            return Reflect.apply(original, this, args);
        };
    }
}

/**
 * Creates a simple toggle proxy for game attributes.
 * Returns a custom value when cheat is active, otherwise returns original.
 *
 * @param {function(): boolean} stateGetter - Returns boolean indicating if cheat is active
 * @param {function(): any} valueGetter - Returns the value to use when cheat is active
 * @returns {{get: function, set: function}} Proxy handlers for createProxy
 *
 * @example
 * createProxy(optionsListAccount, 26, createToggleProxy(
 *     () => cheatState.unban,
 *     () => 0
 * ));
 */
export function createToggleProxy(stateGetter, valueGetter) {
    return {
        get: function (original) {
            if (stateGetter()) return valueGetter();
            return original;
        },
        set: function (value, backupKey) {
            if (stateGetter()) return;
            this[backupKey] = value;
        },
    };
}

/**
 * Creates a proxy that applies a multiplier when cheat is active.
 *
 * @param {function(): boolean} stateGetter - Returns boolean indicating if cheat is active
 * @param {function(): number} multiplierGetter - Returns the multiplier value
 * @returns {{get: function, set: function}} Proxy handlers for createProxy
 *
 * @example
 * createProxy(gameAttr, index, createMultiplierProxy(
 *     () => cheatState.wide.damage,
 *     () => cheatConfig.wide.damage
 * ));
 */
export function createMultiplierProxy(stateGetter, multiplierGetter) {
    return {
        get: function (original) {
            if (stateGetter()) {
                const multiplier = multiplierGetter();
                if (typeof multiplier === "function") return multiplier(original);
                if (typeof multiplier === "number") return original * multiplier;
            }
            return original;
        },
        set: function (value, backupKey) {
            this[backupKey] = value;
        },
    };
}
