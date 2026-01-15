/**
 * Events 038 Proxies
 *
 * Proxies for ActorEvents_38 (inventory item interactions):
 * - Item move (candy use anywhere, divinity pearl unlock)
 * - Item misc (mystery stone stat targeting)
 */

import { cheatState } from "../core/state.js";
import { bEngine, itemDefs, events } from "../core/globals.js";

/**
 * Setup item move proxy (candy anywhere, divinity pearl unlock).
 */
export function setupItemMoveProxy() {
    const actorEvents38 = events(38);
    const InvItem4custom = actorEvents38.prototype._event_InvItem4custom;
    actorEvents38.prototype._event_InvItem4custom = function (...args) {
        const actor = this?.actor;
        if (!actor?.getValue) {
            return Reflect.apply(InvItem4custom, this, args);
        }

        const inventoryOrder = bEngine.getGameAttribute("InventoryOrder");
        const dragId = actor.getValue("ActorEvents_38", "_ItemDragID");
        const itemKey = inventoryOrder?.[dragId];

        if (cheatState.wide.candy) {
            const itemType = itemDefs[itemKey]?.h?.Type;
            if (itemType === "TIME_CANDY") {
                const originalMap = bEngine.getGameAttribute("CurrentMap");
                const originalTarget = bEngine.getGameAttribute("AFKtarget");
                const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
                const genInfo = pixelHelper?.[23]?.getValue?.("ActorEvents_577", "_GenINFO");
                if (Array.isArray(genInfo)) {
                    genInfo[86] = 1;
                }
                if (originalTarget === "Cooking" || originalTarget === "Laboratory") {
                    const newTarget = {
                        calls: 0,
                        [Symbol.toPrimitive](_hint) {
                            if (this.calls < 2) {
                                this.calls++;
                                return "mushG";
                            }
                            bEngine.setGameAttribute("AFKtarget", originalTarget);
                            return originalTarget;
                        },
                    };

                    bEngine.setGameAttribute("AFKtarget", newTarget);
                }
                bEngine.setGameAttribute("CurrentMap", 1);
                const rtn = Reflect.apply(InvItem4custom, this, args);
                bEngine.setGameAttribute("CurrentMap", originalMap);
                bEngine.setGameAttribute("AFKtarget", originalTarget);
                return rtn;
            }
        }

        if (
            cheatState.unlock.divinitypearl &&
            actor.getValue("ActorEvents_38", "_PixelType") === 2 &&
            actor.getValue("ActorEvents_38", "_DummyType2Dead") === 7 &&
            itemKey === "Pearl6"
        ) {
            const levels = bEngine.gameAttributes?.h?.Lv0;
            if (!levels) {
                return Reflect.apply(InvItem4custom, this, args);
            }

            let calls = 0;
            bEngine.gameAttributes.h.Lv0 = new Proxy(levels, {
                get(target, name) {
                    if (name === bEngine.getGameAttribute("DummyNumber3") && calls < 2) {
                        calls++;
                        if (calls === 2) {
                            bEngine.gameAttributes.h.Lv0 = levels;
                        }
                        return 1;
                    }
                    return target[name];
                },
            });

            if (typeof args[0] === "function") {
                return Reflect.apply(args[0], this, []);
            }
        }

        return Reflect.apply(InvItem4custom, this, args);
    };
}

/**
 * Setup item misc proxy (mystery stone stat targeting).
 */
export function setupItemMiscProxy() {
    const actorEvents38 = events(38);
    const InventoryItem = actorEvents38.prototype._event_InventoryItem;
    actorEvents38.prototype._event_InventoryItem = function (...args) {
        if (!cheatState.upstones.misc) return Reflect.apply(InventoryItem, this, args);

        const dragId = this.actor.getValue("ActorEvents_38", "_ItemDragID");
        const inventory = bEngine.getGameAttribute("InventoryOrder");
        const item = itemDefs[inventory[dragId]].h;

        const isMysteryStone = item.typeGen === "dStone" && item.Effect.startsWith("Mystery_Stat");

        if (isMysteryStone) {
            cheatState.rng = 0.85; // First random roll for Misc stat
            cheatState.rngInt = "high"; // 2nd random roll for positive value

            const rtn = Reflect.apply(InventoryItem, this, args);

            cheatState.rng = false;
            cheatState.rngInt = false;
            return rtn;
        }

        return Reflect.apply(InventoryItem, this, args);
    };
}
