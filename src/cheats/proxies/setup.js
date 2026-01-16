/**
 * Proxies Module Index
 *
 * Central orchestrator for all game proxies.
 * Contains the unified setupAllProxies() function.
 */

// Imports for setupAllProxies
import { setupBehaviorScriptProxies } from "./behavior.js";
import { setupFirebaseProxy, setupFirebaseStorageProxy, setupSteamAchievementProxy } from "./firebase.js";
import { setupGameAttributeProxies } from "./gameAttributes.js";
import { setupCListProxy } from "./clist.js";
import { setupEvents012Proxies } from "./events012.js";
import { setupItemGetNotificationProxy } from "./events034.js";
import { setupEvents038Proxies } from "./events038.js";
import { setupAutoLootProxy } from "./events044.js";
import { setupEvents124Proxies } from "./events124.js";
import { setupEvents189Proxies } from "./events189.js";
import { setupItemsMenuProxy } from "./events312.js";
import { setupEvents345Proxies } from "./events345.js";
import { setupEvents481Proxies } from "./events481.js";
import { setupEvents579Proxies } from "./events579.js";
import { setupAbilityProxy, setupQuestProxy, setupSmithProxy } from "./misc.js";
import { setupItemProxies } from "./items.js";

/**
 * Setup all game proxies.
 *
 * This is the main entry point for proxy initialization.
 * Call this after the game is ready and common variables are registered.
 *
 * NOTE: Minigame proxies are NOT set up here - they are lazy-loaded on-demand
 * when a minigame cheat is activated, because the game objects might not
 * be ready at initial setup time.
 */
export function setupAllProxies() {
    // Behavior script proxies (RNG, timing, no damage)
    setupBehaviorScriptProxies();

    // Firebase proxy (character selection handling, companions, party, achievements)
    setupFirebaseProxy();
    setupFirebaseStorageProxy();
    setupSteamAchievementProxy();

    // Game attribute proxies (gems, HP, currencies, cloud save, trapping, alchemy)
    setupGameAttributeProxies();

    // CList proxies (MTX, refinery, vials, prayers)
    setupCListProxy();

    // ActorEvents proxies by event number
    setupEvents012Proxies();
    setupAutoLootProxy();
    setupItemGetNotificationProxy();
    setupEvents038Proxies();
    setupEvents124Proxies();
    setupEvents189Proxies();
    setupItemsMenuProxy();
    setupEvents345Proxies();
    setupEvents481Proxies();
    setupEvents579Proxies();

    // Misc proxies (abilities, quests, smithing)
    setupAbilityProxy();
    setupQuestProxy();
    setupSmithProxy();

    // Item definition proxies (godlike speed, upstones, equipall, candytime)
    setupItemProxies();
}
