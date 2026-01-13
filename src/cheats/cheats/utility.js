/**
 * Utility Cheats
 *
 * Information and utility commands:
 * - search (item, monster, talent, smith)
 * - list (bundle, missing_bundle, item, monster, class, card, quest, map, talent, ability, smith, gga, companion, nans)
 * - gga, ggk, egga, eggk (game attribute inspection)
 * - cheats (list available cheats)
 * - qnty (change item quantity)
 */

import { registerCheat, registerCheats, getCheats } from "../core/registration.js";
import { bEngine, itemDefs, monsterDefs, CList } from "../core/globals.js";
import { traverse } from "../utils/traverse.js";
import { blacklist_gga } from "../constants/blacklist.js";

/**
 * Creates a search function for the given definitions object.
 * @param {string} header - Header line for results (e.g., "Id, Item")
 * @param {function} getEntries - Function that returns entries to search
 * @param {function} formatResult - Function to format a matched result (key, name) => string
 * @returns {function} Search function for use as cheat fn
 */
function createSearchFn(header, getEntries, formatResult) {
    return function (params) {
        const query = params.slice(1)?.length ? params.slice(1).join(" ").toLowerCase() : undefined;
        const results = [header];

        for (const [key, name] of getEntries()) {
            const normalizedName = name.replace(/_/g, " ").toLowerCase();
            if (normalizedName.includes(query)) {
                results.push(formatResult(key, normalizedName));
            }
        }

        return results.length > 1 ? results.join("\n") : `No info found for '${query}'`;
    };
}

/**
 * Internal gg_func for gga/ggk commands.
 * @param {Array} params - Command parameters
 * @param {number} mode - 0 for values, 1 for keys
 * @returns {string} Result string
 */
function gg_func(params, mode) {
    const foundVals = [];
    try {
        let gg = bEngine.getGameAttribute(params[0]);
        for (let i = 1; i < params.length; i++) {
            if (gg.h) gg = gg.h[params[i]];
            else if (Array.isArray(gg)) gg = gg[params[i]];
            else break;
        }
        if (typeof gg == "object" || Array.isArray(gg)) {
            if (gg.h) gg = gg.h;
            for (const [index, element] of Object.entries(gg)) {
                if (mode === 0) foundVals.push(`${index}, ${element}`);
                else foundVals.push(`${index}`);
            }
        } else {
            foundVals.push(gg);
        }
        return foundVals.join("\n");
    } catch (error) {
        if (error instanceof TypeError)
            return `This TypeError should appear if you gave a non-iterable value, or wrong query...\n${error}`;
        return `Error: ${error}`;
    }
}

/**
 * Create the list function handler.
 * Must be called with game context bound.
 * @param {Array} params - Command parameters
 * @returns {string} Result string
 */
