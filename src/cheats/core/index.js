/**
 * Core Module
 *
 * Contains the central cheat system:
 * - State management (cheatState)
 * - Game globals (bEngine, itemDefs, etc.)
 * - Cheat registration (registerCheat, registerCheats)
 * - Setup and initialization
 */

// State exports
export { cheatState, dictVals, setupDone, markSetupDone, resetSetupState } from "./state.js";

// Globals exports
export {
    bEngine,
    itemDefs,
    monsterDefs,
    CList,
    behavior,
    events,
    itemTypes,
    gameContext,
    gameReady,
    registerCommonVariables,
    getGameContext,
    isGameReady,
    // Accessor functions for late-bound values
    getBEngine,
    getItemDefs,
    getMonsterDefs,
    getCList,
    getBehavior,
    getEvents,
} from "./globals.js";

// Registration exports
export {
    cheats,
    cheat,
    registerCheat,
    registerCheats,
    updateCheatConfig,
    setSetupFunction,
    setCheatConfig,
    getCheatConfig,
    getCheats,
} from "./registration.js";

// Setup exports
export {
    setup,
    runStartupCheats,
    initSetup,
    setSetupAllProxies,
    setSetupFirebaseProxy,
    setInjectWebUI,
    setRegisterDynamicCheats,
} from "./setup.js";
