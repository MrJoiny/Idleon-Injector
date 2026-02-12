/**
 * Events 044 Proxies
 *
 * Proxies for ActorEvents_44 (item drops):
 * - Auto loot (instant item pickup and chest management)
 */

import { behavior, events, gga, itemDefs } from "../core/globals.js";
import { cheatConfig, cheatState } from "../core/state.js";
import { lootableItemTypes } from "../constants.js";
import { createMethodProxy } from "../utils/proxy.js";

const MULTI_STACK_SLOT_LIMIT = 1050000000;

/**
 * Setup auto loot proxy (instant item pickup and chest management).
 */
export function setupAutoLootProxy() {
    const actorEvents44 = events(44);

    // Proxy init to handle instant looting and chest transfer on spawn
    createMethodProxy(actorEvents44.prototype, "init", function (base) {
        if (processAutoLoot(this)) return;
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

    const autolootEnabled = !gga.OptionsListAccount[83];

    // Validation Pre-checks
    if (
        !cheatState.wide.autoloot ||
        inDungeon ||
        playerDropped ||
        blockAutoLoot ||
        !safeToLootItem ||
        !autolootEnabled
    ) {
        return false;
    }

    // Let ingame pickup run first; overflow can still go to chest.
    context._CollectedStatus = 0;
    gga.DummyNumber4 = 23.34;
    context._customEvent_ItemPickupInTheFirstPlace();

    const isCoin = dropType.includes("COIN");
    const isCard = dropType.startsWith("Cards");

    if (isCard) {
        recycleContextActor(context);
        return true;
    }

    if (isCoin) {
        const moneyKey = cheatConfig.wide.autoloot.moneytochest ? "MoneyBANK" : "Money";
        const currentMoney = gga[moneyKey] || 0;
        gga[moneyKey] = currentMoney + context._DropAmount;
        recycleContextActor(context);
        return true;
    }

    const toChest = cheatConfig.wide.autoloot.itemstochest;
    const zenithFarming = (itemType === "STATUE" || dropType === "Quest110") && cheatConfig.wide.autoloot.zenithfarm;
    const materialFarming = itemType === "MONSTER_DROP" && cheatConfig.wide.autoloot.materialfarm;

    // Move pickup overflow directly to chest, then transfer picked inventory stacks.
    if (toChest && !zenithFarming && !materialFarming) {
        if (context._DropAmount > 0) {
            transferDropRemainderToChest(context);
            if (context._DropAmount === 0) {
                context._CollectedStatus = 1;
            }
        }

        transferItemToChest(dropType);
    }

    // Overflow protection: if items remain (inventory or chest full),
    // we must NOT recycle the actor or the remaining items will be lost forever.
    if (context._DropAmount > 0) {
        context._CollectedStatus = 0; // Reset status so it remains on ground
        return true;
    }

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
    const chestOrder = gga.ChestOrder;
    const chestQuantity = gga.ChestQuantity;
    const inventoryOrder = gga.InventoryOrder;
    const itemQuantity = gga.ItemQuantity;
    const lockedSlots = gga.LockedSlots;
    const multiStackLimit = getMultiStackLimit(dropType);

    for (let inventorySlot = 0; inventorySlot < inventoryOrder.length; inventorySlot++) {
        if (inventoryOrder[inventorySlot] !== dropType) continue;
        if (lockedSlots && lockedSlots[inventorySlot]) continue;

        const quantityInSlot = Number(itemQuantity[inventorySlot]) || 0;
        if (quantityInSlot <= 0) {
            inventoryOrder[inventorySlot] = "Blank";
            continue;
        }

        const remainingInSlot = moveAmountToChest(dropType, quantityInSlot, chestOrder, chestQuantity, multiStackLimit);
        itemQuantity[inventorySlot] = remainingInSlot;

        if (remainingInSlot === 0) {
            inventoryOrder[inventorySlot] = "Blank";
            continue;
        }

        // No chest room left for this drop type.
        break;
    }
}

/**
 * Moves the on-ground remainder from a drop directly into chest storage.
 *
 * @param {object} context - The drop context from ActorEvents_44.init.
 */
function transferDropRemainderToChest(context) {
    const chestOrder = gga.ChestOrder;
    const chestQuantity = gga.ChestQuantity;
    const multiStackLimit = getMultiStackLimit(context._DropType);

    if (context._DropAmount <= 0) return;

    context._DropAmount = moveAmountToChest(
        context._DropType,
        context._DropAmount,
        chestOrder,
        chestQuantity,
        multiStackLimit
    );
}

/**
 * Moves an amount of a single item type to chest and returns any remainder.
 */
function moveAmountToChest(dropType, amount, chestOrder, chestQuantity, multiStackLimit) {
    let remaining = Number(amount) || 0;

    while (remaining > 0) {
        const targetChestSlot = findChestSlotForDrop(dropType, chestOrder, chestQuantity, multiStackLimit);
        if (targetChestSlot === -1) break;

        if (chestOrder[targetChestSlot] === "Blank") {
            chestOrder[targetChestSlot] = dropType;
        }

        const currentQuantity = Number(chestQuantity[targetChestSlot]) || 0;
        const transferable = getTransferableChestAmount(remaining, currentQuantity, multiStackLimit);
        if (transferable <= 0) break;

        chestQuantity[targetChestSlot] = currentQuantity + transferable;
        remaining -= transferable;
    }

    return remaining;
}

/**
 * Resolves a chest slot for the given drop type.
 */
function findChestSlotForDrop(dropType, chestOrder, chestQuantity, multiStackLimit) {
    const blankSlot = chestOrder.indexOf("Blank");
    const existingSlot = chestOrder.indexOf(dropType);
    if (multiStackLimit == null) {
        return existingSlot !== -1 ? existingSlot : blankSlot;
    }

    return findMultiStackSlot(dropType, chestOrder, chestQuantity, multiStackLimit, blankSlot);
}

/**
 * Calculates how much can be inserted into the resolved chest slot.
 */
function getTransferableChestAmount(remaining, currentQuantity, multiStackLimit) {
    if (multiStackLimit == null) {
        return remaining;
    }

    const freeSpace = MULTI_STACK_SLOT_LIMIT - currentQuantity;
    if (freeSpace <= 0) return 0;

    return Math.min(remaining, freeSpace);
}

/**
 * Returns max stack count for multiplestack item, or null when item is not configured.
 */
function getMultiStackLimit(dropType) {
    const multiStackItems = cheatConfig.multiplestacks?.items;
    if (!multiStackItems || !multiStackItems.has(dropType)) {
        return null;
    }

    return multiStackItems.get(dropType);
}

/**
 * Finds the best slot for items that allow multiple stacks in the chest.
 */
function findMultiStackSlot(dropType, chestOrder, chestQuantity, maxStacks, blankSlot) {
    let stackCount = 0;
    const maxStackCount = Math.max(Number(maxStacks) || 1, 1);

    for (let i = 0; i < chestOrder.length; i++) {
        if (chestOrder[i] !== dropType) continue;

        stackCount++;
        // Check if stack is full (1.05B limit is standard safe max)
        if ((Number(chestQuantity[i]) || 0) < MULTI_STACK_SLOT_LIMIT) {
            return i;
        }
    }

    if (stackCount >= maxStackCount) {
        return -1;
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
