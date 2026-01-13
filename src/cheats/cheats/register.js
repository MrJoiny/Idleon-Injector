/**
 * Cheats Module - Command Definitions
 *
 * Contains all cheat command registrations organized by category:
 * - standalone.js - drop, spawn, daily, etc.
 * - minigame.js - minigame cheats
 * - wide.js - account-wide cheats, buy
 * - worlds.js - w1-w7 cheats
 * - godlike.js - godlike powers
 * - multiply.js - stat multipliers
 * - dangerous.js - wipe, class, lvl, bulk, chng, qnty
 * - utility.js - search, list, gga, cheats
 *
 * All cheats auto-register on import.
 */

// Cheat modules - registration happens at import time
import "./standalone.js";
import "./minigame.js";
import "./wide.js";
import "./worlds.js";
import "./godlike.js";
import "./multiply.js";
import "./dangerous.js";
import "./utility.js";
