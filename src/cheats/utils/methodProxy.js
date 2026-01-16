/**
 * Method Proxy Utility
 *
 * Standardizes the "Base First" proxy pattern used across many cheats.
 *
 * @param {Object} target - The object containing the method to proxy.
 * @param {string} methodName - Name of the method to proxy.
 * @param {Function} handler - Callback function: (baseResult, ...args) => newResult.
 *                             The `this` context from the original call is preserved.
 */
export function createMethodProxy(target, methodName, handler) {
    const original = target[methodName];
    target[methodName] = function (...args) {
        const base = Reflect.apply(original, this, args);
        return handler.call(this, base, ...args);
    };
}
