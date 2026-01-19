/**
 * Values Helper
 *
 * Common value calculations and state accessors used across multiple cheat files.
 */

import { cheatConfig } from "../core/state.js";

/**
 * Get a multiply value from cheatConfig, defaulting to 1 if not set.
 * @param {string} key - The key in cheatConfig.multiply
 * @returns {number} The multiplier value
 */
export const getMultiplyValue = (key) => cheatConfig?.multiply?.[key] ?? 1;

/**
 * Apply a maximum cap to a value, with optional NaN handling.
 * @param {number} value - The value to cap
 * @param {string} configKey - Key in cheatConfig.maxval
 * @param {boolean} handleNaN - Whether to replace NaN values with the cap
 * @returns {number} The capped value
 */
export function applyMaxCap(value, configKey, handleNaN = false) {
    if (handleNaN && isNaN(value)) {
        return cheatConfig.maxval[configKey];
    }
    return Math.min(cheatConfig.maxval[configKey], value);
}
