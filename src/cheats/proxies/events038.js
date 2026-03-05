/**
 * Events 038 Proxies
 *
 * Proxies for ActorEvents_38 (inventory item interactions):
 * - Item move (candy use anywhere, divinity pearl unlock, afkitemtime multiplier)
 * - Item misc (mystery stone stat targeting)
 */

import { cheatState, cheatConfig } from "../core/state.js";
import { itemDefs, events, gga } from "../core/globals.js";

// Hours granted per single use, keyed by item ID (sorted numerically).
export const AFX_ITEM_HOURS = {
    Quest90: 2,  // Blinding Lantern
    Quest96: 1,  // Aethermoon
    Quest97: 1,  // Charred Bone
    Quest101: 1, // Arcane Rock
    Quest115: 2, // Half Finished Research Paper
};
const AFX_ITEMS = new Set(Object.keys(AFX_ITEM_HOURS));

/**
 * Setup all ActorEvents_38 proxies.
 */
export function setupEvents038Proxies() {
    setupItemMoveProxy();
    setupAfkItemProxies();
    setupItemMiscProxy();
}

/**
 * Shared afkitemtime multi-call logic.
 * Stacks the per-use AFK effect of USABLE items to match cheatConfig.wide.afkitemtime.
 * The first call is synchronous; extra calls are deferred in batches via setTimeout
 * to avoid blocking the main thread.
 *
 * @param {Function} baseFn - The original event function
 * @param {object} ctx - `this` context
 * @param {Array} args - Original args
 * @param {number} dragId - Inventory slot index
 * @param {string} itemKey - Item key
 */
function applyAfkItemMultiCall(baseFn, ctx, args, dragId, itemKey) {
    const hoursPerUse = AFX_ITEM_HOURS[itemKey] ?? 1;
    const targetHours = Number(cheatConfig.wide.afkitemtime) || hoursPerUse;
    const extraCalls = Math.max(0, Math.round(targetHours / hoursPerUse) - 1);

    const savedQty = gga.ItemQuantity[dragId];
    const result = Reflect.apply(baseFn, ctx, args);

    if (extraCalls > 0) {
        // Defer extra calls to avoid blocking the main thread.
        // The first (synchronous) call already gives visual feedback;
        // the rest are batched in subsequent event-loop ticks.
        const BATCH = 10;
        let remaining = extraCalls;
        const tick = () => {
            const n = Math.min(remaining, BATCH);
            for (let i = 0; i < n; i++) {
                gga.InventoryOrder[dragId] = itemKey;
                gga.ItemQuantity[dragId] = savedQty;
                Reflect.apply(baseFn, ctx, args);
            }
            remaining -= n;
            if (remaining > 0) setTimeout(tick, 0);
        };
        setTimeout(tick, 0);
    }

    return result;
}

/**
 * Wrap candidate inventory event handlers with afkitemtime logic.
 * Covers InvItem5/6custom and InventoryItem2/3 in case the game routes
 * "hold-to-use" USABLE items through one of these instead of InvItem4custom.
 */
function setupAfkItemProxies() {
    const actorEvents38 = events(38);

    for (const eventName of [
        "_event_InvItem5custom",
        "_event_InvItem6custom",
        "_event_InventoryItem2",
        "_event_InventoryItem3",
    ]) {
        const orig = actorEvents38.prototype[eventName];
        actorEvents38.prototype[eventName] = function (...args) {
            if (cheatState.wide.afkitemtime) {
                const dragId = this.actor.getValue("ActorEvents_38", "_ItemDragID");
                const itemKey = gga.InventoryOrder[dragId];
                if (AFX_ITEMS.has(itemKey)) {
                    return applyAfkItemMultiCall(orig, this, args, dragId, itemKey);
                }
            }
            return Reflect.apply(orig, this, args);
        };
    }
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

        const inventoryOrder = gga.InventoryOrder;
        const dragId = actor.getValue("ActorEvents_38", "_ItemDragID");
        const itemKey = inventoryOrder[dragId];

        if (cheatState.wide.candy) {
            const itemType = itemDefs[itemKey].h.Type;
            if (itemType === "TIME_CANDY") {
                const originalMap = gga.CurrentMap;
                const originalTarget = gga.AFKtarget;
                const pixelHelper = gga.PixelHelperActor;
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
                            gga.AFKtarget = originalTarget;
                            return originalTarget;
                        },
                    };

                    gga.AFKtarget = newTarget;
                }
                gga.CurrentMap = 1;
                const base = Reflect.apply(InvItem4custom, this, args);
                gga.CurrentMap = originalMap;
                gga.AFKtarget = originalTarget;
                return base;
            }
        }

        // cheat for divinitypearl, we skip the ingame and just set the exp to the skill
        if (cheatState.unlock.divinitypearl && itemKey === "Pearl6") {
            if (this._PixelType === 2 && this._DummyType2Dead === 7) {
                const expType = gga.ExpType;
                const exp0 = gga.Exp0;
                const expReq0 = gga.ExpReq0;
                const currentMap = gga.CurrentMap;

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

        // afkitemtime: stack effect for Blinding Lantern / Research Paper
        if (cheatState.wide.afkitemtime && AFX_ITEMS.has(itemKey)) {
            return applyAfkItemMultiCall(InvItem4custom, this, args, dragId, itemKey);
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
        if (cheatState.wide.afkitemtime) {
            const dragId = this.actor.getValue("ActorEvents_38", "_ItemDragID");
            const itemKey = gga.InventoryOrder[dragId];
            if (AFX_ITEMS.has(itemKey)) {
                return applyAfkItemMultiCall(InventoryItem, this, args, dragId, itemKey);
            }
        }
        if (!cheatState.upstones.misc) return Reflect.apply(InventoryItem, this, args);

        const dragId = this.actor.getValue("ActorEvents_38", "_ItemDragID");
        const inventory = gga.InventoryOrder;
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
