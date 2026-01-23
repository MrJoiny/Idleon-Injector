/**
 * Deep Copy Utility
 *
 * Creates a deep clone of objects and arrays.
 * Handles plain objects and arrays without the overhead of JSON serialization.
 * Falls back to JSON.parse(JSON.stringify()) for other types.
 *
 * @param {any} obj - The value to deep copy
 * @returns {any} A deep copy of the input
 */
export const deepCopy = (obj) => {
    if (obj === null || typeof obj !== "object") {
        return obj;
    }

    if (obj instanceof Array) {
        return obj.map((item) => deepCopy(item));
    }

    if (obj.constructor === Object) {
        const copy = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = deepCopy(obj[key]);
            }
        }
        return copy;
    }

    try {
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        console.warn("deepCopy: Unable to copy object, returning original", e);
        return obj;
    }
};