function createListFunction(params) {
    const formatText = (name) => name.replace(/_/g, " ").toLowerCase();

    const listType = params[0];
    const filterQuery = params[1];
    const results = [];

    const listHandlers = {
        item: () => {
            results.push("Id, ingameName");
            for (const [key, value] of Object.entries(itemDefs)) {
                if (key.startsWith("Cards")) {
                    const desc1 = formatText(value.h.desc_line1);
                    const desc2 = formatText(value.h.desc_line2);
                    const displayName = (desc1 + desc2).replace("filler", "");
                    results.push(`${key}, ${displayName}`);
                    continue;
                }
                const displayName = formatText(value.h.displayName);
                results.push(`${key}, ${displayName}`);
            }
        },

        bundle: () => {
            results.push("Bundle, Message");
            const bundleMessages = this["scripts.CustomMapsREAL"].GemPopupBundleMessages().h;

            for (const [key, value] of Object.entries(bundleMessages)) {
                if (key === "Blank") continue;

                const cleanedMessage = formatText(value);
                results.push(`${key}, ${cleanedMessage}`);
                results.push("\n");
            }
        },

        missing_bundle: () => {
            results.push("Bundle, Message");
            const bundleMessages = this["scripts.CustomMapsREAL"].GemPopupBundleMessages().h;
            const bundlesReceived = bEngine.gameAttributes.h.BundlesReceived.h;

            for (const [key, value] of Object.entries(bundleMessages)) {
                const isNotReceived = bundlesReceived[key] !== 1;
                const isNotBlank = key !== "Blank";

                if (isNotReceived && isNotBlank) {
                    const cleanedMessage = formatText(value);
                    results.push(`${key}, ${cleanedMessage}`);
                    results.push("\n");
                }
            }
        },

        monster: () => {
            results.push("Id, ingameName, HP, Defence, Damage, EXP");
            for (const [key, value] of Object.entries(monsterDefs)) {
                const monsterData = value.h;
                const name = formatText(monsterData.Name);
                const hp = monsterData.MonsterHPTotal;
                const defence = monsterData.Defence;
                const damage = monsterData.Damages[0];
                const exp = monsterData.ExpGiven;

                results.push(`${key}, ${name}, ${hp}, ${defence}, ${damage}, ${exp}`);
            }
        },

        card: () => {
            results.push("Id, Entity, Value, Effect");
            const cardData = CList.CardStuff;

            for (const category of Object.values(cardData)) {
                for (const card of Object.values(category)) {
                    if (!card[0]) continue;

                    const cardId = card[0];
                    const cardValue = card[4];
                    const cardEffect = card[3];
                    const entityName = monsterDefs[cardId]?.h?.Name ?? "Unknown";

                    results.push(`${cardId}, ${entityName}, ${cardValue}, ${cardEffect}`);
                }
            }
        },

        class: () => {
            results.push("Id, ClassName, PromotesTo");
            for (const [index, className] of CList.ClassNames.entries()) {
                const promotions = CList.ClassPromotionChoices[index];
                results.push(`${index}, ${className}, [${promotions}]`);
            }
        },

        quest: () => {
            results.push("Id, QuestName, NPC, QuestlineNo, paramX1");
            for (const [index, questId] of CList.SceneNPCquestOrder.entries()) {
                const questInfo = CList.SceneNPCquestInfo[index].join(", ");
                results.push(`${questId}, ${questInfo}`);
            }
        },

        map: () => {
            results.push("Num_Id, Str_Id, MapName, AFK1, AFK2, Transition");
            for (const [index, mapId] of CList.MapName.entries()) {
                const displayName = CList.MapDispName[index];
                const afkTarget = CList.MapAFKtarget[index];
                const afkTargetSide = CList.MapAFKtargetSide[index];
                const transitions = CList.SceneTransitions[index];

                results.push(`${index}, ${mapId}, ${displayName}, ${afkTarget}, ${afkTargetSide}, [${transitions}]`);
            }
        },

        talent: () => {
            results.push("Order, Id, Name");
            const talentOrder = CList.TalentOrder;
            const talentNames = CList.TalentIconNames;

            for (let i = 0; i < talentOrder.length; i++) {
                const talentId = talentOrder[i];
                const talentName = talentNames[talentId];

                if (talentName !== "_") {
                    results.push(`${i}, ${talentId}, ${talentName}`);
                }
            }
        },

        ability: () => {
            results.push("Order, Id, Name");
            const talentOrder = CList.TalentOrder;
            const talentNames = CList.TalentIconNames;
            const abilityMap = this["scripts.CustomMaps"].atkMoveMap.h;

            for (let i = 0; i < talentOrder.length; i++) {
                const talentId = talentOrder[i];
                const talentName = talentNames[talentId];

                // Only include talents that are abilities (exist in abilityMap)
                const isValidTalent = talentName !== "_";
                const isAbility = abilityMap[talentName];

                if (isValidTalent && isAbility) {
                    results.push(`${i}, ${talentId}, ${talentName}`);
                }
            }
        },

        companion: () => {
            results.push("Id, Name, Effects");
            const companions = CList.CompanionDB;

            for (let i = 0; i < companions.length; i++) {
                const id = companions[i][0];
                const effects = formatText(companions[i][1]);
                const ingameName = formatText(monsterDefs[id]?.h?.Name) ?? "Unknown";
                results.push(`${i}, ${ingameName}, ${effects}`);
            }
        },

        smith: () => {
            results.push("CraftId, Tab, ItemId, ItemName");
            const craftingRecipes = CList.ItemToCraftNAME;

            for (let tabIndex = 0; tabIndex < craftingRecipes.length; tabIndex++) {
                const tab = craftingRecipes[tabIndex];

                for (let recipeIndex = 0; recipeIndex < tab.length; recipeIndex++) {
                    const itemId = tab[recipeIndex];
                    const itemName = formatText(itemDefs[itemId].h.displayName);

                    results.push(`${tabIndex + 1}, ${recipeIndex}, ${itemId}, ${itemName}`);
                }
            }
        },

        gga: () => {
            for (const key of Object.keys(bEngine.gameAttributes.h)) {
                results.push(key);
            }
        },

        nans: () => {
            const findings = [];
            results.push("NaNs scan:");

            const gga = bEngine.gameAttributes.h;
            const globalVisited = new Set();

            for (const key in gga) {
                if (blacklist_gga.has(key)) continue;
                const attributeFindingsCount = findings.length;

                traverse(
                    gga[key],
                    -1,
                    (val, path) => {
                        if (typeof val === "number" && isNaN(val)) {
                            findings.push([key, ...path].join(" > "));
                        }
                    },
                    globalVisited
                );

                if (findings.length > attributeFindingsCount) {
                    results.push(`\nAttribute: [${key}]`);
                    for (let i = attributeFindingsCount; i < findings.length; i++) {
                        results.push(`${findings[i]}`);
                    }
                }
            }
            results.push(findings.length === 0 ? "No NaNs found." : `${findings.length} NaNs found.`);
        },
    };

    const handler = listHandlers[listType];
    if (!handler) {
        const validTypes = Object.keys(listHandlers).join("\n ");
        return `Valid sub-commands are:\n ${validTypes}`;
    }

    handler.call(this);

    // filter if provided
    if (filterQuery) {
        return results.filter((entry) => entry.includes(filterQuery)).join("\n");
    }

    return results.join("\n");
}

