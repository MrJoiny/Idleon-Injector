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
 */

import { cheatState } from "../core/state.js";
import { bEngine } from "../core/globals.js";

/**
 * Setup mining and fishing minigame proxies (never game over).
 */
export function setupMiningFishingProxies() {
    const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");

    const miningGameOver = pixelHelper[4].getValue("ActorEvents_229", "_customEvent_MiningGameOver");
    const miningProxy = new Proxy(miningGameOver, {
        apply(originalFn, context, argumentsList) {
            if (cheatState.minigame.mining) return;
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });
    pixelHelper[4].setValue("ActorEvents_229", "_customEvent_MiningGameOver", miningProxy);

    const fishingGameOver = pixelHelper[4].getValue("ActorEvents_229", "_customEvent_FishingGameOver");
    const fishingProxy = new Proxy(fishingGameOver, {
        apply(originalFn, context, argumentsList) {
            if (cheatState.minigame.fishing) return;
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });
    pixelHelper[4].setValue("ActorEvents_229", "_customEvent_FishingGameOver", fishingProxy);
}

/**
 * Setup catching minigame proxy (static fly and hoop positions).
 */
export function setupCatchingMinigameProxy() {
    const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
    const genInfo = pixelHelper[4].getValue("ActorEvents_229", "_GenInfo");

    const proxy = new Proxy(genInfo, {
        get(target, property, receiver) {
            if (cheatState.minigame.catching) {
                if (Number(property) === 31) return 70;
                if (Number(property) === 33) return [95, 95, 95, 95, 95];
            }
            return Reflect.get(target, property, receiver);
        },
    });
    pixelHelper[4].setValue("ActorEvents_229", "_GenInfo", proxy);
}

/**
 * Setup chopping minigame proxy (whole bar filled with gold zone).
 */
export function setupChoppingMinigameProxy() {
    const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
    const generalInfo = pixelHelper[1].getValue("ActorEvents_116", "_GeneralINFO");

    const proxy = new Proxy(generalInfo, {
        get(target, property, receiver) {
            if (cheatState.minigame.choppin && Number(property) === 7) {
                return [100, -1, 0, 2, 0, 220, -1, 0, -1, 0, -1, 0, 0, 220, 0, 0, 1];
            }
            return Reflect.get(target, property, receiver);
        },
    });
    pixelHelper[1].setValue("ActorEvents_116", "_GeneralINFO", proxy);
}

/**
 * Setup poing minigame proxy (AI paddle doesn't move).
 */
export function setupPoingMinigameProxy() {
    const pixelHelper = bEngine.gameAttributes.h.PixelHelperActor;
    const poingGeninfo = pixelHelper[23].behaviors.behaviors[0].script._GenINFO;

    let aiVelocity = 0;
    Object.defineProperty(poingGeninfo[63], "1", {
        get() {
            return cheatState.minigame.poing ? 0 : aiVelocity;
        },
        set(value) {
            aiVelocity = value;
        },
    });
}

/**
 * Setup scratch minigame proxy (auto reveal all scratch zones).
 */
export function setupScratchMinigameProxy() {
    const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
    const scratchBehavior = pixelHelper[25].behaviors.getBehavior("ActorEvents_670");

    const SCRATCH_ARRAY_IDX = 212;
    const STATE_IDX = 50;
    const COVER_IMG_ARRAY_ID = 68;
    const COVER_IMG_ID = 1;

    const originalGenInfo = scratchBehavior._GenINFO;
    const proxy = new Proxy(originalGenInfo, {
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);

            if (Number(property) === SCRATCH_ARRAY_IDX && cheatState.minigame.scratch) {
                if (Array.isArray(value) && value[STATE_IDX] === 1) {
                    for (let i = 25; i <= 49; i++) {
                        if (value[i] !== 1) {
                            value[i] = 1;
                        }
                    }

                    const coverImage = scratchBehavior._UIinventory15?.[COVER_IMG_ARRAY_ID]?.[COVER_IMG_ID];
                    if (coverImage?.get_alpha && coverImage.get_alpha() > 0) {
                        coverImage.set_alpha(0);
                    }
                }
            }

            return value;
        },
    });
    scratchBehavior._GenINFO = proxy;
}

/**
 * Setup hoops and darts minigame proxies (perfect positions).
 */
export function setupHoopsDartsProxies() {
    const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
    const behavior = pixelHelper[21].behaviors.getBehavior("ActorEvents_510");

    // Hoops constants
    const HOOP_TARGET_X = 107;
    const HOOP_TARGET_Y = 108;
    const HOOP_POS_X = 95;
    const HOOP_POS_Y = 96;
    const BALL_X = 91;

    // Darts constants
    const DART_X = 138;
    const DART_Y = 139;
    const DART_ACTIVE = 137;
    const BULLSEYE_X = 938;
    const BULLSEYE_Y = 292;

    const originalGenInfo = behavior._GenINFO;
    const proxy = new Proxy(originalGenInfo, {
        get(target, property, receiver) {
            const numericProperty = Number(property);

            // Hoops logic
            if (cheatState.minigame.hoops) {
                if (bEngine.gameAttributes?.h?.OptionsListAccount?.[243] === 1) {
                    bEngine.gameAttributes.h.OptionsListAccount[243] = 0;
                }

                switch (numericProperty) {
                    case HOOP_TARGET_X:
                    case HOOP_POS_X:
                        return 600;
                    case HOOP_TARGET_Y:
                    case HOOP_POS_Y:
                        return 300;
                    case BALL_X:
                        return 620;
                }
            }

            // Darts logic
            if (cheatState.minigame.darts && target[DART_ACTIVE] === 1) {
                if (numericProperty === DART_X) return BULLSEYE_X;
                if (numericProperty === DART_Y) return BULLSEYE_Y;
            }

            return Reflect.get(target, property, receiver);
        },
    });
    behavior._GenINFO = proxy;
}

/**
 * Setup wisdom monument proxy (infinite attempts).
 */
export function setupWisdomMonumentProxy() {
    const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
    const wisdomGenInfo = pixelHelper[25].getValue("ActorEvents_670", "_GenINFO");

    const proxy = new Proxy(wisdomGenInfo, {
        get(target, property, receiver) {
            if (cheatState.minigame.wisdom && Number(property) === 194) {
                return 10;
            }
            return Reflect.get(target, property, receiver);
        },
    });
    pixelHelper[25].setValue("ActorEvents_670", "_GenINFO", proxy);
}

/**
 * Setup all minigame proxies.
 */
export function setupMinigameProxies() {
    setupMiningFishingProxies();
    setupCatchingMinigameProxy();
    setupChoppingMinigameProxy();
    setupPoingMinigameProxy();
    setupScratchMinigameProxy();
    setupHoopsDartsProxies();
    setupWisdomMonumentProxy();
}
