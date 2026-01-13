/**
 * Dangerous Cheats
 *
 * High-risk cheats that can damage your account:
 * - wipe (inv, chest, forge, overpurchases, cogs)
 * - class (change character class)
 * - lvl (change skill/alchemy levels)
 * - bulk (drop items by type)
 * - buy (gem shop packs)
 * Dynamic cheats (bulk, buy) need game data and are registered via registerDynamicDangerousCheats().
 */

import { registerCheat, registerCheats } from "../core/registration.js";
import { bEngine, itemDefs, CList } from "../core/globals.js";
import { cheatConfig } from "../core/state.js";
import { dropOnChar } from "../helpers/dropOnChar.js";
import { knownBundles, skillTypes, alchemyTypes } from "../constants.js";

// Wipe command handlers
const wipeHandlers = {
    inv() {
        const wipedef = bEngine.getGameAttribute("InventoryOrder");
        for (const index of Object.keys(wipedef)) wipedef[index] = "Blank";
        return "The inventory has been wiped.";
    },
    invslot(params) {
        const wipedef = bEngine.getGameAttribute("InventoryOrder");
        if (!params[1]) return "Specify a slot number.";
        if (params[1] < 0 || params[1] > wipedef.length) return "Invalid slot.";
        wipedef[params[1]] = "Blank";
        return "Wipe inventory slot could result in a crash: Should be fine after restart.";
    },
    chest() {
        const wipedef = bEngine.getGameAttribute("ChestOrder");
        for (const index of Object.keys(wipedef)) wipedef[index] = "Blank";
        return "Wipe chest could result in a crash: Should be fine after restart.";
    },
    chestslot(params) {
        const wipedef = bEngine.getGameAttribute("ChestOrder");
        if (!params[1]) return "Specify a slot number.";
        if (params[1] < 0 || params[1] > wipedef.length) return "Invalid slot.";
        wipedef[params[1]] = "Blank";
        return "Wipe chest slot could result in a crash: Should be fine after restart.";
    },
    forge() {
        const forgeOrder = bEngine.getGameAttribute("ForgeItemOrder");
        const forgeQty = bEngine.getGameAttribute("ForgeItemQuantity");
        for (const index of Object.keys(forgeOrder)) {
            forgeOrder[index] = "Blank";
            forgeQty[index] = 0;
        }
        return "The forge has been wiped. \nIf the game crashes, it should be fine after restart.";
    },
    overpurchases() {
        bEngine.getGameAttribute("GemItemsPurchased");
        const gemShopInfo = CList.MTXinfo;
        const maxItems = [];
        for (const tab of gemShopInfo) {
            for (const tabGroup of tab) {
                for (const item of tabGroup) {
                    if (item[4] > 0 && item[5] > 0) {
                        maxItems[item[4]] = item[5];
                    }
                }
            }
        }
        for (const [index, numberAllowed] of maxItems.entries()) {
            if (bEngine.getGameAttribute("GemItemsPurchased")[index] > numberAllowed) {
                bEngine.getGameAttribute("GemItemsPurchased")[index] = numberAllowed;
            }
        }
        return "Overpurchased items have been set to their max safe value.";
    },
    cogs(params) {
        if (parseInt(params[1])) {
            cheatConfig.wipe.cogs = parseInt(params[1]);
        } else {
            bEngine.gameAttributes.h.CogOrder.forEach((v, k) => {
                const playerCount = bEngine.gameAttributes.h.CogOrder.slice(100)
                    .toString()
                    .match(/Player/g).length;
                const threshold = 100 + playerCount - 1 + parseInt(cheatConfig.wipe.cogs);
                if (typeof v === "string" && k > threshold && !v.includes("Player")) {
                    bEngine.gameAttributes.h.CogOrder[k] = "Blank";
                    bEngine.gameAttributes.h.CogMap[k]
                        .keys()
                        .keys.forEach((a) => delete bEngine.gameAttributes.h.CogMap[k].h[a]);
                }
            });
        }
        return "Cogs wiped.";
    },
};

/**
 * Wipe function dispatcher.
 * @param {Array} params - Command parameters
 * @returns {string} Result message
 */
