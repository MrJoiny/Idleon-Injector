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
 * - Wisdom (ActorEvents_670) - Infinite attempts + card reveal
 * - Poing (ActorEvents_577) - AI paddle off-screen
 * - Log (ActorEvents_577) - Card type reveal
 * - Minehead (ActorEvents_741) - In-game mine tile reveal
 * - Gold Pot Rush (ActorEvents_670) - Instant finish minigame
 */

import { cheatState } from "../core/state.js";
import { behavior, events, gga } from "../core/globals.js";
import { createMethodProxy } from "../utils/proxy.js";

// mining, fishing, catching
function setupEvents229Minigames() {
    const ActorEvents229 = events(229);

    // mining block game over
    const originalMining = ActorEvents229.prototype._customEvent_MiningGameOver;
    ActorEvents229.prototype._customEvent_MiningGameOver = function (...args) {
        if (cheatState.minigame.mining) return; // Skip original entirely
        return Reflect.apply(originalMining, this, args);
    };

    // fishing block game over
    const originalFishing = ActorEvents229.prototype._customEvent_FishingGameOver;
    ActorEvents229.prototype._customEvent_FishingGameOver = function (...args) {
        if (cheatState.minigame.fishing) return; // Skip original entirely
        return Reflect.apply(originalFishing, this, args);
    };

    // catching proxy _GenInfo array for static positions
    createMethodProxy(ActorEvents229.prototype, "init", function (base) {
        this._GenInfo = new Proxy(this._GenInfo, {
            get(target, prop, receiver) {
                if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
                const index = Number(prop);
                if (cheatState.minigame.catching) {
                    if (index === 31) return 70;
                    if (index === 33) return [95, 95, 95, 95, 95];
                }
                return Reflect.get(target, prop, receiver);
            },
        });

        return base;
    });
}

// choppin
function setupEvents116Minigames() {
    const ActorEvents116 = events(116);

    // choppin proxy _GeneralINFO for gold zone
    createMethodProxy(ActorEvents116.prototype, "init", function (base) {
        this._GeneralINFO = new Proxy(this._GeneralINFO, {
            get(target, prop, receiver) {
                if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
                const index = Number(prop);
                if (cheatState.minigame.choppin) {
                    if (index === 7) return [100, -1, 0, 2, 0, 220, -1, 0, -1, 0, -1, 0, 0, 220, 0, 0, 1];
                }
                return Reflect.get(target, prop, receiver);
            },
        });

        return base;
    });
}

// hoops and darts
function setupEvents510Minigames() {
    const ActorEvents510 = events(510);

    // Hoops constants
    const HOOP_TGT_X = 107;
    const HOOP_TGT_Y = 108;
    const HOOP_POS_X = 95;
    const HOOP_POS_Y = 96;
    const BALL_X = 91;

    // Darts constants
    const DART_X = 138;
    const DART_Y = 139;
    const DART_ACTIVE = 137;
    const BULLSEYE_X = 938;
    const BULLSEYE_Y = 292;

    createMethodProxy(ActorEvents510.prototype, "init", function (base) {
        this._GenINFO = new Proxy(this._GenINFO, {
            get(target, prop, receiver) {
                if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
                const index = Number(prop);

                // Hoops logic
                if (cheatState.minigame.hoops) {
                    switch (index) {
                        case HOOP_TGT_X:
                        case HOOP_POS_X:
                            return 600;
                        case HOOP_TGT_Y:
                        case HOOP_POS_Y:
                            return 300;
                        case BALL_X:
                            return 620;
                    }
                }

                // Darts logic
                if (cheatState.minigame.darts && target[DART_ACTIVE] === 1) {
                    if (index === DART_X) return BULLSEYE_X;
                    if (index === DART_Y) return BULLSEYE_Y;
                }

                return Reflect.get(target, prop, receiver);
            },
        });

        return base;
    });
}

