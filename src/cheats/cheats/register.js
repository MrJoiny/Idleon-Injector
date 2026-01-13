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
 * - dangerous.js - wipe, class, lvl, etc.
 *
 * Static cheats auto-register on import.
 * Dynamic cheats require game data and must be registered via registerDynamicCheats().
 */

// Static cheat modules - registration happens at import time
import "./standalone.js";
import "./minigame.js";
import "./wide.js";
import "./worlds.js";
import "./godlike.js";
import "./multiply.js";
import "./dangerous.js";

// Dynamic cheat modules - need explicit registration with game context
import { registerUtilityCheats } from "./utility.js";
import { registerDynamicDangerousCheats } from "./dangerous.js";

/**
 * Register all dynamic cheats (those that need game to be ready).
 * @param {object} gameWindow - The game window context
 */
export function registerDynamicCheats(gameWindow) {
    registerUtilityCheats();
    registerDynamicDangerousCheats(gameWindow);
}
