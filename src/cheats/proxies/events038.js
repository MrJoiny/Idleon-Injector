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
 * Setup all ActorEvents_38 proxies.
 */
export function setupEvents038Proxies() {
    setupItemMoveProxy();
    setupItemMiscProxy();
}

/**
 * Setup item move proxy (candy anywhere, divinity pearl unlock).
 *
 * NOTE: Intentionally deviates from "base first" pattern in some paths.
 * Candy cheat requires modifying game state before calling base and restoring after.
 * Divinity pearl cheat may need to call a different function entirely.
 */
function setupItemMoveProxy() {
    const actorEvents38 = events(38);
    const InvItem4custom = actorEvents38.prototype._event_InvItem4custom;
    actorEvents38.prototype._event_InvItem4custom = function (...args) {
        const actor = this.actor;

        const inventoryOrder = bEngine.getGameAttribute("InventoryOrder");
        const dragId = actor.getValue("ActorEvents_38", "_ItemDragID");
        const itemKey = inventoryOrder?.[dragId];

        if (cheatState.wide.candy) {
            const itemType = itemDefs[itemKey].h.Type;
            if (itemType === "TIME_CANDY") {
                const originalMap = bEngine.getGameAttribute("CurrentMap");
                const originalTarget = bEngine.getGameAttribute("AFKtarget");
                const pixelHelper = bEngine.getGameAttribute("PixelHelperActor");
                const genInfo = pixelHelper[23].getValue("ActorEvents_577", "_GenINFO");
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
                const base = Reflect.apply(InvItem4custom, this, args);
                bEngine.setGameAttribute("CurrentMap", originalMap);
                bEngine.setGameAttribute("AFKtarget", originalTarget);
                return base;
            }
        }

        // cheat for divinitypearl, we skip the ingame and just set the exp to the skill
        if (cheatState.unlock.divinitypearl && itemKey === "Pearl6") {
            if (this._PixelType === 2 && this._DummyType2Dead === 7) {
                const expType = bEngine.getGameAttribute("ExpType");
                const exp0 = bEngine.getGameAttribute("Exp0");
                const expReq0 = bEngine.getGameAttribute("ExpReq0");
                const currentMap = bEngine.getGameAttribute("CurrentMap");

                let targetSkill;
                if (currentMap === 0) targetSkill = 2;
                else if (currentMap === 50) targetSkill = 5;
                else if (currentMap === 100) targetSkill = 8;
                else targetSkill = expType;

                // Add 40% XP to current skill
                exp0[targetSkill] = Number(exp0[targetSkill]) + 0.4 * Number(expReq0[targetSkill]);

                return; // Skip original function entirely
            }
        }

        return Reflect.apply(InvItem4custom, this, args);
    };
}

/**
 * Setup item misc proxy (mystery stone stat targeting).
 *
 * NOTE: Intentionally deviates from "base first" pattern.
 * Mystery stone cheat requires setting RNG state before calling base
 * to influence the random roll outcome.
 */
function setupItemMiscProxy() {
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

            const base = Reflect.apply(InventoryItem, this, args);

            cheatState.rng = false;
            cheatState.rngInt = false;
            return base;
        }

        return Reflect.apply(InventoryItem, this, args);
    };
}
