/**
 * Events 044 Proxies
 *
 * Proxies for ActorEvents_44 (item drops):
 * - Auto loot (instant item pickup and chest management)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { bEngine, itemDefs, events, behavior } from "../core/globals.js";
import { lootableItemTypes } from "../constants.js";

/**
 * Setup auto loot proxy (instant item pickup and chest management).
 */
export function setupAutoLootProxy() {
    const actorEvents44 = events(44);
    const actorEvents345 = events(345);
    const init = actorEvents44.prototype.init;
    actorEvents44.prototype.init = function (...args) {
        const rtn = Reflect.apply(init, this, args);

        // Easy to read boolean checks
        const dropType = this._DropType;
        const itemType = itemDefs[dropType].h.Type;
        const toChest = cheatConfig.wide.autoloot.itemstochest;
        const playerDropped = this._PlayerDroppedItem !== 0;
        const blockAutoLoot = this._BlockAutoLoot !== 0;
        const safeToLootItem = lootableItemTypes.includes(itemType) || dropType === "Quest110"; // Zenith Clusters
        const inDungeon = this._DungItemStatus !== 0 || actorEvents345._customBlock_Dungon() !== -1;
        const notAnItem = bEngine.getGameAttribute("OptionsListAccount")[83] !== 0 || !itemDefs[dropType];

        // Early Pre-check logic
        if (
            !cheatState.wide.autoloot ||
            inDungeon ||
            notAnItem ||
            playerDropped ||
            blockAutoLoot ||
            !safeToLootItem
        )
            return;

        // Collect item into first open inventory slot
        this._CollectedStatus = 0;
        bEngine.gameAttributes.h.DummyNumber4 = 23.34;
        this._customEvent_ItemPickupInTheFirstPlace();

        // Get coin and card information
        const isCoin = "COIN".includes(dropType);
        const isCard = dropType.substring(0, 5) === "Cards";

        // Deal with coins and cards
        if (isCoin || isCard) {
            const moneyKey = cheatConfig.wide.autoloot.moneytochest && isCoin ? "MoneyBANK" : "Money";
            bEngine.gameAttributes.h[moneyKey] = bEngine.getGameAttribute(moneyKey) + this._DropAmount;
            this._DropAmount = 0;
            this._ImageInst = null;
            behavior.recycleActor(this.actor);
            return;
        }

        // Separate out items for Zenith farming and Material farming
        const zenithFarming =
            (itemType === "STATUE" || dropType === "Quest110") && cheatConfig.wide.autoloot.zenithfarm;
        const materialFarming = itemType === "MONSTER_DROP" && cheatConfig.wide.autoloot.materialfarm;
        if (!toChest || zenithFarming || materialFarming) {
            this._DropAmount = 0;
            this._ImageInst = null;
            behavior.recycleActor(this.actor);
            return rtn;
        }

        // Variable setup for chest and inventory management
        const chestOrder = bEngine.getGameAttribute("ChestOrder");
        const chestQuantity = bEngine.getGameAttribute("ChestQuantity");
        const inventoryOrder = bEngine.getGameAttribute("InventoryOrder");
        const itemQuantity = bEngine.getGameAttribute("ItemQuantity");

        // First open slots for item and blank spot
        const blankSlot = chestOrder.indexOf("Blank");
        const dropSlot = chestOrder.indexOf(dropType);
        let chestSlot = dropSlot !== -1 ? dropSlot : blankSlot;

        // Check if item is on Multiple stacks list
        const items = cheatConfig.multiplestacks?.items ?? new Map();
        // Grab correct slot for multiple stacks
        if (items.has(dropType)) {
            const maxStacks = items.get(dropType);
            let stackCount = 0;
            let chestSlotFound = false;

            for (let i = 0; i < chestOrder.length; i++) {
                if (chestOrder[i] !== dropType) continue;

                stackCount++;
                if (chestQuantity[i] < 1050000000) {
                    chestSlotFound = true;
                    chestSlot = i;
                    break;
                }
                if (stackCount >= maxStacks) {
                    chestSlotFound = true;
                    break;
                }
            }

            if (!chestSlotFound && blankSlot !== -1) chestSlot = blankSlot;
        }

        // Move item from inventory into chest if the slot isn't locked
        let inventorySlot;
        while (
            chestSlot !== -1 &&
            (inventorySlot = inventoryOrder.indexOf(dropType)) !== -1 &&
            !bEngine.getGameAttribute("LockedSlots")[inventorySlot !== -1 ? inventorySlot : 0]
        ) {
            chestOrder[chestSlot] = chestOrder[chestSlot] === "Blank" ? this._DropType : chestOrder[chestSlot];
            chestQuantity[chestSlot] += itemQuantity[inventorySlot];
            itemQuantity[inventorySlot] = 0;
            inventoryOrder[inventorySlot] = "Blank";
        }

        // Zero out values and return
        this._DropAmount = 0;
        this._ImageInst = null;
        behavior.recycleActor(this.actor);
        return rtn;
    };
}
