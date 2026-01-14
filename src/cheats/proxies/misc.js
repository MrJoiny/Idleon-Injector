/**
 * Miscellaneous Proxies
 *
 * Proxies for various game functions:
 * - Auto loot (instant item pickup, chest/inventory management)
 * - Item move (candy use anywhere, divinity pearl unlock)
 * - No damage (block damage text creation)
 * - Time candy (custom candy duration)
 * - Items menu (preset reset)
 * - Item misc (mystery stone stat targeting)
 * - Ability (no cooldown, no cast time, no mana)
 * - Smithing (free crafting)
 * - Trapping (instant trap completion)
 * - Alchemy (vial attempts)
 * - Quest (free quest requirements)
 * - Firebase storage (companion, party, unban)
 * - Steam achievement (prevent duplicate achievements)
 */

import { cheatState } from "../core/state.js";
import { bEngine, itemDefs, CList, events, behavior } from "../core/globals.js";
import { lootableItemTypes } from "../constants.js";
import { deepCopy } from "../utils/deepCopy.js";
import { createProxy } from "../utils/createProxy.js";
import { getConfig, setConfig } from "./proxyContext.js";

/**
 * Set the cheat config reference.
 * @param {object} config
 */
export function setCheatConfig(config) {
    setConfig(config);
}

/**
 * Setup auto loot proxy (instant item pickup and chest management).
 */
export function setupAutoLootProxy() {
    const actorEvents44 = events(44);
    const actorEvents345 = events(345);
    const cheatConfig = getConfig();

    // Proxy item init for auto loot
    actorEvents44.prototype.init = new Proxy(actorEvents44.prototype.init, {
        apply: function (originalFn, context, argumentsList) {
            const rtn = Reflect.apply(originalFn, context, argumentsList);

            // Easy to read boolean checks
            const dropType = context._DropType;
            const itemType = itemDefs[dropType].h.Type;
            const toChest = cheatConfig.wide.autoloot.itemstochest;
            const playerDropped = context._PlayerDroppedItem !== 0;
            const blockAutoLoot = context._BlockAutoLoot !== 0;
            const safeToLootItem = lootableItemTypes.includes(itemType) || dropType === "Quest110"; // Zenith Clusters
            const inDungeon = context._DungItemStatus !== 0 || actorEvents345._customBlock_Dungon() !== -1;
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
            context._CollectedStatus = 0;
            bEngine.gameAttributes.h.DummyNumber4 = 23.34;
            context._customEvent_ItemPickupInTheFirstPlace();

            // Get coin and card information
            const isCoin = "COIN".includes(dropType);
            const isCard = dropType.substring(0, 5) === "Cards";

            // Deal with coins and cards
            if (isCoin || isCard) {
                const moneyKey = cheatConfig.wide.autoloot.moneytochest && isCoin ? "MoneyBANK" : "Money";
                bEngine.gameAttributes.h[moneyKey] = bEngine.getGameAttribute(moneyKey) + context._DropAmount;
                context._DropAmount = 0;
                context._ImageInst = null;
                behavior.recycleActor(context.actor);
                return;
            }

            // Separate out items for Zenith farming and Material farming
            const zenithFarming =
                (itemType === "STATUE" || dropType === "Quest110") && cheatConfig.wide.autoloot.zenithfarm;
            const materialFarming = itemType === "MONSTER_DROP" && cheatConfig.wide.autoloot.materialfarm;
            if (!toChest || zenithFarming || materialFarming) {
                context._DropAmount = 0;
                context._ImageInst = null;
                behavior.recycleActor(context.actor);
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
                chestOrder[chestSlot] = chestOrder[chestSlot] === "Blank" ? context._DropType : chestOrder[chestSlot];
                chestQuantity[chestSlot] += itemQuantity[inventorySlot];
                itemQuantity[inventorySlot] = 0;
                inventoryOrder[inventorySlot] = "Blank";
            }

            // Zero out values and return
            context._DropAmount = 0;
            context._ImageInst = null;
            behavior.recycleActor(context.actor);
            return rtn;
        },
    });

    // Proxy item get notification
    const hxOverrides = window.HxOverrides;
    events(34).prototype._event_ItemGet = new Proxy(events(34).prototype._event_ItemGet, {
        apply: function (originalFn, context, argumentsList) {
            return cheatState.wide.autoloot &&
                cheatConfig.wide.autoloot.hidenotifications &&
                [0, 1].includes(context._Deployment)
                ? (hxOverrides.remove(bEngine.getGameAttribute("ItemGetPixelQueue"), context.actor),
                  behavior.recycleActor(context.actor))
                : Reflect.apply(originalFn, context, argumentsList);
        },
    });
}

