/**
 * Cheats Module - Command Definitions
 *
 * Contains all cheat command registrations organized by category:
 * - standalone.js - drop, spawn, daily, etc.
 * - minigame.js - minigame cheats
 * - wide.js - account-wide cheats
 * - worlds.js - w1-w7 cheats
 * - godlike.js - godlike powers
 * - multiply.js - stat multipliers
 * - utility.js - search, list, gga, etc.
 * - dangerous.js - wipe, class, lvl, etc.
 */

// Import all cheat registration functions
import {
    registerStandaloneCheats,
    setCheatConfig as setStandaloneConfig,
    setDropOnChar as setStandaloneDropOnChar,
} from "./standalone.js";
import { registerMinigameCheats } from "./minigame.js";
import { registerWideCheats, setCheatConfig as setWideConfig, setRollAllObols } from "./wide.js";
import { registerWorldCheats, setCheatConfig as setWorldConfig } from "./worlds.js";
import { registerGodlikeCheats } from "./godlike.js";
import { registerMultiplyCheats } from "./multiply.js";
import { registerUtilityCheats } from "./utility.js";
import {
    registerDangerousCheats,
    registerDynamicDangerousCheats,
    setCheatConfig as setDangerousConfig,
    setDropOnChar as setDangerousDropOnChar,
} from "./dangerous.js";

/**
 * Register all static cheats (those that don't need game to be ready).
 * @param {object} cheatConfig - The cheat configuration object
 */
export function registerStaticCheats(cheatConfig) {
    // Set config references
    setStandaloneConfig(cheatConfig);
    setWideConfig(cheatConfig);
    setWorldConfig(cheatConfig);
    setDangerousConfig(cheatConfig);

    // Register static cheats
    registerStandaloneCheats();
    registerMinigameCheats();
    registerWideCheats();
    registerWorldCheats();
    registerGodlikeCheats();
    registerMultiplyCheats();
    registerDangerousCheats();
}

/**
 * Register all dynamic cheats (those that need game to be ready).
 * @param {object} gameWindow - The game window context
 * @param {object} options - Additional options
 * @param {function} options.dropOnChar - Function to drop items on character
 * @param {function} options.rollAllObols - Function to roll all obols
 */
export function registerDynamicCheats(gameWindow, options = {}) {
    // Set function references for both standalone and dangerous cheats
    if (options.dropOnChar) {
        setStandaloneDropOnChar(options.dropOnChar);
        setDangerousDropOnChar(options.dropOnChar);
    }
    if (options.rollAllObols) {
        setRollAllObols(options.rollAllObols);
    }

    // Register dynamic cheats
    registerUtilityCheats();
    registerDynamicDangerousCheats(gameWindow);
}

// Re-export for convenience
export { registerStandaloneCheats } from "./standalone.js";
export { registerMinigameCheats } from "./minigame.js";
export { registerWideCheats } from "./wide.js";
export { registerWorldCheats } from "./worlds.js";
export { registerGodlikeCheats } from "./godlike.js";
export { registerMultiplyCheats } from "./multiply.js";
export { registerUtilityCheats } from "./utility.js";
export { registerDangerousCheats, registerDynamicDangerousCheats } from "./dangerous.js";
