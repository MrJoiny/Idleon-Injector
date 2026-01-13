/**
 * Dangerous Cheats
 *
 * High-risk cheats that can damage your account:
 * - wipe (inv, chest, forge, overpurchases, cogs)
 * - class (change character class)
 * - lvl (change skill levels)
 * - setalch (change alchemy levels)
 * - bulk (drop items by type)
 * - buy (gem shop packs)
 */

import { registerCheat, registerCheats } from "../core/registration.js";
import { bEngine, itemDefs, CList } from "../core/globals.js";
import { knownBundles } from "../constants/bundles.js";

// Reference to cheatConfig and dropOnChar (injected at runtime)
let cheatConfig = null;
let dropOnChar = null;
let itemTypes = new Set();

/**
 * Set the cheat config reference.
 * @param {object} config
 */
export function setCheatConfig(config) {
    cheatConfig = config;
}

/**
 * Set the dropOnChar function.
 * @param {function} fn
 */
export function setDropOnChar(fn) {
    dropOnChar = fn;
}

/**
 * Set the item types set.
 * @param {Set} types
 */
export function setItemTypes(types) {
    itemTypes = types;
}

/**
 * Wipe function implementation.
 * @param {Array} params - Command parameters
 * @returns {string} Result message
 */
function wipeFunction(params) {
    if (params[0] === "inv") {
        const wipedef = bEngine.getGameAttribute("InventoryOrder");
        for (const [index, element] of Object.entries(wipedef)) wipedef[index] = "Blank";
        return "The inventory has been wiped.";
    } else if (params[0] === "invslot") {
        const wipedef = bEngine.getGameAttribute("InventoryOrder");
        if (!params[1]) return "Specify a slot number.";
        if (params[1] < 0 || params[1] > wipedef.length) return "Invalid slot.";
        wipedef[params[1]] = "Blank";
        return "Wipe inventory slot could result in a crash: Should be fine after restart.";
    } else if (params[0] == "chest") {
        const wipedef = bEngine.getGameAttribute("ChestOrder");
        for (const [index, element] of Object.entries(wipedef)) wipedef[index] = "Blank";
        return "Wipe chest could result in a crash: Should be fine after restart.";
    } else if (params[0] == "chestslot") {
        const wipedef = bEngine.getGameAttribute("ChestOrder");
        if (!params[1]) return "Specify a slot number.";
        if (params[1] < 0 || params[1] > wipedef.length) return "Invalid slot.";
        wipedef[params[1]] = "Blank";
        return "Wipe chest slot could result in a crash: Should be fine after restart.";
    } else if (params[0] === "forge") {
        for (const [index, element] of Object.entries(bEngine.getGameAttribute("ForgeItemOrder"))) {
            bEngine.getGameAttribute("ForgeItemOrder")[index] = "Blank";
            bEngine.getGameAttribute("ForgeItemQuantity")[index] = 0;
        }
        return "The forge has been wiped. \nIf the game crashes, it should be fine after restart.";
    } else if (params[0] === "overpurchases") {
        bEngine.getGameAttribute("GemItemsPurchased");
        let gemShopInfo = CList.MTXinfo;
        let maxItems = [];
        gemShopInfo.forEach(function (tab) {
            tab.forEach(function (tabGroup) {
                tabGroup.forEach(function (item) {
                    if (item[4] > 0 && item[5] > 0) {
                        maxItems[item[4]] = item[5];
                    }
                });
            });
        });
        maxItems.forEach(function (numberAllowed, index) {
            if (bEngine.getGameAttribute("GemItemsPurchased")[index] > numberAllowed) {
                bEngine.getGameAttribute("GemItemsPurchased")[index] = numberAllowed;
            }
        });
        return "Overpurchased items have been set to their max safe value.";
    } else if (params[0] === "cogs") {
        if (parseInt(params[1])) {
            cheatConfig.wipe.cogs = parseInt(params[1]);
        } else {
            bEngine.gameAttributes.h.CogOrder.forEach(
                (v, k) =>
                    typeof v === "string" &&
                    k >
                        100 +
                            bEngine.gameAttributes.h.CogOrder.slice(100)
                                .toString()
                                .match(/Player/g).length -
                            1 +
                            parseInt(cheatConfig.wipe.cogs) &&
                    !v.includes("Player") &&
                    ((bEngine.gameAttributes.h.CogOrder[k] = "Blank"),
                    bEngine.gameAttributes.h.CogMap[k]
                        .keys()
                        .keys.forEach((a) => delete bEngine.gameAttributes.h.CogMap[k].h[a]))
            );
        }
        return "Cogs wiped.";
    } else return "Unknown sub-command given\nKnown sub-commands are 'inv', 'chest', 'forge'.";
}

/**
 * Change skill level function implementation.
 * @param {Array} params - Command parameters
 * @returns {string} Result message
 */