// scratch, wisdom, valentine and gold pot rush
function setupEvents670Minigames() {
    const ActorEvents670 = events(670);

    // Gold Pot Rush queues delayed coin spawns. Without a round id, callbacks
    // from the previous round can write into the next round's _GenINFO[254].
    const goldPotRushRoundIds = new WeakMap();

    // Scratch card state
    const SCRATCH_ARRAY_IDX = 212;
    const SCRATCH_STATE_IDX = 50;
    const COVER_IMG_SET_IDX = 68;
    const COVER_IMG_IDX = 1;

    // Event minigame ids/state
    const EVENT_GAME_IDX = 213;
    const VALENTINE_GAME_ID = 2;
    const GOLD_POT_GAME_ID = 3;

    // Gold Pot Rush state
    const GOLD_POT_PHASE_IDX = 255;
    const GOLD_POT_BALLS_IDX = 254;
    const GOLD_POT_BALL_PROG_IDX = 10;
    const GOLD_POT_CFG_IDX = 256;
    const GOLD_POT_FRAME_IDX = 0;
    const GOLD_POT_DONE_STAGE = 9;

    // Wisdom Monument state
    const WISDOM_HOLE_ID = 12;
    const WISDOM_PHASE_IDX = 55;
    const HOLE_ACTIVITY_IDX = 0;

    function isGoldPotRushRound(instance) {
        return instance._GenINFO[EVENT_GAME_IDX] === GOLD_POT_GAME_ID && instance._GenINFO[GOLD_POT_PHASE_IDX] === 1;
    }

    // _GenINFO proxy hooks for Scratch and Wisdom Monument
    createMethodProxy(ActorEvents670.prototype, "init", function (base) {
        this._GenINFO = new Proxy(this._GenINFO, {
            get: (target, prop, receiver) => {
                if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
                const index = Number(prop);
                const value = Reflect.get(target, prop, receiver);

                // scratch logic auto reveal all scratch zones
                if (index === SCRATCH_ARRAY_IDX && cheatState.minigame.scratch) {
                    if (value[SCRATCH_STATE_IDX] === 1) {
                        for (let i = 25; i <= 49; i++) {
                            value[i] = 1;
                        }

                        // Hide cover image
                        const coverImage = this._UIinventory15[COVER_IMG_SET_IDX][COVER_IMG_IDX];
                        coverImage.set_alpha(0);
                    }
                }

                // wisdom logic infinite attempts
                if (cheatState.minigame.wisdom && index === 194) {
                    return 10;
                }

                return value;
            },
        });

        return base;
    });

    // valentine reveal and Gold Pot Rush round tracking both on _event_OwlEvent.
    const originalOwlEvent = ActorEvents670.prototype._event_OwlEvent;
    ActorEvents670.prototype._event_OwlEvent = function (...args) {
        const instance = this;
        const nextGoldPotRushRoundId = (goldPotRushRoundIds.get(this) || 0) + 1;
        const previousGoldPotRushActive = isGoldPotRushRound(this);
        const originalRunLater = behavior.runLater;

        behavior.runLater = function (...runLaterArgs) {
            if (runLaterArgs[2] === instance.actor && isGoldPotRushRound(instance)) {
                const callback = runLaterArgs[1];
                // Ignore delayed spawns from older rounds after _GenINFO[254] is rebuilt.
                runLaterArgs[1] = function (...callbackArgs) {
                    if (goldPotRushRoundIds.get(instance) !== nextGoldPotRushRoundId) return;
                    return Reflect.apply(callback, this, callbackArgs);
                };
            }

            return Reflect.apply(originalRunLater, this, runLaterArgs);
        };

        let base;
        try {
            base = Reflect.apply(originalOwlEvent, this, args);
        } finally {
            behavior.runLater = originalRunLater;
        }

        if (!previousGoldPotRushActive && isGoldPotRushRound(this)) {
            goldPotRushRoundIds.set(this, nextGoldPotRushRoundId);
        }

        // this._GenINFO[213] event game 2 = valentine game
        if (cheatState.minigame.valentine && this._GenINFO[EVENT_GAME_IDX] === VALENTINE_GAME_ID) {
            const grid = this._GenINFO[228];
            const clicked = this._GenINFO[229];
            const covers = this._UIinventory15[68];

            for (let i = 0; i < 36; i++) {
                // 0 = Barf, skip if already clicked
                if (grid[i] !== 0 || clicked[i] !== 0) continue;

                const tform = covers[i].get_transform();
                const cform = tform.get_colorTransform();
                cform.redMultiplier = 0;
                cform.blueMultiplier = 0;
                tform.set_colorTransform(cform);
                covers[i].set_transform(tform);
            }
        }

        return base;
    };

    // Gold Pot Rush cheat
    createMethodProxy(ActorEvents670.prototype, "_event_7", function (base) {
        if (!cheatState.minigame.goldrush || !isGoldPotRushRound(this)) {
            return base;
        }

        const balls = this._GenINFO[GOLD_POT_BALLS_IDX];
        const completeProg = GOLD_POT_DONE_STAGE * this._GenINFO[GOLD_POT_CFG_IDX][GOLD_POT_FRAME_IDX];

        // jump each coin to the games payout threshold.
        for (const ball of balls) {
            if (ball[GOLD_POT_BALL_PROG_IDX] >= completeProg) continue;

            // Fast-forward to the game's own payout threshold so _event_7
            // resolves the winning bucket on the next tick.
            ball[GOLD_POT_BALL_PROG_IDX] = completeProg;
        }

        return base;
    });

    // wisdom card reveal helper — sets scaleX(1) on item images for active cards
    // and tints matched pairs green using color transforms
    function revealWisdomCards(instance) {
        if (!cheatState.minigame.wisdom) return;
        const playerHoleIdx = gga.GetPlayersUsernames.indexOf(gga.UserInfo[0]);
        if (gga.Holes[HOLE_ACTIVITY_IDX][playerHoleIdx] !== WISDOM_HOLE_ID) return;
        if (instance._GenINFO[WISDOM_PHASE_IDX] !== 1) return;

        const cards = instance._UIinventory15[67];
        const data = instance._GenINFO[197];
        const matched = instance._GenINFO[198];

        for (let i = 0; i < 44; i++) {
            const img = cards[i + 44];
            if (data[i] === 0) continue;

            img.set_scaleX(1);
            if (matched[i] !== 1) continue;

            const tform = img.get_transform();
            const cform = tform.get_colorTransform();
            cform.redMultiplier = 0;
            cform.blueMultiplier = 0;
            tform.set_colorTransform(cform);
            img.set_transform(tform);
        }
    }

    // reveal after round setup ("f2") and card clicks ("c")
    createMethodProxy(ActorEvents670.prototype, "_customEvent_CavernStuffz3", function (base) {
        revealWisdomCards(this);
        return base;
    });

    // re-reveal on every mouse interaction to keep items visible
    createMethodProxy(ActorEvents670.prototype, "_event_monumentgameplay", function (base) {
        revealWisdomCards(this);
        return base;
    });
}

