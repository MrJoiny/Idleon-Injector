/**
 * Shared UI Utilities
 * Common functions used across multiple UI files
 */

/**
 * Debounce a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Get the config path parts for a cheat value.
 * Maps cheat command like "w1 owl" to path parts ["w1", "owl"].
 * @param {string} cheatValue - e.g., "w1 owl"
 * @returns {string[]|null} - Path parts or null if cheat doesn't map to config
 */
export function getCheatConfigPath(cheatValue) {
    if (!cheatValue) return null;

    const parts = cheatValue.split(" ");
    if (parts.length === 0) return null;

    return parts;
}

/**
 * Check if a config path exists in cheatConfig.
 * @param {string[]} pathParts - Path parts like ["w1", "owl"]
 * @param {object} cheatConfig - The cheatConfig object
 * @returns {boolean}
 */
export function configPathExists(pathParts, cheatConfig) {
    if (!pathParts || !cheatConfig) return false;

    let current = cheatConfig;
    for (const part of pathParts) {
        if (current === null || current === undefined) return false;
        if (typeof current !== "object") return false;
        if (!(part in current)) return false;
        current = current[part];
    }

    // Path exists if we reached a value (could be object, boolean, function, etc.)
    return current !== undefined;
}
