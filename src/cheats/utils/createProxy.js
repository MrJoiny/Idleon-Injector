/**
 * Create Proxy Utility
 *
 * Creates a proxy for a specific property on an object, allowing custom getter and setter logic.
 * The original value is stored in a hidden property prefixed with an underscore.
 *
 * @param {object} targetObj - The object on which to create the proxy.
 * @param {string | number} index - The name of the property to proxy.
 * @param {function(any): any | {get?: function(any): any, set?: function(any, string): void}} callback -
 *   A function to be used as a simple getter, or an object containing `get` and/or `set` methods
 *   to define custom behavior for property access.
 *
 * @example
 * // Simple getter-only proxy
 * createProxy(obj, "value", (original) => original * 2);
 *
 * @example
 * // Full get/set proxy
 * createProxy(obj, "value", {
 *     get: function(original) { return original * 2; },
 *     set: function(value, backupKey) { this[backupKey] = value; }
 * });
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
