/**
 * Proxy Context
 *
 * Shared configuration context for all proxy modules.
 * Eliminates repetitive config injection patterns across proxy files.
 *
 * Instead of each proxy file having:
 *   let cheatConfig = null;
 *   export function setCheatConfig(config) { cheatConfig = config; }
 *
 * They can import from here:
 *   import { getConfig } from "./proxyContext.js";
 *   // Then use getConfig() wherever cheatConfig was used
 */

let cheatConfig = null;

/**
 * Gets the current cheat configuration.
 * @returns {object|null} The cheat configuration object
 */
export function getConfig() {
    return cheatConfig;
}

/**
 * Sets the cheat configuration.
 * Called once during initialization from the main setup.
 * @param {object} config - The cheat configuration object
 */
export function setConfig(config) {
    cheatConfig = config;
}
