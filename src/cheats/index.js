/**
 * Cheats Module - Main Entry Point
 *
 * This is the main entry point for the cheats module.
 * All exports from here will be available in the global scope after bundling.
 */

// Runtime-injected globals (defined by cheatInjection.js before this runs)

/* global startupCheats, cheatConfig, webPort */

// Import utilities and constants

import { deepCopy, createProxy, traverse } from "./utils/index.js";
import { summonUnits, keychainStatsMap, lootableItemTypes, knownBundles, blacklist_gga } from "./constants/index.js";

// Import core system

import {
    // State
    cheatState,
    dictVals,
    setupDone,
    // Globals (use accessor functions for late-bound values)
    getBEngine,
    getItemDefs,
    getMonsterDefs,
    getCList,
    getBehavior,
    getEvents,
    itemTypes,
    getGameContext,
    isGameReady,
    // Registration
    cheats,
    cheat as coreCheat,
    registerCheat,
    registerCheats,
    updateCheatConfig,
    getCheats,
    // Setup
    setup as coreSetup,
    initSetup,
    setSetupAllProxies,
    setSetupFirebaseProxy,
    setInjectWebUI,
    setRegisterDynamicCheats,
} from "./core/index.js";

// Import proxies
import { setupAllProxies, setupFirebaseProxy } from "./proxies/index.js";

// Import cheats
import { registerStaticCheats, registerDynamicCheats } from "./cheats/index.js";

// Import helpers
import { initHelpers, dropOnChar, rollAllObols } from "./helpers/index.js";

// Import UI
import { injectWebUI, setWebPort } from "./ui/index.js";

// Import API functions
import {
    getOptionsListAccount,
    setOptionsListAccountIndex,
    getOptionsListAccountIndex,
    cheatStateList,
    getAutoCompleteSuggestions,
    getChoicesNeedingConfirmation,
} from "./api/index.js";

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
export function cheat(action) {
    return coreCheat(action, this);
}

/**
 * Setup function - wraps coreSetup with proper context.
 * @returns {Promise<string>} Setup result message
 */
export async function setup() {
    return coreSetup.call(this);
}

// Re-export core functions

export { registerCheat, registerCheats, updateCheatConfig };
export { cheatState, cheats };
export { getBEngine, getItemDefs, getMonsterDefs, getCList, getBehavior, getEvents, itemTypes };
export { getGameContext, isGameReady };

// Legacy exports for backwards compatibility (these are getters that return current values)
export const bEngine = {
    get current() {
        return getBEngine();
    },
};
export const itemDefs = {
    get current() {
        return getItemDefs();
    },
};
export const monsterDefs = {
    get current() {
        return getMonsterDefs();
    },
};
export const CList = {
    get current() {
        return getCList();
    },
};
export const behavior = {
    get current() {
        return getBehavior();
    },
};
export const events = {
    get current() {
        return getEvents();
    },
};

// Re-export API functions

export {
    getOptionsListAccount,
    setOptionsListAccountIndex,
    getOptionsListAccountIndex,
    cheatStateList,
    getAutoCompleteSuggestions,
    getChoicesNeedingConfirmation,
};

// Re-export utilities and constants

export { deepCopy, createProxy, traverse };
export { summonUnits, keychainStatsMap, lootableItemTypes, knownBundles, blacklist_gga };

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