// poing and log
function setupEvents577Minigames() {
    const ActorEvents577 = events(577);
    const LOG_INACTIVE_STATE = -1;
    const LOG_PHASE_IDX = 53;
    const POING_INACTIVE_PHASE = -1;
    const POING_PHASE_IDX = 57;
    const POING_PAD_XS_IDX = 58;
    const POING_AI_PAD_IDX = 1;

    // Poing: Hook into _event_Gaming where AI paddle movement happens
    // _GenINFO[58] is paddle X positions [player, ai]
    // We move AI paddle off-screen (999) and block game from updating it
    const originalEventGaming = ActorEvents577.prototype._event_Gaming;
    ActorEvents577.prototype._event_Gaming = function (...args) {
        // Before running game logic, wrap the paddle X positions if cheat is enabled
        if (
            cheatState.minigame.poing &&
            this._GenINFO[POING_PHASE_IDX] !== POING_INACTIVE_PHASE &&
            this._GenINFO[POING_PAD_XS_IDX] &&
            !this._GenINFO[POING_PAD_XS_IDX]._isProxied
        ) {
            this._GenINFO[POING_PAD_XS_IDX] = new Proxy(this._GenINFO[POING_PAD_XS_IDX], {
                get(padXs, key) {
                    if (typeof key === "symbol") return padXs[key];
                    const index = Number(key);
                    if (index === POING_AI_PAD_IDX) {
                        return 999; // Move AI paddle far off-screen
                    }
                    return padXs[key];
                },
                set(padXs, key, value) {
                    const index = Number(key);
                    // Block game from updating AI's position
                    if (index === POING_AI_PAD_IDX) {
                        return true;
                    }
                    padXs[key] = value;
                    return true;
                },
            });
            this._GenINFO[POING_PAD_XS_IDX]._isProxied = true;
        }
        return Reflect.apply(originalEventGaming, this, args);
    };

    // log card reveal
    createMethodProxy(ActorEvents577.prototype, "_customEvent_W5stuffzz", function (base) {
        if (!cheatState.minigame.log) return base;
        if (this._GenINFO[LOG_PHASE_IDX] === LOG_INACTIVE_STATE) return base;
        const cards = this._UIinventory13[41];
        const data = this._GenINFO[54];

        for (let i = 0; i < 10; i++) {
            const img = cards[i];
            const tform = img.get_transform();
            const cform = tform.get_colorTransform();

            if (data[i] === 1) {
                cform.greenMultiplier = 0;
                cform.blueMultiplier = 0;
            } else {
                cform.redMultiplier = 0;
                cform.blueMultiplier = 0;
            }

            tform.set_colorTransform(cform);
            img.set_transform(tform);
        }

        return base;
    });
}

// minehead
function setupEvents741Minigames() {
    const ActorEvents741 = events(741);

    const TILE_LAYERS = [27, 28, 29];
    const MINE_ALPHA = 0.2;
    const DEFAULT_ALPHA = 1;
    const mineRevealActive = new WeakMap();

    createMethodProxy(ActorEvents741.prototype, "_event_Minehead", function (base) {
        const mineGrid = this._GenINFO[32];
        const revealedTiles = this._GenINFO[33];
        const uiInventory = this._UIinventory17;

        if (!Array.isArray(mineGrid) || !uiInventory) return base;

        const inMineRound = this._GenINFO[28] === 1;
        const shouldReveal = cheatState.minigame.minehead && inMineRound;
        const wasRevealActive = mineRevealActive.get(this) === true;

        if (!shouldReveal && !wasRevealActive) return base;

        for (let tileIndex = 0; tileIndex < mineGrid.length; tileIndex++) {
            if (mineGrid[tileIndex] !== 0) continue;

            const isRevealed = revealedTiles[tileIndex] === 1;
            const alpha = shouldReveal && !isRevealed ? MINE_ALPHA : DEFAULT_ALPHA;

            for (const layer of TILE_LAYERS) {
                uiInventory[layer][tileIndex].set_alpha(alpha);
            }
        }

        if (shouldReveal) {
            mineRevealActive.set(this, true);
        } else {
            mineRevealActive.delete(this);
        }

        return base;
    });
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
    setupEvents741Minigames();
}