/**
 * Register all utility cheats.
 * This function should be called after game is ready.
 */
export function registerUtilityCheats() {
    // Search commands
    registerCheats({
        name: "search",
        message: "Search for an item, monster, talent or smithing recipe",
        subcheats: [
            {
                name: "item",
                message: "Search for an item",
                fn: createSearchFn(
                    "Id, Item",
                    () => Object.entries(itemDefs).map(([k, v]) => [k, v.h.displayName]),
                    (key, name) => `${key} - ${name}`
                ),
            },
            {
                name: "monster",
                message: "Search for a monster",
                fn: createSearchFn(
                    "Id, Monster",
                    () => Object.entries(monsterDefs).map(([k, v]) => [k, v.h.Name]),
                    (key, name) => `${key} - ${name}`
                ),
            },
            {
                name: "talent",
                message: "Search for a talent",
                fn: createSearchFn(
                    "Order, Id, Talent",
                    () => {
                        const talentDefs = CList.TalentIconNames;
                        const Order = CList.TalentOrder;
                        return Order.map((id, i) => [i, talentDefs[id], id]);
                    },
                    (order, name, id) => `${order} - ${id} - ${name}`
                ),
            },
            {
                name: "smith",
                message: "Search for an item to smith",
                fn: function (params) {
                    const query = params.slice(1)?.length ? params.slice(1).join(" ").toLowerCase() : undefined;
                    const results = ["Tab, Id, ItemId, ItemName"];
                    const ItemToCraftNAME = CList.ItemToCraftNAME;

                    // Find matching items first
                    const matchingItems = [];
                    for (const [key, value] of Object.entries(itemDefs)) {
                        const name = value.h.displayName.replace(/_/g, " ").toLowerCase();
                        if (name.includes(query)) matchingItems.push([key, name]);
                    }

                    // Find them in crafting recipes
                    for (const [itemId, itemName] of matchingItems) {
                        for (let tab = 0; tab < ItemToCraftNAME.length; tab++) {
                            for (let slot = 0; slot < ItemToCraftNAME[tab].length; slot++) {
                                if (itemId === ItemToCraftNAME[tab][slot]) {
                                    results.push(`${tab + 1}, ${slot}, ${itemId}, ${itemName}`);
                                }
                            }
                        }
                    }

                    return results.length > 1 ? results.join("\n") : `No info found for '${query}'`;
                },
            },
        ],
    });

    // Get Game Attributes
    registerCheat(
        "gga",
        function (params) {
            return gg_func(params, 0);
        },
        "The attribute you want to get, separated by spaces"
    );

    // Get Game Key
    registerCheat(
        "ggk",
        function (params) {
            return gg_func(params, 1);
        },
        "The key you want to get, separated by spaces"
    );

    // Evaluate Get Game Attributes
    registerCheat(
        "egga",
        function (params) {
            const foundVals = [];
            const atkMoveMap = this["scripts.CustomMaps"].atkMoveMap.h;
            const abilities = bEngine.getGameAttribute("AttackLoadout");
            try {
                let gga = eval(params[0]);
                let obj_gga = Object.entries(gga);
                if (typeof obj_gga == "string" || obj_gga.length == 0) foundVals.push(`${gga}`);
                else for (const [index, element] of obj_gga) foundVals.push(`${index}, ${element}`);
                return foundVals.join("\n");
            } catch (error) {
                if (error instanceof TypeError) return `This TypeError should appear if you gave a non-existing object`;
                return `Error: ${error}`;
            }
        },
        "Show the game attribute, separate with spaces."
    );

    // Evaluate Get Game Key
    registerCheat(
        "eggk",
        function (params) {
            const foundVals = [];
            const atkMoveMap = this["scripts.CustomMaps"].atkMoveMap.h;
            const abilities = bEngine.getGameAttribute("AttackLoadout");
            try {
                let gga = eval(params[0]);
                let obj_gga = Object.entries(gga);
                if (typeof obj_gga == "string" || obj_gga.length == 0) foundVals.push(`Non iterable value: ${gga}`);
                else for (const [index, element] of obj_gga) foundVals.push(`${index}`);
                return foundVals.join("\n");
            } catch (error) {
                if (error instanceof TypeError) return `This TypeError should appear if you gave a non-existing object`;
                return `Error: ${error}`;
            }
        },
        "Show the game key, separate with spaces."
    );

    // List available cheats
    registerCheat(
        "cheats",
        function (params) {
            let cheatsAvailable = [];
            const cheats = getCheats();
            Object.keys(cheats).forEach((cheat) => {
                cheatsAvailable.push(cheat + (cheats[cheat]["message"] ? ` (${cheats[cheat].message})` : ""));
            });
            return cheatsAvailable.join("\n");
        },
        "list available cheats"
    );

    // List command
    registerCheats({
        name: "list",
        message: "list something. third param optional filter",
        subcheats: [
            { name: "bundle", message: "list bundles. third param optional filter", fn: createListFunction },
            { name: "missing_bundle", message: "list missing bundles", fn: createListFunction },
            { name: "item", message: "list items. third param optional filter", fn: createListFunction },
            { name: "monster", message: "list monsters. third param optional filter", fn: createListFunction },
            { name: "class", message: "list classes. third param optional filter", fn: createListFunction },
            { name: "card", message: "list cards. third param optional filter", fn: createListFunction },
            { name: "quest", message: "list quests. third param optional filter", fn: createListFunction },
            { name: "map", message: "list maps. third param optional filter", fn: createListFunction },
            { name: "talent", message: "list talents. third param optional filter", fn: createListFunction },
            { name: "ability", message: "list abilities. third param optional filter", fn: createListFunction },
            { name: "smith", message: "list smithing recipes. third param optional filter", fn: createListFunction },
            { name: "gga", message: "list game attributes. third param optional filter", fn: createListFunction },
            { name: "companion", message: "list all companions", fn: createListFunction },
            { name: "nans", message: "scan game attributes for NaN values", fn: createListFunction },
        ],
    });

    // Quantity change
    registerCheats({
        name: "qnty",
        message: "Change the quantity of the first item in inventory/chest",
        subcheats: [
            {
                name: "inv",
                message: "Change the quantity of the first inventory slot to this value",
                fn: function (params) {
                    const setqnty = params[1] || 1;
                    bEngine.getGameAttribute("ItemQuantity")[0] = setqnty;
                    return `The item quantity in the first inventory slot has been changed to ${setqnty}`;
                },
            },
            {
                name: "chest",
                message: "Change the quantity of the first chest slot to this value",
                fn: function (params) {
                    const setqnty = params[1] || 1;
                    bEngine.getGameAttribute("ChestQuantity")[0] = setqnty;
                    return `The item quantity in the first chest slot has been changed to ${setqnty}`;
                },
            },
        ],
    });
}
