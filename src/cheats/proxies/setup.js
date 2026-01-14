/**
 * Proxies Module Index
 *
 * Central orchestrator for all game proxies.
 * Exports setup functions and a unified setupAllProxies() function.
 */

// Re-export from behavior.js
export { setupBehaviorScriptProxies } from "./behavior.js";

// Re-export from firebase.js
export { setupFirebaseProxy, setFullProxySetup } from "./firebase.js";

// Re-export from gameAttributes.js
export {
    setupGemsProxy,
    setupHPProxy,
    setupCurrenciesOwnedProxy,
    setupCloudSaveProxy,
    setupValuesMapProxy,
    setupOptionsListAccountProxy,
    setupMonsterRespawnProxy,
    setupGameAttributeProxies,
} from "./gameAttributes.js";

// Re-export from clist.js
export { setupCListProxy, initCListProxies } from "./clist.js";

// Re-export from events012.js
export { setupEvents012Proxies, initEvents012Proxies } from "./events012.js";

// Re-export from events124.js
export {
    setupStampCostProxy,
    setupAFKRateProxy,
    setupPlayerLoadProxy,
    setupTalentProxy,
    setupMonsterKillProxy,
    setupEvents124Proxies,
    initEvents124Proxies,
} from "./events124.js";

// Re-export from events189.js
export {
    setupAnvilProduceStatsProxy,
    setupCauldronStatsProxy,
    setupChipBonusesProxy,
    setupMealBonusProxy,
    setupEvents189Proxies,
    initEvents189Proxies,
} from "./events189.js";

// Re-export from events345.js
export {
    setupWorkbenchStuffProxy,
    setupWorshipMobDeathProxy,
    setupShrineInfoProxy,
    setupTowerStatsProxy,
    setupRefineryProxy,
    setupBreedingProxy,
    setupLabProxy,
    setupPetStuffProxy,
    setupCookingProxy,
    setupMainframeBonusProxy,
    setupDungeonCalcProxy,
    setupKeychainProxy,
    setupEvents345Proxies,
    initEvents345Proxies,
} from "./events345.js";

// Re-export from events481.js
export { setupWorkbenchStuff2Proxy, setupEvents481Proxies, initEvents481Proxies } from "./events481.js";

// Re-export from events579.js
export {
    setupSummoningProxies,
    setupThingiesProxies,
    setupHolesProxy,
    setupSailingProxy,
    setupGamingProxy,
    setupDivinityProxy,
    setupAtomColliderProxy,
    setupRiftProxy,
    setupDreamstuffProxy,
    setupFarmingProxy,
    setupNinjaProxy,
    setupWindwalkerProxy,
    setupArcaneProxy,
    setupBubbaProxy,
    setupSpelunkProxy,
    setupGalleryProxy,
    setupEvents579Proxies,
    initEvents579Proxies,
} from "./events579.js";

// Re-export from minigames.js
export {
    setupMiningMinigameProxy,
    setupFishingMinigameProxy,
    setupCatchingMinigameProxy,
    setupChoppingMinigameProxy,
    setupPoingMinigameProxy,
    setupScratchMinigameProxy,
    setupHoopsMinigameProxy,
    setupDartsMinigameProxy,
    setupWisdomMonumentProxy,
    setupMinigameProxies,
    initMinigameProxies,
} from "./minigames.js";

// Re-export from misc.js
export {
    setupAutoLootProxy,
    setupNodmgProxy,
    setupTimeCandyProxy,
    setupItemMoveProxy,
    setupItemsMenuProxy,
    setupItemMiscProxy,
    setupAbilityProxy,
    setupSmithProxy,
    setupTrappingProxy,
    setupAlchProxy,
    setupQuestProxy,
    setupCreateElementProxy,
    setupSteamAchievementProxy,
    setupMiscProxiesWithContext,
    setupMiscProxies,
    initMiscProxies,
} from "./misc.js";

// Import for setupAllProxies
import { events } from "../core/globals.js";
import { setupBehaviorScriptProxies } from "./behavior.js";
import { setupFirebaseProxy } from "./firebase.js";
import { setupGameAttributeProxies } from "./gameAttributes.js";
import { initCListProxies } from "./clist.js";
import { initEvents012Proxies } from "./events012.js";
import { initEvents124Proxies } from "./events124.js";
import { initEvents189Proxies } from "./events189.js";
import { initEvents345Proxies } from "./events345.js";
import { initEvents481Proxies } from "./events481.js";
import { initEvents579Proxies } from "./events579.js";

import { initMiscProxies } from "./misc.js";

/**
 * Setup all game proxies.
 *
 * This is the main entry point for proxy initialization.
 * Call this after the game is ready and common variables are registered.
 *
 * NOTE: Minigame proxies are NOT set up here - they are lazy-loaded on-demand
 * when a minigame cheat is activated, because the game objects might not
 * be ready at initial setup time.
 *
 * @param {object} context - The game window context
 */
export function setupAllProxies(context) {
    // Behavior script proxies (RNG, timing)
    setupBehaviorScriptProxies();

    // Firebase proxy (character selection handling)
    setupFirebaseProxy(context);

    // Game attribute proxies (gems, HP, currencies, cloud save, etc.)
    setupGameAttributeProxies(events);

    // CList proxies (MTX, refinery, vials, prayers, etc.)
    initCListProxies();

    // ActorEvents proxies by event number
    initEvents012Proxies();
    initEvents124Proxies();
    initEvents189Proxies();
    initEvents345Proxies();
    initEvents481Proxies();
    initEvents579Proxies();

    // NOTE: Minigame proxies are lazy-loaded on-demand, not here
    // initMinigameProxies();

    // Misc proxies (autoloot, items, abilities, etc.)
    initMiscProxies(context);
}
