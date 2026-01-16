/**
 * Proxies Module Index
 *
 * Central orchestrator for all game proxies.
 * Exports setup functions and a unified setupAllProxies() function.
 */

// Re-export from behavior.js
export { setupBehaviorScriptProxies, setupNodmgProxy } from "./behavior.js";

// Re-export from firebase.js
export { setupFirebaseProxy, setupFirebaseStorageProxy, setupSteamAchievementProxy } from "./firebase.js";

// Re-export from gameAttributes.js
export { setupGameAttributeProxies, setupTrappingProxy, setupAlchProxy } from "./gameAttributes.js";

// Re-export from clist.js
export { setupCListProxy } from "./clist.js";

// Re-export from events012.js
export { setupEvents012Proxies } from "./events012.js";

// Re-export from events034.js
export { setupItemGetNotificationProxy } from "./events034.js";

// Re-export from events038.js
export { setupItemMoveProxy, setupItemMiscProxy } from "./events038.js";

// Re-export from events044.js
export { setupAutoLootProxy } from "./events044.js";

// Re-export from events124.js
export { setupEvents124Proxies } from "./events124.js";

// Re-export from events189.js
export { setupEvents189Proxies } from "./events189.js";

// Re-export from events312.js
export { setupItemsMenuProxy } from "./events312.js";

// Re-export from events345.js
export { setupEvents345Proxies } from "./events345.js";

// Re-export from events481.js
export { setupEvents481Proxies } from "./events481.js";

// Re-export from events579.js
export { setupEvents579Proxies } from "./events579.js";

// Re-export from minigames.js
export {
    setupMiningFishingProxies,
    setupCatchingMinigameProxy,
    setupChoppingMinigameProxy,
    setupPoingMinigameProxy,
    setupScratchMinigameProxy,
    setupHoopsDartsProxies,
    setupWisdomMonumentProxy,
    setupMinigameProxies,
} from "./minigames.js";

// Re-export from misc.js
export { setupAbilityProxy, setupTimeCandyProxy, setupQuestProxy, setupSmithProxy } from "./misc.js";

// Imports for setupAllProxies
import { setupBehaviorScriptProxies, setupNodmgProxy } from "./behavior.js";
import { setupFirebaseProxy, setupFirebaseStorageProxy, setupSteamAchievementProxy } from "./firebase.js";
import { setupGameAttributeProxies, setupTrappingProxy, setupAlchProxy } from "./gameAttributes.js";
import { setupCListProxy } from "./clist.js";
import { setupEvents012Proxies } from "./events012.js";
import { setupItemGetNotificationProxy } from "./events034.js";
import { setupItemMoveProxy, setupItemMiscProxy } from "./events038.js";
import { setupAutoLootProxy } from "./events044.js";
import { setupEvents124Proxies } from "./events124.js";
import { setupEvents189Proxies } from "./events189.js";
import { setupItemsMenuProxy } from "./events312.js";
import { setupEvents345Proxies } from "./events345.js";
import { setupEvents481Proxies } from "./events481.js";
import { setupEvents579Proxies } from "./events579.js";
import { setupAbilityProxy, setupTimeCandyProxy, setupQuestProxy, setupSmithProxy } from "./misc.js";

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
    setupNodmgProxy();

    // Firebase proxy (character selection handling, companions, party, achievements)
    setupFirebaseProxy();
    setupFirebaseStorageProxy();
    setupSteamAchievementProxy();

    // Game attribute proxies (gems, HP, currencies, cloud save, trapping, alchemy)
    setupGameAttributeProxies();
    setupTrappingProxy();
    setupAlchProxy();

    // CList proxies (MTX, refinery, vials, prayers)
    setupCListProxy();

    // ActorEvents proxies by event number
    setupEvents012Proxies();
    setupAutoLootProxy();
    setupItemGetNotificationProxy();
    setupItemMoveProxy();
    setupItemMiscProxy();
    setupEvents124Proxies();
    setupEvents189Proxies();
    setupItemsMenuProxy();
    setupEvents345Proxies();
    setupEvents481Proxies();
    setupEvents579Proxies();

    // Misc proxies (abilities, candy, quests, smithing)
    setupAbilityProxy();
    setupTimeCandyProxy();
    setupQuestProxy();
    setupSmithProxy();
}
