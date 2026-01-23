/**
 * Minigame Proxies (Prototype-Based)
 *
 * All proxies are set up at startup via setupMinigameProxies() and controlled
 * by cheatState toggles. This approach patches the ActorEvents prototypes once,
 * making it more robust than instance-based patching.
 *
 * Supported minigames:
 * - Mining (ActorEvents_229) - Never game over
 * - Fishing (ActorEvents_229) - Never game over
 * - Catching (ActorEvents_229) - Static fly/hoop positions
 * - Choppin (ActorEvents_116) - Gold zone fills bar
 * - Hoops (ActorEvents_510) - Perfect ball/hoop position
 * - Darts (ActorEvents_510) - Bullseye position
 * - Scratch (ActorEvents_670) - Auto reveal all
 * - Wisdom (ActorEvents_670) - Infinite attempts
 * - Poing (ActorEvents_577) - AI paddle off-screen
 */

import { cheatState } from "../core/state.js";
import { events } from "../core/globals.js";
import { createMethodProxy } from "../utils/proxy.js";

/**
 * Wraps an array property in a Proxy when the init method is called.
 * This ensures the proxy is applied to every instance created from the prototype.
 *
 * @param {object} prototype - The ActorEvents prototype to patch
 * @param {string} initMethod - The initialization method name (e.g., "init")
 * @param {string} arrayProp - The array property name (e.g., "_GenINFO")
 * @param {object} handler - The Proxy handler with get/set traps
 */
function wrapArrayOnInit(prototype, initMethod, arrayProp, handler) {
    if (!prototype[initMethod]) return;
    if (prototype[initMethod]._isPatched) return;

    createMethodProxy(prototype, initMethod, function (base) {
        if (this[arrayProp] && !this[arrayProp]._isProxied) {
            this[arrayProp] = new Proxy(this[arrayProp], handler);
            this[arrayProp]._isProxied = true;
        }
        return base;
    });

    prototype[initMethod]._isPatched = true;
}

// mining, fishing, catching
function setupEvents229Minigames() {
    const ActorEvents229 = events(229);
    if (!ActorEvents229) return;

    // mining block game over
    if (!ActorEvents229.prototype._customEvent_MiningGameOver?._isPatched) {
        const originalMining = ActorEvents229.prototype._customEvent_MiningGameOver;
        ActorEvents229.prototype._customEvent_MiningGameOver = function (...args) {
            if (cheatState.minigame.mining) return; // Skip original entirely
            return originalMining.call(this, ...args);
        };
        ActorEvents229.prototype._customEvent_MiningGameOver._isPatched = true;
    }

    // fishing block game over
    if (!ActorEvents229.prototype._customEvent_FishingGameOver?._isPatched) {
        const originalFishing = ActorEvents229.prototype._customEvent_FishingGameOver;
        ActorEvents229.prototype._customEvent_FishingGameOver = function (...args) {
            if (cheatState.minigame.fishing) return; // Skip original entirely
            return originalFishing.call(this, ...args);
        };
        ActorEvents229.prototype._customEvent_FishingGameOver._isPatched = true;
    }

    // catching proxy _GenInfo array for static positions
    wrapArrayOnInit(ActorEvents229.prototype, "init", "_GenInfo", {
        get(target, prop, receiver) {
            if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
            if (cheatState.minigame.catching) {
                if (Number(prop) === 31) return 70;
                if (Number(prop) === 33) return [95, 95, 95, 95, 95];
            }
            return Reflect.get(target, prop, receiver);
        },
    });
}

// choppin
function setupEvents116Minigames() {
    const ActorEvents116 = events(116);
    if (!ActorEvents116) return;

    // choppin proxy _GeneralINFO for gold zone
    wrapArrayOnInit(ActorEvents116.prototype, "init", "_GeneralINFO", {
        get(target, prop, receiver) {
            if (cheatState.minigame.choppin && Number(prop) === 7) {
                return [100, -1, 0, 2, 0, 220, -1, 0, -1, 0, -1, 0, 0, 220, 0, 0, 1];
            }
            return Reflect.get(target, prop, receiver);
        },
    });
}

