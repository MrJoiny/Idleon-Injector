/**
 * Cheats Module - Main Entry Point
 *
 * This is the main entry point for the cheats module.
 * Functions and objects are exposed via window.* for runtime access.
 */

// Runtime-injected globals (defined by cheatInjection.js before this runs)

/* global startupCheats, cheatConfig, webPort */
if (!startupCheats || !cheatConfig || !webPort || !window) {
    throw new Error("cheatConfig, startupCheats, webPort and window must be defined!");
}

import { cheatState, setCheatConfig, setStartupCheats, setWebPort } from "./core/state.js";
import { getBEngine, getItemDefs, getMonsterDefs, getCList, getBehavior, getEvents } from "./core/globals.js";
import { cheats, cheat as coreCheat, updateCheatConfig } from "./core/registration.js";
import { setup as coreSetup } from "./core/setup.js";
// Static cheats register automatically when this module is imported
import "./cheats/register.js";
import { getOLA, setOLAIndex, getcheatStateList } from "./api/stateAccessors.js";
import { getAutoCompleteSuggestions, getChoicesNeedingConfirmation } from "./api/suggestions.js";

// Sets the config, startup and webport from glob to internal state
setCheatConfig(cheatConfig);
setStartupCheats(startupCheats);
setWebPort(webPort);

// Wrapper functions for global context binding

/**
 * Main cheat dispatcher - wraps coreCheat with proper context.
 * @param {string} action - The cheat command to execute
 * @returns {string} Result message
 */
function cheat(action) {
    return coreCheat(action, this);
}

/**
 * Setup function - wraps coreSetup with proper context.
 * @returns {Promise<string>} Setup result message
 */
async function setup() {
    return coreSetup.call(this);
}

// Global Exports
// These are assigned to window/global for access by CDP

// Core API
window.cheat = cheat;
window.setup = setup;
window.updateCheatConfig = updateCheatConfig;

// WebUI API
window.getAutoCompleteSuggestions = getAutoCompleteSuggestions;
window.getChoicesNeedingConfirmation = getChoicesNeedingConfirmation;
window.getOptionsListAccount = getOLA;
window.setOptionsListAccountIndex = setOLAIndex;
// window.getOptionsListAccountIndex = getOptionsListAccountIndex;
window.cheatStateList = getcheatStateList;

// State objects
window.cheats = cheats;
window.cheatState = cheatState;

// Game references (for debugging/advanced use)
// Use getters so these reflect current values after game is ready
Object.defineProperty(window, "bEngine", { get: getBEngine, enumerable: true, configurable: true });
Object.defineProperty(window, "itemDefs", { get: getItemDefs, enumerable: true, configurable: true });
Object.defineProperty(window, "monsterDefs", { get: getMonsterDefs, enumerable: true, configurable: true });
Object.defineProperty(window, "CList", { get: getCList, enumerable: true, configurable: true });
Object.defineProperty(window, "behavior", { get: getBehavior, enumerable: true, configurable: true });
Object.defineProperty(window, "events", { get: getEvents, enumerable: true, configurable: true });
