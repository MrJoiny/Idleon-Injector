/**
 * Minigame Proxies
 *
 * Proxies for all minigame cheats:
 * - Mining minigame (never game over)
 * - Fishing minigame (never game over)
 * - Catching minigame (static fly positions)
 * - Chopping minigame (gold zone fills bar)
 * - Poing minigame (AI doesn't move)
 * - Scratch minigame (auto reveal all)
 * - Hoops minigame (perfect position)
 * - Darts minigame (bullseye position)
 * - Wisdom monument (infinite attempts)
 *
 * NOTE: These proxies are lazy-loaded on-demand when minigame cheats are activated,
 * not during initial setup, because the game objects may not exist yet.
 */

import { cheatState } from "../core/state.js";
import { bEngine } from "../core/globals.js";

// Track which proxies have been set up to avoid re-proxying
const proxiesSetup = {
    mining: false,
    fishing: false,
    catching: false,
    chopping: false,
    poing: false,
    scratch: false,
    hoops: false,
    darts: false,
    wisdom: false,
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a "never game over" proxy that blocks the game over function when cheat is active.
 * @param {string} name - Minigame name for logging and proxiesSetup tracking
 * @param {number} pixelIndex - Index in PixelHelperActor array
 * @param {string} behaviorName - Behavior name (e.g., "ActorEvents_229")
 * @param {string} eventName - Event name (e.g., "_customEvent_MiningGameOver")
 * @param {function(): boolean} stateGetter - Returns whether cheat is active
 */
function createNeverGameOverProxy(name, pixelIndex, behaviorName, eventName, stateGetter) {
    return function () {
        if (proxiesSetup[name]) return;

        try {
            const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
            if (!pixelHelper || !pixelHelper[pixelIndex] || typeof pixelHelper[pixelIndex].getValue !== "function") {
                console.log(`${name} minigame proxy: Game objects not ready yet`);
                return;
            }

            const gameOverFn = pixelHelper[pixelIndex].getValue(behaviorName, eventName);
            if (!gameOverFn) {
                console.log(`${name} minigame proxy: ${eventName} not found`);
                return;
            }

            const handler = {
                apply: function (originalFn, context, argumentsList) {
                    if (stateGetter()) return; // Do nothing when game over
                    return Reflect.apply(originalFn, context, argumentsList);
                },
            };

            const proxy = new Proxy(gameOverFn, handler);
            pixelHelper[pixelIndex].setValue(behaviorName, eventName, proxy);
            proxiesSetup[name] = true;
        } catch (error) {
            console.error(`Error setting up ${name} minigame proxy:`, error);
        }
    };
}

/**
 * Creates a GenInfo property override proxy using getValue/setValue pattern.
 * @param {string} name - Minigame name for logging and proxiesSetup tracking
 * @param {number} pixelIndex - Index in PixelHelperActor array
 * @param {string} behaviorName - Behavior name
 * @param {string} propName - Property name (e.g., "_GenInfo")
 * @param {function(target, property): any} getHandler - Custom get handler, returns undefined to use original
 */
function createGenInfoProxy(name, pixelIndex, behaviorName, propName, getHandler) {
    return function () {
        if (proxiesSetup[name]) return;

        try {
            const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
            if (!pixelHelper || !pixelHelper[pixelIndex] || typeof pixelHelper[pixelIndex].getValue !== "function") {
                console.log(`${name} minigame proxy: Game objects not ready yet`);
                return;
            }

            const genInfo = pixelHelper[pixelIndex].getValue(behaviorName, propName);
            if (!genInfo) {
                console.log(`${name} minigame proxy: ${propName} not found`);
                return;
            }

            const handler = {
                get: function (target, property) {
                    const result = getHandler(target, property);
                    if (result !== undefined) return result;
                    return Reflect.get(...arguments);
                },
            };

            const proxy = new Proxy(genInfo, handler);
            pixelHelper[pixelIndex].setValue(behaviorName, propName, proxy);
            proxiesSetup[name] = true;
        } catch (error) {
            console.error(`Error setting up ${name} minigame proxy:`, error);
        }
    };
}

/**
 * Creates a GenInfo proxy using getBehavior pattern (for scratch, hoops, darts).
 * @param {string} name - Minigame name for logging and proxiesSetup tracking
 * @param {number} pixelIndex - Index in PixelHelperActor array
 * @param {string} behaviorName - Behavior name to get
 * @param {function(behavior, target, property, receiver): any} getHandler - Custom get handler
 */
function createBehaviorGenInfoProxy(name, pixelIndex, behaviorName, getHandler) {
    return function () {
        if (proxiesSetup[name]) return;

        try {
            const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
            if (!pixelHelper || !pixelHelper[pixelIndex]?.behaviors?.getBehavior) {
                console.log(`${name} minigame proxy: Game objects not ready yet`);
                return;
            }

            const behavior = pixelHelper[pixelIndex].behaviors.getBehavior(behaviorName);
            if (!behavior || typeof behavior._GenINFO === "undefined") {
                console.log(`${name} Proxy: ${behaviorName} behavior not found yet`);
                return;
            }

            const originalGenInfo = behavior._GenINFO;
            const handler = {
                get: function (target, property, receiver) {
                    return getHandler(behavior, target, property, receiver);
                },
            };

            const proxy = new Proxy(originalGenInfo, handler);
            behavior._GenINFO = proxy;
            proxiesSetup[name] = true;
        } catch (error) {
            console.error(`Error setting up ${name} minigame proxy:`, error);
        }
    };
}

// ============================================================================
// Minigame Setup Functions
// ============================================================================

/**
 * Setup mining minigame proxy (never game over).
 */
export const setupMiningMinigameProxy = createNeverGameOverProxy(
    "mining",
    4,
    "ActorEvents_229",
    "_customEvent_MiningGameOver",
    () => cheatState.minigame.mining
);

/**
 * Setup fishing minigame proxy (never game over).
 */
export const setupFishingMinigameProxy = createNeverGameOverProxy(
    "fishing",
    4,
    "ActorEvents_229",
    "_customEvent_FishingGameOver",
    () => cheatState.minigame.fishing
);

/**
 * Setup catching minigame proxy (static fly and hoop positions).
 */
export const setupCatchingMinigameProxy = createGenInfoProxy(
    "catching",
    4,
    "ActorEvents_229",
    "_GenInfo",
    (target, property) => {
        if (cheatState.minigame.catching) {
            if (Number(property) === 31) return 70;
            if (Number(property) === 33) return [95, 95, 95, 95, 95];
        }
        return undefined;
    }
);

/**
 * Setup chopping minigame proxy (whole bar filled with gold zone).
 */
export const setupChoppingMinigameProxy = createGenInfoProxy(
    "chopping",
    1,
    "ActorEvents_116",
    "_GeneralINFO",
    (target, property) => {
        if (cheatState.minigame.choppin && Number(property) === 7) {
            return [100, -1, 0, 2, 0, 220, -1, 0, -1, 0, -1, 0, 0, 220, 0, 0, 1];
        }
        return undefined;
    }
);

/**
 * Setup wisdom monument proxy (infinite attempts).
 */
export const setupWisdomMonumentProxy = createGenInfoProxy(
    "wisdom",
    25,
    "ActorEvents_670",
    "_GenINFO",
    (target, property) => {
        if (cheatState.minigame.wisdom && Number(property) === 194) {
            return 10;
        }
        return undefined;
    }
);

/**
 * Setup poing minigame proxy (AI paddle doesn't move).
 * Note: This uses Object.defineProperty pattern, kept as custom function.
 */
export function setupPoingMinigameProxy() {
    if (proxiesSetup.poing) return;

    try {
        const pixelHelper = bEngine.gameAttributes?.h?.PixelHelperActor;
        if (!pixelHelper || !pixelHelper[23]?.behaviors?.behaviors?.[0]?.script?._GenINFO) {
            console.log("Poing minigame proxy: Game objects not ready yet");
            return;
        }

        let aiVelocity = 0;
        const poingGeninfo = pixelHelper[23].behaviors.behaviors[0].script._GenINFO;

        if (!poingGeninfo[63]) {
            console.log("Poing minigame proxy: GenINFO[63] not found");
            return;
        }

        Object.defineProperty(poingGeninfo[63], "1", {
            get: function () {
                return cheatState.minigame.poing ? 0 : aiVelocity;
            },
            set: function (value) {
                aiVelocity = value;
            },
        });
        proxiesSetup.poing = true;
    } catch (error) {
        console.error("Error setting up Poing minigame proxy:", error);
    }
}

/**
 * Setup scratch minigame proxy (auto reveal all scratch zones).
 */
export const setupScratchMinigameProxy = createBehaviorGenInfoProxy(
    "scratch",
    25,
    "ActorEvents_670",
    (behavior, target, property, receiver) => {
        const value = Reflect.get(target, property, receiver);

        const SCRATCH_ARRAY_IDX = 212;
        const STATE_IDX = 50;
        const COVER_IMG_ARRAY_ID = 68;
        const COVER_IMG_ID = 1;

        // Intercept access to the Scratch Data Array [212]
        if (Number(property) === SCRATCH_ARRAY_IDX && cheatState.minigame.scratch) {
            // Check if the game state is "Playing" (1)
            if (Array.isArray(value) && value[STATE_IDX] === 1) {
                // [25] to [49] are the scratch zones
                for (let i = 25; i <= 49; i++) {
                    if (value[i] !== 1) {
                        value[i] = 1;
                    }
                }

                const coverImage = behavior._UIinventory15?.[COVER_IMG_ARRAY_ID]?.[COVER_IMG_ID];
                // remove cover
                if (coverImage?.get_alpha && coverImage.get_alpha() > 0) {
                    coverImage.set_alpha(0);
                }
            }
        }

        return value;
    }
);

/**
 * Setup hoops minigame proxy (perfect hoop position).
 */
export const setupHoopsMinigameProxy = createBehaviorGenInfoProxy(
    "hoops",
    21,
    "ActorEvents_510",
    (behavior, target, property, receiver) => {
        if (cheatState.minigame.hoops) {
            if (bEngine.gameAttributes?.h?.OptionsListAccount?.[243] === 1) {
                bEngine.gameAttributes.h.OptionsListAccount[243] = 0;
            }

            const HOOP_TARGET_X = 107;
            const HOOP_TARGET_Y = 108;
            const HOOP_POS_X = 95;
            const HOOP_POS_Y = 96;
            const BALL_X = 91;

            const numericProperty = Number(property);
            switch (numericProperty) {
                case HOOP_TARGET_X:
                    return 600;
                case HOOP_TARGET_Y:
                    return 300;
                case HOOP_POS_X:
                    return 600;
                case HOOP_POS_Y:
                    return 300;
                case BALL_X:
                    return 620;
            }
        }

        return Reflect.get(target, property, receiver);
    }
);

/**
 * Setup darts minigame proxy (perfect bullseye position).
 */
export const setupDartsMinigameProxy = createBehaviorGenInfoProxy(
    "darts",
    21,
    "ActorEvents_510",
    (behavior, target, property, receiver) => {
        if (cheatState.minigame.darts) {
            const DART_X = 138;
            const DART_Y = 139;
            const DART_ACTIVE = 137;
            const BOARD_BOUNDS = { left: 916, right: 960, top: 89, bottom: 495 };
            const BULLSEYE_Y = 292;

            const numericProperty = Number(property);

            // When dart is active and over the board, force perfect bullseye position
            if (target[DART_ACTIVE] === 1) {
                if (numericProperty === DART_X) {
                    return Math.floor((BOARD_BOUNDS.left + BOARD_BOUNDS.right) / 2);
                }
                if (numericProperty === DART_Y) {
                    return BULLSEYE_Y;
                }
            }
        }

        return Reflect.get(target, property, receiver);
    }
);

// ============================================================================
// Initialization
// ============================================================================

/**
 * Setup all minigame proxies.
 */
export function setupMinigameProxies() {
    setupMiningMinigameProxy();
    setupFishingMinigameProxy();
    setupCatchingMinigameProxy();
    setupChoppingMinigameProxy();
    setupPoingMinigameProxy();
    setupScratchMinigameProxy();
    setupHoopsMinigameProxy();
    setupDartsMinigameProxy();
    setupWisdomMonumentProxy();
}

/**
 * Initialize all minigame proxies.
 */
export function initMinigameProxies() {
    setupMinigameProxies();
}