/**
 * Setup no damage proxy (block damage text creation).
 */
export function setupNodmgProxy() {
    const cRA = behavior.createRecycledActor;
    behavior.createRecycledActor = function (id, ...args) {
        if (cheatState.wide.nodmg) {
            if (typeof id === "object") {
                if (id.ID === 10) return null;
            }
        }
        return cRA.apply(this, arguments);
    };
}

/**
 * Setup time candy proxy (custom candy duration).
 */
export function setupTimeCandyProxy() {
    const cheatConfig = getConfig();
    const timeCandy = itemDefs.Timecandy1.h;
    const originalID = timeCandy.ID;

    Object.defineProperty(timeCandy, "ID", {
        get: function () {
            if (cheatState.wide.candytime) {
                const configuredValue = cheatConfig.wide.candytime;
                return !isNaN(configuredValue) ? configuredValue : 600;
            }
            return originalID;
        },
        enumerable: true,
        configurable: true,
    });
}

/**
 * Setup item move proxy (candy anywhere, divinity pearl unlock).
 */
export function setupItemMoveProxy() {
    events(38).prototype._event_InvItem4custom = new Proxy(events(38).prototype._event_InvItem4custom, {
        apply: function (originalFn, context, argumentsList) {
            const inventoryOrder = bEngine.getGameAttribute("InventoryOrder");
            try {
                if (
                    cheatState.wide.candy &&
                    itemDefs[inventoryOrder[context.actor.getValue("ActorEvents_38", "_ItemDragID")]].h.Type ==
                        "TIME_CANDY"
                ) {
                    const originalMap = bEngine.getGameAttribute("CurrentMap");
                    const originalTarget = bEngine.getGameAttribute("AFKtarget");
                    bEngine.getGameAttribute("PixelHelperActor")[23].getValue("ActorEvents_577", "_GenINFO")[86] = 1;
                    if (originalTarget == "Cooking" || originalTarget == "Laboratory") {
                        const newTarget = {
                            calls: 0,
                            [Symbol.toPrimitive](hint) {
                                if (this.calls < 2) {
                                    this.calls = this.calls + 1;
                                    return "mushG";
                                }
                                bEngine.setGameAttribute("AFKtarget", originalTarget);
                                return originalTarget;
                            },
                        };

                        bEngine.setGameAttribute("AFKtarget", newTarget);
                    }
                    bEngine.setGameAttribute("CurrentMap", 1);
                    const rtn = Reflect.apply(originalFn, context, argumentsList);
                    bEngine.setGameAttribute("CurrentMap", originalMap);
                    bEngine.setGameAttribute("AFKtarget", originalTarget);
                    return rtn;
                }
            } catch (e) {}
            try {
                if (
                    cheatState.unlock.divinitypearl &&
                    context.actor.getValue("ActorEvents_38", "_PixelType") == 2 &&
                    context.actor.getValue("ActorEvents_38", "_DummyType2Dead") == 7 &&
                    inventoryOrder[context.actor.getValue("ActorEvents_38", "_ItemDragID")] == "Pearl6"
                ) {
                    let calls = 0;
                    const levels = bEngine.gameAttributes.h.Lv0;
                    bEngine.gameAttributes.h.Lv0 = new Proxy(levels, {
                        get: function (target, name) {
                            if (name == bEngine.getGameAttribute("DummyNumber3") && calls < 2) {
                                calls = calls + 1;
                                if (calls == 2) {
                                    bEngine.gameAttributes.h.Lv0 = levels;
                                }
                                return 1;
                            }
                            return target[name];
                        },
                    });
                    return Reflect.apply(argumentsList[0], context, []);
                }
            } catch (e) {}
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });
}

/**
 * Setup items menu proxy (preset reset anywhere).
 */
export function setupItemsMenuProxy() {
    events(312).prototype._event_resetTalPresets = new Proxy(events(312).prototype._event_resetTalPresets, {
        apply: function (originalFn, context, argumentsList) {
            if (cheatState.unlock.presets) {
                const originalMap = bEngine.getGameAttribute("CurrentMap");
                bEngine.setGameAttribute("CurrentMap", 0);
                Reflect.apply(originalFn, context, argumentsList);
                bEngine.setGameAttribute("CurrentMap", originalMap);
                return;
            }
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });
}

/**
 * Setup item misc proxy (mystery stone stat targeting).
 */
export function setupItemMiscProxy() {
    events(38).prototype._event_InventoryItem = new Proxy(events(38).prototype._event_InventoryItem, {
        apply: function (target, thisArg, argumentsList) {
            if (!cheatState.upstones.misc) return Reflect.apply(target, thisArg, argumentsList);

            const dragId = thisArg.actor.getValue("ActorEvents_38", "_ItemDragID");
            const inventory = bEngine.getGameAttribute("InventoryOrder");
            const item = itemDefs[inventory[dragId]].h;

            const isMysteryStone = item.typeGen === "dStone" && item.Effect.startsWith("Mystery_Stat");

            if (isMysteryStone) {
                cheatState.rng = 0.85; // First random roll for Misc stat
                cheatState.rngInt = "high"; // 2nd random roll for positive value

                const rtn = Reflect.apply(target, thisArg, argumentsList);

                cheatState.rng = false;
                cheatState.rngInt = false;
                return rtn;
            }

            return Reflect.apply(target, thisArg, argumentsList);
        },
    });
}

/**
 * Setup ability proxy (no cooldown, no cast time, no mana cost).
 * @param {object} context - The game context
 */
export function setupAbilityProxy(context) {
    const CustomMaps = context["scripts.CustomMaps"];
    const atkMoveMap = deepCopy(context["scripts.CustomMaps"].atkMoveMap.h);
    for (const [key, value] of Object.entries(atkMoveMap)) {
        value.h.cooldown = 0;
        value.h.castTime = 0.1;
        value.h.manaCost = 0;
        atkMoveMap[key] = value;
    }
    const handler = {
        get: function (obj, prop) {
            if (cheatState.godlike.ability) return atkMoveMap[prop];
            return Reflect.get(...arguments);
        },
    };
    const proxy = new Proxy(CustomMaps.atkMoveMap.h, handler);
    CustomMaps.atkMoveMap.h = proxy;
}

/**
 * Setup smithing proxy (free crafting).
 * @param {object} context - The game context
 */
export function setupSmithProxy(context) {
    const sizeref = CList.ItemToCraftEXP;
    const tCustomList = context["scripts.CustomLists"];

    const NewReqs = []; // New Array where we write our stuff to
    const size = []; // Array lengths (amount of items per smithing tab)
    for (const [index, element] of Object.entries(sizeref)) size.push(element.length);
    // Double square brackets since each item could require multiple materials
    for (let i = 0; i < size.length; i++) NewReqs.push(new Array(size[i]).fill([["Copper", "0"]]));
    const handler = {
        apply: function (originalFn, context, argumentsList) {
            if (cheatState.w1.smith) return NewReqs;
            return Reflect.apply(originalFn, context, argumentsList);
        },
    };
    const proxy = new Proxy(tCustomList.ItemToCraftCostTYPE, handler);
    tCustomList.ItemToCraftCostTYPE = proxy;
}

/**
 * Setup trapping proxy (instant trap completion).
 */
export function setupTrappingProxy() {
    const cheatConfig = getConfig();
    const playerDatabase = bEngine.getGameAttribute("PlayerDATABASE").h;
    for (const name in playerDatabase) {
        for (const PldTrap of playerDatabase[name].h.PldTraps) {
            if (!PldTrap) continue;

            let elapsed_time = PldTrap[2];

            Object.defineProperty(PldTrap, 2, {
                get: function () {
                    return elapsed_time;
                },

                set: function (value) {
                    if (cheatState.w3.trapping) {
                        if (value <= 0) {
                            elapsed_time = 0;
                        } else {
                            elapsed_time = cheatConfig.w3.trapping(value - elapsed_time) + elapsed_time;
                        }
                    } else {
                        elapsed_time = value;
                    }
                },
                enumerable: true,
                configurable: true,
            });
        }
    }
}

/**
 * Setup alchemy proxy (vial attempts).
 */
export function setupAlchProxy() {
    const p2w = bEngine.getGameAttribute("CauldronP2W");

    if (p2w._isPatched) return;
    Object.defineProperty(p2w, "_isPatched", { value: true, enumerable: false });

    createProxy(p2w[5], 0, {
        get: function (original) {
            return cheatState.w2.vialattempt ? this[1] : original;
        },
        set: function (value, backupKey) {
            if (cheatState.w2.vialattempt) return;
            this[backupKey] = value;
        },
    });
}

/**
 * Setup quest proxy (free quest requirements).
 * @param {object} context - The game context
 */
export function setupQuestProxy(context) {
    const cheatConfig = getConfig();
    const dialogueDefs = context["scripts.DialogueDefinitions"].dialogueDefs.h;
    const dialogueDefsOriginal = deepCopy(dialogueDefs);
    const dialogueDefsUpdated = deepCopy(dialogueDefs);
    // Go over all the quest-giving NPCs
    for (const [key, value] of Object.entries(dialogueDefsUpdated))
        for (
            let i = 0;
            i < value[1].length;
            i++ // Go over all the addLine elements of that NPC
        )
            // Notice that inside each value (e.g. NPC object), the 1st element is where all numeric stuff reside
            // The 0th element holds the textual dialogue, which is not what we're looking for
            if (value[1][i].length == 9) {
                // Both addLine_ItemsAndSpaceRequired and addLine_Custom have nine elements within
                // Iterate over an unknown amount of req. values/Arrays
                if (value[1][i][2] === value[1][i][8])
                    // This is addLine_Custom
                    for (let j = 0; j < value[1][i][3].length; j++) {
                        dialogueDefsUpdated[key][1][i][3][j][1] = 0;
                        dialogueDefsUpdated[key][1][i][3][j][3] = 0;
                    }
                else
                    for (
                        let j = 0;
                        j < value[1][i][3].length;
                        j++ // This is addLine_ItemsAndSpaceRequired
                    )
                        dialogueDefsUpdated[key][1][i][3][j] = 0;
            }

    for (const [key, value] of Object.entries(dialogueDefsUpdated)) {
        Object.defineProperty(dialogueDefs, key, {
            get: function () {
                return cheatState.wide.quest ? dialogueDefsUpdated[key] : dialogueDefsOriginal[key];
            },
            enumerable: true,
        });
    }
}

/**
 * Setup Firebase storage proxy (companion, party, unban).
 * @param {object} context - The game context
 */
export function setupCreateElementProxy(context) {
    const firebaseStorage = context.FirebaseStorage;
    const cheatConfig = getConfig();

    const proxyMethod = (methodName, handler) => {
        const originalFn = firebaseStorage[methodName];
        if (typeof originalFn !== "function") return;
        firebaseStorage[methodName] = new Proxy(originalFn, {
            apply: function (target, context, argumentsList) {
                return handler(target, context, argumentsList);
            },
        });
    };

    proxyMethod("deleteCompanion", (target, context, argumentsList) => {
        if (cheatState.w1.companion) {
            return Promise.resolve(1);
        }
        return Reflect.apply(target, context, argumentsList);
    });

    proxyMethod("swapCompanionOrder", (target, context, argumentsList) => {
        if (cheatState.w1.companion) {
            return Promise.resolve(1);
        }
        return Reflect.apply(target, context, argumentsList);
    });

    proxyMethod("setCompanionFollower", (target, context, argumentsList) => {
        if (cheatState.w1.companion) {
            cheatConfig.w1.companion.current = String(argumentsList[0]);
        }
        return Reflect.apply(target, context, argumentsList);
    });

    proxyMethod("getCompanionInfoMe", (target, context, argumentsList) => {
        if (cheatState.w1.companion) {
            if (!cheatConfig.w1.companion.companions) {
                return Array.from({ length: CList.CompanionDB.length }, (_, index) => index);
            }
            const companions = cheatConfig.w1.companion.companions;
            if (typeof companions === "function") {
                return companions();
            }
            return companions;
        }
        return Reflect.apply(target, context, argumentsList);
    });

    proxyMethod("getCurrentCompanion", (target, context, argumentsList) => {
        if (cheatState.w1.companion) {
            return cheatConfig.w1.companion.current;
        }
        return Reflect.apply(target, context, argumentsList);
    });

    proxyMethod("cleanMarkedFiles", (target, context, argumentsList) => {
        if (cheatConfig.unban) {
            return;
        }
        return Reflect.apply(target, context, argumentsList);
    });

    proxyMethod("getPartyMembers", (target, context, argumentsList) => {
        if (!cheatState.wide.autoparty) {
            return Reflect.apply(target, context, argumentsList);
        }

        const resp = Reflect.apply(target, context, argumentsList);
        if (Array.isArray(resp) && resp.length > 0 && resp.length < 10) {
            const playersToAdd = 11 - resp.length;
            const otherPlayers = bEngine.gameAttributes.h.OtherPlayers.h;
            const names = Object.keys(otherPlayers).slice(1, playersToAdd);
            names.forEach(function (name) {
                resp.push([name, resp[0][1], 0]);
            });
        }
        return resp;
    });
}

/**
 * Setup steam achievement proxy (prevent duplicate achievements).
 * @param {object} context - The game context
 */
export function setupSteamAchievementProxy(context) {
    const cheatConfig = getConfig();
    const achieveList = [];
    context.FirebaseStorage.areaCheck = new Proxy(context.FirebaseStorage.areaCheck, {
        apply: function (target, thisArg, args) {
            if (!cheatConfig.steamachieve) return;
            if (achieveList.includes(args[0])) return;
            achieveList.push(args[0]);
            return Reflect.apply(target, thisArg, args);
        },
    });
}

/**
 * Setup all misc proxies that need game context.
 * @param {object} context - The game context
 */
export function setupMiscProxiesWithContext(context) {
    setupAbilityProxy(context);
    setupSmithProxy(context);
    setupQuestProxy(context);
    setupCreateElementProxy(context);
    setupSteamAchievementProxy(context);
}

/**
 * Setup all misc proxies that don't need game context.
 */
export function setupMiscProxies() {
    setupAutoLootProxy();
    setupNodmgProxy();
    setupTimeCandyProxy();
    setupItemMoveProxy();
    setupItemsMenuProxy();
    setupItemMiscProxy();
    setupTrappingProxy();
    setupAlchProxy();
}

/**
 * Initialize all misc proxies.
 * @param {object} config - The cheat config object
 * @param {object} context - The game context
 */
export function initMiscProxies(config, context) {
    setCheatConfig(config);
    setupMiscProxies();
    setupMiscProxiesWithContext(context);
}
