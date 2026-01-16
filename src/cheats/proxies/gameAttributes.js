/**
 * Game Attributes Proxies
 *
 * Proxies for core game attributes:
 * - Gems (freeze gems)
 * - HP (infinite health)
 * - Currencies (teleports, tickets, obol fragments, silver pens)
 * - Cloud save (pause cloud saving)
 * - Values map (free revives)
 * - Options list account (unban, event items, minigames, quick ref, etc.)
 * - Monster respawn time
 * - Gaming (snail mail)
 * - Divinity (unlinks)
 * - Rift (rift unlock)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { bEngine, cList, events } from "../core/globals.js";
import { createProxy } from "../utils/proxy.js";

/**
 * Apply max cap to a value, with optional NaN handling.
 * @param {number} value - The value to cap
 * @param {string} configKey - Key in cheatConfig.maxval
 * @param {boolean} handleNaN - Whether to handle NaN values
 * @returns {number} The capped value
 */
function applyMaxCap(value, configKey, handleNaN = false) {
    if (handleNaN && isNaN(value)) {
        return cheatConfig?.maxval?.[configKey] ?? value;
    }
    return Math.min(cheatConfig?.maxval?.[configKey] ?? Infinity, value);
}

/**
 * Setup all game attribute proxies.
 */
export function setupGameAttributeProxies() {
    // Gems - freeze when enabled
    if (!Object.prototype.hasOwnProperty.call(bEngine.gameAttributes.h, "_GemsOwned")) {
        createProxy(bEngine.gameAttributes.h, "GemsOwned", {
            get(original) {
                return original;
            },
            set(value, backupKey) {
                if (cheatState.wide.gems) return;
                this[backupKey] = value;
            },
        });
    }

    // HP - always return max HP when enabled
    if (!Object.prototype.hasOwnProperty.call(bEngine.gameAttributes.h, "_PlayerHP")) {
        createProxy(bEngine.gameAttributes.h, "PlayerHP", {
            get(original) {
                return original;
            },
            set(value, backupKey) {
                this[backupKey] = cheatState.godlike.hp ? events(12)._customBlock_PlayerHPmax() : value;
            },
        });
    }

    // Free revives
    const personalValuesMap = bEngine.getGameAttribute("PersonalValuesMap");
    if (personalValuesMap?.h && !Object.prototype.hasOwnProperty.call(personalValuesMap.h, "_InstaRevives")) {
        createProxy(personalValuesMap.h, "InstaRevives", {
            get(original) {
                if (cheatState.unlock.revive) return 10;
                return original;
            },
            set(value, backupKey) {
                if (cheatState.unlock.revive) return;
                this[backupKey] = value;
            },
        });
    }

    // Gaming - snail mail (W5)
    const gaming = bEngine.getGameAttribute("Gaming");
    if (gaming && !gaming._isPatched) {
        Object.defineProperty(gaming, "_isPatched", { value: true, enumerable: false });
        createProxy(gaming, 13, {
            get(original) {
                if (cheatState.w5.gaming && cheatConfig.w5.gaming.SnailMail) {
                    return cheatConfig.w5.gaming.SnailMail;
                }
                return original;
            },
            set(value, backupKey) {
                this[backupKey] = value;
            },
        });
    }

    // Divinity - unlinks (W5)
    const divinity = bEngine.getGameAttribute("Divinity");
    if (divinity && !divinity._isPatched) {
        Object.defineProperty(divinity, "_isPatched", { value: true, enumerable: false });
        createProxy(divinity, 38, {
            get(original) {
                if (cheatState.w5.divinity && cheatConfig.w5.divinity.unlinks) {
                    return 1;
                }
                return original;
            },
            set(value, backupKey) {
                this[backupKey] = value;
            },
        });
    }

    // Rift - unlock (W5)
    const rift = bEngine.getGameAttribute("Rift");
    if (rift && !rift._isPatched) {
        Object.defineProperty(rift, "_isPatched", { value: true, enumerable: false });
        createProxy(rift, 1, {
            get(original) {
                const riftIndex = bEngine.getGameAttribute("Rift")[0];
                if (cheatState.unlock.rifts && cList.RiftStuff[4][riftIndex] !== 9) {
                    return 1e8;
                }
                return original;
            },
            set(value, backupKey) {
                this[backupKey] = value;
            },
        });
    }

    // Currencies - teleports, tickets, obol fragments, silver pens
    const currencies = bEngine.getGameAttribute("CurrenciesOwned")?.h;
    if (currencies && !currencies._isPatched) {
        Object.defineProperty(currencies, "_isPatched", { value: true, enumerable: false });
        bEngine.getGameAttribute("CurrenciesOwned").h = new Proxy(currencies, {
            get(obj, prop) {
                if (cheatState.unlock.teleports && prop === "WorldTeleports") return obj.WorldTeleports || 1;
                if (cheatState.unlock.tickets && prop === "ColosseumTickets") return obj.ColosseumTickets || 1;
                if (cheatState.unlock.obolfrag && prop === "ObolFragments") return obj.ObolFragments || 9001;
                if (cheatState.unlock.silvpen && prop === "SilverPens") return obj.SilverPens || 1;
                return obj[prop];
            },
            set(obj, prop, value) {
                if (cheatState.unlock.teleports && prop === "WorldTeleports") return true;
                if (cheatState.unlock.tickets && prop === "ColosseumTickets") {
                    if (obj.ColosseumTickets < value) obj.ColosseumTickets = value;
                    return true;
                }
                if (cheatState.unlock.silvpen && prop === "SilverPens") {
                    if (obj.SilverPens < value) obj.SilverPens = value;
                    return true;
                }
                if (cheatState.unlock.obolfrag && prop === "ObolFragments") {
                    if (obj.ObolFragments < value) obj.ObolFragments = value;
                    return true;
                }
                obj[prop] = value;
                return true;
            },
        });
    }

    // Cloud save cooldown - pause cloud saving
    const cloudSave = bEngine.getGameAttribute("CloudSaveCD");
    if (cloudSave && !cloudSave._isPatched) {
        Object.defineProperty(cloudSave, "_isPatched", { value: true, enumerable: false });
        bEngine.setGameAttribute(
            "CloudSaveCD",
            new Proxy(cloudSave, {
                get(obj, prop) {
                    if (cheatState.cloudz && Number(prop) === 0) return 235;
                    return Reflect.get(obj, prop);
                },
                set(obj, prop, value) {
                    if (cheatState.cloudz && Number(prop) === 0) {
                        obj[0] = 235;
                        return true;
                    }
                    return Reflect.set(obj, prop, value);
                },
            })
        );
    }

    // Monster respawn time
    if (!Object.prototype.hasOwnProperty.call(bEngine.gameAttributes.h, "_MonsterRespawnTime")) {
        createProxy(bEngine.gameAttributes.h, "MonsterRespawnTime", {
            set(value, backupKey) {
                this[backupKey] = cheatState.godlike.respawn ? cheatConfig?.godlike?.respawn?.(value) ?? value : value;
            },
        });
    }

    // Options list account - toggles, unlocks, and caps
    const optionsListAccount = bEngine.gameAttributes.h.OptionsListAccount;
    if (optionsListAccount && !optionsListAccount._isPatched) {
        Object.defineProperty(optionsListAccount, "_isPatched", { value: true, enumerable: false });

        bEngine.gameAttributes.h.OptionsListAccount = new Proxy(optionsListAccount, {
            get(obj, prop) {
                const index = Number(prop);

                // Toggle cheats - return fixed value when enabled
                if (cheatState.unban && index === 26) return 0;
                if (cheatState.wide.eventitems && index === 29) return 0;
                if (cheatState.minigames && index === 33) return 1;
                if (cheatState.unlock.quickref && index === 34) return 0;
                if (cheatState.w4.spiceclaim && index === 100) return 0;
                if (cheatState.unlock.islands && index === 169) return cheatConfig.unlock.islands; // ||?? obj[prop];
                if (cheatState.w2.boss && index === 185 && obj[prop] === 10) return 0;
                if (cheatState.wide.eventspins && index === 325) return 10;
                if (cheatState.w6.emperor && index === 370) return -10;
                if (cheatState.w3.jeweledcogs && index === 414) return 0;

                return obj[prop];
            },
            set(obj, prop, value) {
                const index = Number(prop);

                // Toggle cheats - block writes when enabled
                if (cheatState.unban && index === 26) return true;
                if (cheatState.wide.eventitems && index === 29) return true;
                if (cheatState.minigames && index === 33) return true;
                if (cheatState.unlock.quickref && index === 34) return true;
                if (cheatState.w4.spiceclaim && index === 100) return true;
                if (cheatState.unlock.islands && index === 169) return true;
                if (cheatState.wide.eventspins && index === 325) return true;
                if (cheatState.w6.emperor && index === 370) return true;
                if (cheatState.w3.jeweledcogs && index === 414) return true;

                // Credit/flurbo caps
                if (index === 71 || index === 72) {
                    obj[prop] = applyMaxCap(value, "creditcap");
                    return true;
                }
                if (index === 73) {
                    obj[prop] = applyMaxCap(value, "flurbocap");
                    return true;
                }

                // Bones caps
                if (index === 329) {
                    obj[prop] = applyMaxCap(value, "totalbones", true);
                    return true;
                }
                if (index >= 330 && index <= 333) {
                    obj[prop] = applyMaxCap(value, "bones", true);
                    return true;
                }

                // Dust caps
                if (index >= 357 && index <= 361) {
                    obj[prop] = applyMaxCap(value, "dust", true);
                    return true;
                }
                if (index === 362) {
                    obj[prop] = applyMaxCap(value, "totaldust", true);
                    return true;
                }

                // Tach caps
                if (index >= 388 && index <= 393) {
                    obj[prop] = applyMaxCap(value, "tach", true);
                    return true;
                }
                if (index === 394) {
                    obj[prop] = applyMaxCap(value, "totaltach", true);
                    return true;
                }

                obj[prop] = value;
                return true;
            },
        });
    }

    // Trapping (instant trap completion)
    const playerDatabase = bEngine.getGameAttribute("PlayerDATABASE")?.h;
    if (playerDatabase && !playerDatabase._isPatched) {
        Object.defineProperty(playerDatabase, "_isPatched", { value: true, enumerable: false });

        for (const name in playerDatabase) {
            for (const trap of playerDatabase[name].h.PldTraps) {
                if (!trap) continue;

                let elapsedTime = trap[2];

                Object.defineProperty(trap, 2, {
                    get() {
                        return elapsedTime;
                    },
                    set(value) {
                        if (cheatState.w3.trapping) {
                            if (value <= 0) {
                                elapsedTime = 0;
                            } else {
                                elapsedTime = cheatConfig.w3.trapping(value - elapsedTime) + elapsedTime;
                            }
                        } else {
                            elapsedTime = value;
                        }
                    },
                    enumerable: true,
                    configurable: true,
                });
            }
        }
    }

    // Alchemy (vial attempts)
    const p2w = bEngine.getGameAttribute("CauldronP2W");
    if (p2w && !p2w._isPatched) {
        Object.defineProperty(p2w, "_isPatched", { value: true, enumerable: false });
        createProxy(p2w[5], 0, {
            get(original) {
                return cheatState.w2.vialattempt ? this[1] : original;
            },
            set(value, backupKey) {
                if (cheatState.w2.vialattempt) return;
                this[backupKey] = value;
            },
        });
    }
}
