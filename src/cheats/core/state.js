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
 * Dictionary for storing item/card definitions and other cached values.
 */
export const dictVals = {};

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