function changeLv0(params) {
    const lvltype = params[0];
    const setlvl = parseInt(params[1]) || -1;
    if (setlvl == -1) return `The lvl value has to be numeric!`;

    const dictype = {
        class: 0,
        mining: 1,
        smithing: 2,
        chopping: 3,
        fishing: 4,
        alchemy: 5,
        catching: 6,
        trapping: 7,
        construction: 8,
        worship: 9,
    };

    if (Object.keys(dictype).includes(lvltype)) bEngine.getGameAttribute("Lv0")[dictype[lvltype]] = setlvl;
    return `${lvltype} level has been changed to ${setlvl}.`;
}

/**
 * Creates a level changer function with custom setter logic.
 * @param {string} name - Display name for the result message
 * @param {function(number): void} setter - Function to set the level
 * @returns {function} Cheat function
 */
function createLevelChanger(name, setter) {
    return function (params) {
        const setlvl = parseInt(params[1]) || -1;
        if (setlvl === -1) return "The lvl value has to be numeric!";
        setter(setlvl);
        return `${name} has been changed to ${setlvl}.`;
    };
}

/**
 * Alchemy level change function.
 * @param {Array} params - Command parameters
 * @returns {string} Result message
 */
function alchFn(params) {
    const alchdict = {
        orangebubbles: 0,
        greenbubbles: 1,
        purplebubbles: 2,
        yellowbubbles: 3,
        vials: 4,
        color: 5,
        liquids: 6,
        cauldrons: 8,
    };
    const setlvl = params[1] || 1000;
    if (Object.keys(alchdict).includes(params[0])) {
        const tochange = bEngine.getGameAttribute("CauldronInfo")[alchdict[params[0]]];
        if (params[0] === "upgrade") {
            for (const [index1, element1] of Object.entries(tochange))
                for (const [index2, element2] of Object.entries(element1)) tochange[index1][index2][1] = setlvl;
            return `All cauldron upgrades set to lvl ${setlvl}`;
        }
        for (const [index, element] of Object.entries(tochange)) tochange[index] = setlvl;
        return `All ${params[0]} levels have changed to ${setlvl}.`;
    } else return `Wrong sub-command, use one of these:\n${Object.keys(alchdict).join(", ")}`;
}

/**
 * Register all dangerous cheats.
 * This function should be called after game is ready.
 */
export function registerDangerousCheats() {
    // Wipe commands
    registerCheats({
        name: "wipe",
        message: "Wipe certain stuff from your account. Use with caution!",
        subcheats: [
            { name: "inv", message: "Wipe your inventory.", fn: wipeFunction },
            {
                name: "invslot",
                message: "Wipe your inventory slot uses array indexes 0 equals the first slot",
                fn: wipeFunction,
            },
            { name: "chest", message: "Wipe your chest.", fn: wipeFunction },
            {
                name: "chestslot",
                message: "Wipe your chest slot uses array indexes 0 equals the first slot",
                fn: wipeFunction,
            },
            { name: "forge", message: "Wipe your forge.", fn: wipeFunction },
            {
                name: "overpurchases",
                message: "Set all overpurchased items in the gem shop to their max safe value.",
                fn: wipeFunction,
            },
            { name: "cogs", message: "Remove all unused cogs", fn: wipeFunction },
        ],
    });

    // Class change
    registerCheat(
        "class",
        function (params) {
            let ClassId = parseInt(params[0]) || -1;
            if (ClassId == -1) return `Class Id has to be a numeric value!`;
            if (ClassId > 50 || ClassId < 0) ClassId = 1; // A small fail-safe
            bEngine.setGameAttribute("CharacterClass", ClassId);
            return `Class id has been changed to ${ClassId}`;
        },
        "!danger! Change character class to this id"
    );

    // Level change
    registerCheats({
        name: "lvl",
        message: "Change the lvl of this skill to this value",
        subcheats: [
            { name: "class", message: "Change the class lvl to this value", fn: changeLv0 },
            { name: "mining", message: "Change the mining lvl to this value", fn: changeLv0 },
            { name: "smithing", message: "Change the smithing lvl to this value", fn: changeLv0 },
            { name: "chopping", message: "Change the chopping lvl to this value", fn: changeLv0 },
            { name: "fishing", message: "Change the fishing lvl to this value", fn: changeLv0 },
            { name: "alchemy", message: "Change the alchemy lvl to this value", fn: changeLv0 },
            { name: "catching", message: "Change the catching lvl to this value", fn: changeLv0 },
            { name: "trapping", message: "Change the trapping lvl to this value", fn: changeLv0 },
            { name: "construction", message: "Change the construction lvl to this value", fn: changeLv0 },
            { name: "worship", message: "Change the worship lvl to this value", fn: changeLv0 },
            {
                name: "furnace",
                message: "!danger! Change all furnace lvl to this value",
                fn: createLevelChanger("Furnace", (lvl) =>
                    bEngine.setGameAttribute("FurnaceLevels", [16, lvl, lvl, lvl, lvl, lvl])
                ),
            },
            {
                name: "statue",
                message: "!danger! Change all statue lvl to this value",
                fn: createLevelChanger("Statue", (lvl) =>
                    bEngine.getGameAttribute("StatueLevels").forEach((item) => (item[0] = lvl))
                ),
            },
            {
                name: "anvil",
                message: "!danger! Change all anvil lvl to this value",
                fn: createLevelChanger("Anvil levels", (lvl) => {
                    const Levels = bEngine.getGameAttribute("AnvilPAstats");
                    [3, 4, 5].forEach((i) => (Levels[i] = lvl));
                    bEngine.setGameAttribute("AnvilPAstats", Levels);
                }),
            },
            {
                name: "talent",
                message: "!danger! Change all talent lvls to this value",
                fn: createLevelChanger("Talent levels", (lvl) => {
                    const LevelsMax = bEngine.getGameAttribute("SkillLevelsMAX");
                    const Levels = bEngine.getGameAttribute("SkillLevels");
                    for (const idx of Object.keys(LevelsMax)) LevelsMax[idx] = Levels[idx] = lvl;
                }),
            },
            {
                name: "stamp",
                message: "Change all stamp lvls to this value",
                fn: createLevelChanger("Both current and max of all stamp levels have been set", (lvl) => {
                    const LevelsMax = bEngine.getGameAttribute("StampLevelMAX");
                    const Levels = bEngine.getGameAttribute("StampLevel");
                    for (const [i, arr] of Object.entries(LevelsMax))
                        for (const j of Object.keys(arr)) LevelsMax[i][j] = Levels[i][j] = lvl;
                }),
            },
            {
                name: "shrine",
                message: "!danger! Change all shrine lvls to this value",
                fn: createLevelChanger("Shrine levels", (lvl) =>
                    bEngine.getGameAttribute("ShrineInfo").forEach((item) => {
                        item[3] = lvl;
                        item[4] = 0;
                    })
                ),
            },
        ],
    });

    // Alchemy level changes
    registerCheats({
        name: "setalch",
        message: "change alchemy levels",
        subcheats: [
            { name: "orangebubbles", message: "!danger! Change all orange bubble lvls to this value", fn: alchFn },
            { name: "greenbubbles", message: "!danger! Change all green bubble lvls to this value", fn: alchFn },
            { name: "purplebubbles", message: "!danger! Change all purple bubble lvls to this value", fn: alchFn },
            { name: "yellowbubbles", message: "!danger! Change all yellow bubble lvls to this value", fn: alchFn },
            { name: "vials", message: "!danger! Change all vial lvls to this value", fn: alchFn },
            { name: "color", message: "!danger! Change the color?!?! lvls to this value", fn: alchFn },
            { name: "liquids", message: "!danger! Change the liquid cap/rate lvls to this value", fn: alchFn },
            { name: "cauldrons", message: "!danger! Change the cauldron lvls to this value", fn: alchFn },
        ],
    });
}

