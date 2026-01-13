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
} from "./standalone.js";
import { registerMinigameCheats } from "./minigame.js";
import { registerWideCheats } from "./wide.js";
import { registerWorldCheats } from "./worlds.js";
import { registerGodlikeCheats } from "./godlike.js";
import { registerMultiplyCheats } from "./multiply.js";
import { registerUtilityCheats } from "./utility.js";
import {
    registerDangerousCheats,
    registerDynamicDangerousCheats,
} from "./dangerous.js";

/**
 * Register all static cheats (those that don't need game to be ready).
 */
export function registerStaticCheats() {
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
 */
export function registerDynamicCheats(gameWindow) {
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
