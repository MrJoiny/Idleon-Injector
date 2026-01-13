/**
 * Cheats Module - Main Entry Point
 *
 * This is the main entry point for the cheats module.
 * Functions and objects are exposed via window.* for runtime access.
 */

// Runtime-injected globals (defined by cheatInjection.js before this runs)

/* global startupCheats, cheatConfig, webPort */

// Import utilities

import { deepCopy } from "./utils/deepCopy.js";
import { createProxy } from "./utils/createProxy.js";
import { traverse } from "./utils/traverse.js";

// Import constants

import { summonUnits } from "./constants/summonUnits.js";
import { keychainStatsMap } from "./constants/keychainStats.js";
import { lootableItemTypes } from "./constants/lootableItems.js";
import { knownBundles } from "./constants/bundles.js";
import { blacklist_gga } from "./constants/blacklist.js";

// Import core - state

import { cheatState } from "./core/state.js";

// Import core - globals

import {
    getBEngine,
    getItemDefs,
    getMonsterDefs,
    getCList,
    getBehavior,
    getEvents,
    itemTypes,
} from "./core/globals.js";

// Import core - registration

import {
    cheats,
    cheat as coreCheat,
    registerCheat,
    registerCheats,
    updateCheatConfig,
} from "./core/registration.js";

// Import core - setup

import {
    setup as coreSetup,
    initSetup,
    setSetupAllProxies,
    setSetupFirebaseProxy,
    setInjectWebUI,
    setRegisterDynamicCheats,
} from "./core/setup.js";

// Import proxies
import { setupAllProxies } from "./proxies/setup.js";
import { setupFirebaseProxy } from "./proxies/firebase.js";

// Import cheats
import { registerStaticCheats, registerDynamicCheats } from "./cheats/register.js";

// Import helpers
import { initHelpers } from "./helpers/init.js";
import { dropOnChar } from "./helpers/dropOnChar.js";
import { rollAllObols } from "./helpers/obolRolling.js";

// Import UI
import { injectWebUI, setWebPort } from "./ui/overlay.js";

// Import API functions
import {
    getOptionsListAccount,
    setOptionsListAccountIndex,
    getOptionsListAccountIndex,
    cheatStateList,
} from "./api/stateAccessors.js";
import { getAutoCompleteSuggestions, getChoicesNeedingConfirmation } from "./api/suggestions.js";

// Initialize with runtime globals

// Initialize the setup module with runtime-injected config
// These globals are prepended by cheatInjection.js before this code runs
if (typeof cheatConfig !== "undefined") {
    initSetup(cheatConfig, typeof startupCheats !== "undefined" ? startupCheats : []);

    // Initialize helpers with config
    initHelpers(cheatConfig);

    // Register static cheats (don't need game to be ready)
    registerStaticCheats(cheatConfig);
}

// Initialize web port if available
if (typeof webPort !== "undefined") {
    setWebPort(webPort);
}

// Wire up dependency injection for proxies
// This allows the core setup module to call proxy setup without circular imports
// Wrap setupAllProxies to inject rollAllObols
setSetupAllProxies((context, config) => {
    setupAllProxies(context, config, rollAllObols);
});
setSetupFirebaseProxy(setupFirebaseProxy);
setInjectWebUI(injectWebUI);

// Wire up dynamic cheats registration with helpers
setRegisterDynamicCheats((gameWindow, options) => {
    registerDynamicCheats(gameWindow, {
        ...options,
        dropOnChar,
        rollAllObols,
    });
});

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
// These are assigned to window/global for access by cheatInjection.js and WebUI

if (typeof window !== "undefined") {
    // Core API
    window.cheat = cheat;
    window.setup = setup;
    window.updateCheatConfig = updateCheatConfig;
    window.registerCheat = registerCheat;
    window.registerCheats = registerCheats;

    // WebUI API
    window.getAutoCompleteSuggestions = getAutoCompleteSuggestions;
    window.getChoicesNeedingConfirmation = getChoicesNeedingConfirmation;
    window.getOptionsListAccount = getOptionsListAccount;
    window.setOptionsListAccountIndex = setOptionsListAccountIndex;
    window.getOptionsListAccountIndex = getOptionsListAccountIndex;
    window.cheatStateList = cheatStateList;

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
    window.itemTypes = itemTypes;

    // Utilities
    window.deepCopy = deepCopy;
    window.createProxy = createProxy;
    window.traverse = traverse;

    // Constants
    window.summonUnits = summonUnits;
    window.keychainStatsMap = keychainStatsMap;
    window.lootableItemTypes = lootableItemTypes;
    window.knownBundles = knownBundles;
    window.blacklist_gga = blacklist_gga;

    // Helpers
    window.dropOnChar = dropOnChar;
    window.rollAllObols = rollAllObols;

    // UI
    window.injectWebUI = injectWebUI;
}