/**
 * Register bulk and buy cheats.
 * These need to be registered after game is ready because they use dynamic data.
 * @param {object} gameWindow - The game window context
 */
export function registerDynamicDangerousCheats(gameWindow) {
    // Build item types set from itemDefs
    for (const [code, entry] of Object.entries(itemDefs)) {
        if (entry.h?.Type) {
            itemTypes.add(entry.h.Type);
        }
    }

    // Bulk drop commands
    registerCheats({
        name: "bulk",
        message: "Drop a collection of items at once. Usage: bulk [sub-command] [amount]",
        canToggleSubcheats: true,
        subcheats: Array.from(itemTypes)
            .sort()
            .map((type) => ({
                name: type,
                message: `Drop all items of type ${type}`,
                fn: function (params) {
                    if (!dropOnChar) return "dropOnChar not initialized";
                    const amount = parseInt(params[0]) || 1;
                    const blackList = CList.RANDOlist[64];
                    let droppedCount = 0;

                    for (const [code, entry] of Object.entries(itemDefs)) {
                        if (entry.h?.Type === type && !blackList.includes(code)) {
                            dropOnChar(code, amount);
                            droppedCount++;
                        }
                    }
                    return `Dropped ${droppedCount} types of ${type} items (x${amount} each)`;
                },
            })),
    });

    // Gem Pack Cheats - build dynamically from game data
    const bundleMessages = gameWindow["scripts.CustomMapsREAL"]?.GemPopupBundleMessages()?.h || {};
    const allBundles = [...knownBundles];

    // Add any missing bundles from game data
    for (const [key, value] of Object.entries(bundleMessages)) {
        if (key === "Blank") continue;
        if (!allBundles.some((bundle) => bundle[1] === key)) {
            allBundles.push(["Unknown", key]);
        }
    }

    registerCheats({
        name: "buy",
        message: "buy gem shop packs, you get the items from the pack, but no gems and no pets",
        canToggleSubcheats: true,
        subcheats: allBundles.map(([name, code]) => ({
            name: code,
            message: name,
            fn: function () {
                this["FirebaseStorage"].addToMessageQueue("SERVER_CODE", "SERVER_ITEM_BUNDLE", code);
                return `${name} has been bought!`;
            },
        })),
    });
}
