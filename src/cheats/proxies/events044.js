/**
 * Events 044 Proxies
 *
 * Proxies for ActorEvents_44 (item drops):
 * - Auto loot (instant item pickup and chest management)
 */

import { bEngine, itemDefs, events, behavior } from "../core/globals.js";
import { cheatConfig, cheatState } from "../core/state.js";
import { lootableItemTypes } from "../constants.js";
import { createMethodProxy } from "../utils/proxy.js";

/**
 * Setup auto loot proxy (instant item pickup and chest management).
 */
export function setupAutoLootProxy() {
    const actorEvents44 = events(44);

    createMethodProxy(actorEvents44.prototype, "init", function (base) {
        const handled = processAutoLoot(this);
        if (handled) return;
        return base;
    });
}

/**
 * Processes auto-loot logic for an item drop.
 * Handles validation, pickup, currency processing, and chest transfer.
 *
 * @param {object} context - The `this` context from the ActorEvents_44.init method.
 * @returns {boolean} True if the item was processed/handled, False if it was ignored.
 */
function processAutoLoot(context) {
    const dropType = context._DropType;
    const itemDef = itemDefs[dropType];

    const itemType = itemDef.h.Type;
    const playerDropped = context._PlayerDroppedItem !== 0;
    const blockAutoLoot = context._BlockAutoLoot !== 0;
    const safeToLootItem = lootableItemTypes.includes(itemType) || dropType === "Quest110"; // Zenith Clusters

    // Dungeon check
    const actorEvents345 = events(345);
    const inDungeon = context._DungItemStatus !== 0 || (actorEvents345 && actorEvents345._customBlock_Dungon() !== -1);

    // Not an item check / ingame autoloot enabled
    const autolootEnabled = !bEngine.getGameAttribute("OptionsListAccount")[83];
    const notAnItem = !itemDefs[dropType];

    // Validation Pre-checks
    if (
        !cheatState.wide.autoloot ||
        inDungeon ||
        notAnItem ||
        playerDropped ||
        blockAutoLoot ||
        !safeToLootItem ||
        !autolootEnabled
    ) {
        return false;
    }

    // Collect item into first open inventory slot
    // This triggers the game's internal looting logic (Floor -> Inventory/Cards/Money)
    // Note: Items must successfully enter a free inventory slot before they can be moved to the chest.
    context._CollectedStatus = 0;
    bEngine.gameAttributes.h.DummyNumber4 = 23.34;
    context._customEvent_ItemPickupInTheFirstPlace();

    const isCoin = dropType.includes("COIN");
    const isCard = dropType.startsWith("Cards");

    if (isCard) {
        recycleContextActor(context);
        return true;
    }

    if (isCoin) {
        const moneyKey = cheatConfig.wide.autoloot.moneytochest ? "MoneyBANK" : "Money";
        const currentMoney = bEngine.getGameAttribute(moneyKey) || 0;

        bEngine.setGameAttribute(moneyKey, currentMoney + context._DropAmount);

        recycleContextActor(context);
        return true;
    }

    const toChest = cheatConfig.wide.autoloot.itemstochest;

    // Check specific farming modes that KEEP items in inventory
    const zenithFarming = (itemType === "STATUE" || dropType === "Quest110") && cheatConfig.wide.autoloot.zenithfarm;
    const materialFarming = itemType === "MONSTER_DROP" && cheatConfig.wide.autoloot.materialfarm;

    if (!toChest || zenithFarming || materialFarming) {
        recycleContextActor(context);
        return true;
    }

    // Move to Chest Logic
    // we move only items that we picked up from inventory to chest
    transferItemToChest(dropType);

    recycleContextActor(context);
    return true;
}

/**
 * Transfers a specific item type from Inventory to Chest.
 * Handles finding slots, stacking, and locked slots.
 *
 * @param {string} dropType - The internal ID of the item to move.
 */
function transferItemToChest(dropType) {
    const chestOrder = bEngine.getGameAttribute("ChestOrder");
    const chestQuantity = bEngine.getGameAttribute("ChestQuantity");
    const inventoryOrder = bEngine.getGameAttribute("InventoryOrder");
    const itemQuantity = bEngine.getGameAttribute("ItemQuantity");
    const lockedSlots = bEngine.getGameAttribute("LockedSlots");

    if (!chestOrder || !inventoryOrder) return;

    // Find first blank slot in chest
    const blankSlot = chestOrder.indexOf("Blank");
    const existingSlot = chestOrder.indexOf(dropType);
    let targetChestSlot = existingSlot !== -1 ? existingSlot : blankSlot;

    // Handle "Multiple Stacks" cheat config
    const multiStackItems = cheatConfig.multiplestacks?.items;
    if (multiStackItems && multiStackItems.has(dropType)) {
        targetChestSlot = findMultiStackSlot(
            dropType,
            chestOrder,
            chestQuantity,
            multiStackItems.get(dropType),
            blankSlot
        );
    }

    if (targetChestSlot === -1) return; // No room in chest

    // Move all instances from inventory to chest
    let inventorySlot;
    while ((inventorySlot = inventoryOrder.indexOf(dropType)) !== -1) {
        if (lockedSlots && lockedSlots[inventorySlot]) break;

        if (chestOrder[targetChestSlot] === "Blank") {
            chestOrder[targetChestSlot] = dropType;
        }

        chestQuantity[targetChestSlot] += itemQuantity[inventorySlot];

        itemQuantity[inventorySlot] = 0;
        inventoryOrder[inventorySlot] = "Blank";
    }
}

/**
 * Finds the best slot for items that allow multiple stacks in the chest.
 */
function findMultiStackSlot(dropType, chestOrder, chestQuantity, maxStacks, blankSlot) {
    let stackCount = 0;

    for (let i = 0; i < chestOrder.length; i++) {
        if (chestOrder[i] !== dropType) continue;

        stackCount++;
        // Check if stack is full (1.05B limit is standard safe max)
        if (chestQuantity[i] < 1050000000) {
            return i;
        }

        if (stackCount >= maxStacks) {
            return i; // Return full stack if we hit limit, standard fallback
        }
    }

    return blankSlot;
}

/**
 * Recycles the actor associated with the context.
 */
function recycleContextActor(context) {
    context._DropAmount = 0;
    context._ImageInst = null;
    if (context.actor) {
        behavior.recycleActor(context.actor);
    }
}
