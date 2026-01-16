/**
 * Core State Module
 *
 * Contains the cheatState object that tracks which cheats are enabled.
 * The structure mirrors the cheat registration hierarchy.
 */

/**
 * Central state object for tracking cheat activation.
 * Properties are populated by registerCheats() as cheats are registered.
 *
 * Structure mirrors the cheat command hierarchy:
 * - cheatState.unlock.portals (boolean)
 * - cheatState.w3.mobdeath (boolean)
 * - cheatState.multiply.damage (boolean)
 * etc.
 */
export const cheatState = {};

/**
 * The cheat configuration object (injected at runtime).
 * @type {object|null}
 */
export let cheatConfig = null;
export let startupCheats = [];
export let webPort = null;

/**
 * Set the cheat config.
 * @param {object} config - The config object
 */
export function setCheatConfig(config) {
    cheatConfig = config;
}
/**
 * Update cheat configuration from external source.
 *
 * @param {object} newConfig - New configuration to merge
 */
export function updateCheatConfig(newConfig) {
    for (const key in newConfig) {
        if (Object.hasOwnProperty.call(newConfig, key)) {
            cheatConfig[key] = newConfig[key];
        }
    }
}
/**
 * Set the startup cheats.
 * @param {string[]} cheats - Array of cheat commands
 */
export function setStartupCheats(cheats) {
    startupCheats = cheats || [];
}

/**
 * Set the web port.
 * @param {number} port - The web port
 */
export function setWebPort(port) {
    webPort = port;
}

/**
 * Flag indicating whether setup has completed.
 */
export let setupDone = false;

/**
 * Mark setup as complete.
 */
export function markSetupDone() {
    setupDone = true;
}

/**
 * Reset setup state (used for re-initialization).
 */
export function resetSetupState() {
    setupDone = false;
}
