/**
 * State Accessors API
 *
 * Functions for accessing and modifying game state:
 * - OptionsListAccount access
 * - cheatState access
 */

import { bEngine } from "../core/globals.js";
import { cheatState } from "../core/state.js";

/**
 * Helper to get OptionsListAccount safely.
 * @returns {Array|null}
 */
function getOLA() {
    return bEngine?.gameAttributes?.h?.OptionsListAccount ?? null;
}

/**
 * Get the OptionsListAccount array.
 * @returns {Array|null}
 */
export function getOptionsListAccount() {
    return getOLA();
}

/**
 * Set a value at a specific index in OptionsListAccount.
 * @param {number} index
 * @param {any} value
 * @returns {any|null}
 */
export function setOptionsListAccountIndex(index, value) {
    const ola = getOLA();
    if (ola) {
        ola[index] = value;
        return ola[index];
    }
    return null;
}

/**
 * Get a value at a specific index in OptionsListAccount.
 * @param {number} index
 * @returns {any|null}
 */
export function getOptionsListAccountIndex(index) {
    return getOLA()?.[index] ?? null;
}

/**
 * Get the cheatState object.
 * @returns {object}
 */
export function cheatStateList() {
    return cheatState;
}
