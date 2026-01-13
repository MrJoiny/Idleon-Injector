/**
 * Proxies Module Index
 *
 * Central orchestrator for all game proxies.
 * Exports setup functions and a unified setupAllProxies() function.
 */

// Re-export shared proxy context
export { getConfig, setConfig } from "./proxyContext.js";

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
import { initMinigameProxies } from "./minigames.js";
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
 * @param {object} config - The cheat configuration object
 */
export function setupAllProxies(context, config) {
    // Behavior script proxies (RNG, timing)
    setupBehaviorScriptProxies();

    // Firebase proxy (character selection handling)
    setupFirebaseProxy(context);

    // Game attribute proxies (gems, HP, currencies, cloud save, etc.)
    setupGameAttributeProxies(events, config);

    // CList proxies (MTX, refinery, vials, prayers, etc.)
    initCListProxies(config);

    // ActorEvents proxies by event number
    initEvents012Proxies(config);
    initEvents124Proxies(config);
    initEvents189Proxies(config);
    initEvents345Proxies(config);
    initEvents481Proxies();
    initEvents579Proxies(config);


    // NOTE: Minigame proxies are lazy-loaded on-demand, not here
    // initMinigameProxies();

    // Misc proxies (autoloot, items, abilities, etc.)
    initMiscProxies(config, context);
}