function wipeFunction(params) {
    const handler = wipeHandlers[params[0]];
    if (handler) return handler(params);
    return "Unknown sub-command given\nKnown sub-commands are 'inv', 'chest', 'forge'.";
}

/**
 * Change skill level function.
 * @param {Array} params - Command parameters
 * @returns {string} Result message
 */
function changeLv0(params) {
    const lvltype = params[0];
    const setlvl = parseInt(params[1]) || -1;
    if (setlvl === -1) return "The lvl value has to be numeric!";

    if (lvltype in skillTypes) {
        bEngine.getGameAttribute("Lv0")[skillTypes[lvltype]] = setlvl;
    }
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
    const setlvl = params[1] || 1000;
    if (!(params[0] in alchemyTypes)) {
        return `Wrong sub-command, use one of these:\n${Object.keys(alchemyTypes).join(", ")}`;
    }

    const tochange = bEngine.getGameAttribute("CauldronInfo")[alchemyTypes[params[0]]];
    if (params[0] === "upgrade") {
        for (const arr of Object.values(tochange)) {
            for (const item of Object.values(arr)) item[1] = setlvl;
        }
        return `All cauldron upgrades set to lvl ${setlvl}`;
    }
    for (const index of Object.keys(tochange)) tochange[index] = setlvl;
    return `All ${params[0]} levels have changed to ${setlvl}.`;
}

// Wipe commands
registerCheats({
    name: "wipe",
    message: "Wipe certain stuff from your account. Use with caution!",
    subcheats: [
        { name: "inv", message: "Wipe your inventory.", fn: wipeFunction },
        { name: "invslot", message: "Wipe your inventory slot (0-indexed)", fn: wipeFunction },
        { name: "chest", message: "Wipe your chest.", fn: wipeFunction },
        { name: "chestslot", message: "Wipe your chest slot (0-indexed)", fn: wipeFunction },
        { name: "forge", message: "Wipe your forge.", fn: wipeFunction },
        { name: "overpurchases", message: "Set overpurchased gem shop items to max safe value.", fn: wipeFunction },
        { name: "cogs", message: "Remove all unused cogs", fn: wipeFunction },
    ],
});

// Class change
registerCheat(
    "class",
    function (params) {
        let ClassId = parseInt(params[0]) || -1;
        if (ClassId === -1) return "Class Id has to be a numeric value!";
        if (ClassId > 50 || ClassId < 0) ClassId = 1; // A small fail-safe
        bEngine.setGameAttribute("CharacterClass", ClassId);
        return `Class id has been changed to ${ClassId}`;
    },
    "!danger! Change character class to this id"
);

// Level change - generate basic skill subcheats from skillTypes
const basicSkillSubcheats = Object.keys(skillTypes).map((skill) => ({
    name: skill,
    message: `Change the ${skill} lvl to this value`,
    fn: changeLv0,
}));

// Alchemy subcheats - generated from alchemyTypes
const alchemySubcheats = Object.keys(alchemyTypes).map((type) => ({
    name: type,
    message: `!danger! Change all ${type} lvls to this value`,
    fn: alchFn,
}));

// Custom level changers with special logic
const customLevelChangers = [
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
        fn: createLevelChanger("Stamp levels", (lvl) => {
            const LevelsMax = bEngine.getGameAttribute("StampLevelMAX");
            const Levels = bEngine.getGameAttribute("StampLevel");
            for (const [i, arr] of Object.entries(LevelsMax)) {
                for (const j of Object.keys(arr)) LevelsMax[i][j] = Levels[i][j] = lvl;
            }
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
];

registerCheats({
    name: "lvl",
    message: "Change the lvl of a skill or alchemy type to this value",
    subcheats: [...basicSkillSubcheats, ...alchemySubcheats, ...customLevelChangers],
});

/**
 * Register bulk and buy cheats.
 * These need to be registered after game is ready because they use dynamic data.
 * @param {object} gameWindow - The game window context
 */
export function registerDynamicDangerousCheats(gameWindow) {
    // Build item types set from itemDefs
    const itemTypes = new Set();
    for (const entry of Object.values(itemDefs)) {
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
    for (const [key] of Object.entries(bundleMessages)) {
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