// hoops and darts
function setupEvents510Minigames() {
    const ActorEvents510 = events(510);
    if (!ActorEvents510) return;

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

    wrapArrayOnInit(ActorEvents510.prototype, "init", "_GenINFO", {
        get(target, prop, receiver) {
            const numProp = Number(prop);

            // Hoops logic
            if (cheatState.minigame.hoops) {
                switch (numProp) {
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
                if (numProp === DART_X) return BULLSEYE_X;
                if (numProp === DART_Y) return BULLSEYE_Y;
            }

            return Reflect.get(target, prop, receiver);
        },
    });
}

// scratch and wisdom
function setupEvents670Minigames() {
    const ActorEvents670 = events(670);
    if (!ActorEvents670) return;

    const SCRATCH_ARRAY_IDX = 212;
    const STATE_IDX = 50;
    const COVER_IMG_ARRAY_ID = 68;
    const COVER_IMG_ID = 1;

    wrapArrayOnInit(ActorEvents670.prototype, "init", "_GenINFO", {
        get(target, prop, receiver) {
            const numProp = Number(prop);
            const value = Reflect.get(target, prop, receiver);

            // scratch logic auto reveal all scratch zones
            if (numProp === SCRATCH_ARRAY_IDX && cheatState.minigame.scratch) {
                if (Array.isArray(value) && value[STATE_IDX] === 1) {
                    for (let i = 25; i <= 49; i++) {
                        if (value[i] !== 1) {
                            value[i] = 1;
                        }
                    }

                    // Hide cover image
                    const coverImage = this._UIinventory15?.[COVER_IMG_ARRAY_ID]?.[COVER_IMG_ID];
                    if (coverImage?.get_alpha && coverImage.get_alpha() > 0) {
                        coverImage.set_alpha(0);
                    }
                }
            }

            // wisdom logic infinite attempts
            if (cheatState.minigame.wisdom && numProp === 194) {
                return 10;
            }

            return value;
        },
    });
}

// poing
function setupEvents577Minigames() {
    const ActorEvents577 = events(577);
    if (!ActorEvents577) return;

    // Poing: Hook into _event_Gaming where AI paddle movement happens
    // _GenINFO[58] is paddle positions array [playerX, aiX]
    // We move AI paddle off-screen (999) and block game from updating it
    if (!ActorEvents577.prototype._event_Gaming?._isPatched) {
        const originalEventGaming = ActorEvents577.prototype._event_Gaming;
        ActorEvents577.prototype._event_Gaming = function (...args) {
            // Before running game logic, wrap _GenINFO[58] if cheat is enabled
            if (cheatState.minigame.poing && this._GenINFO?.[58] && !this._GenINFO[58]._isProxied) {
                this._GenINFO[58] = new Proxy(this._GenINFO[58], {
                    get(t, p) {
                        if (typeof p === "symbol") return t[p];
                        // p is the sub-index: 0 = Player, 1 = AI
                        if (Number(p) === 1) {
                            return 999; // Move AI paddle far off-screen
                        }
                        return t[p];
                    },
                    set(t, p, v) {
                        // Block game from updating AI's position
                        if (Number(p) === 1) {
                            return true;
                        }
                        t[p] = v;
                        return true;
                    },
                });
                this._GenINFO[58]._isProxied = true;
            }
            return originalEventGaming.call(this, ...args);
        };
        ActorEvents577.prototype._event_Gaming._isPatched = true;
    }
}

/**
 * Setup all minigame proxies on ActorEvents prototypes.
 * Call this once during proxy initialization in setupAllProxies().
 */
export function setupMinigameProxies() {
    setupEvents229Minigames();
    setupEvents116Minigames();
    setupEvents510Minigames();
    setupEvents670Minigames();
    setupEvents577Minigames();
}
