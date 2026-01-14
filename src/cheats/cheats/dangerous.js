/**
 * Dangerous Cheats
 *
 * High-risk cheats that can damage your account:
 * - wipe (inv, chest, forge, overpurchases, cogs)
 * - class (change character class)
 * - lvl (change skill/alchemy levels)
 * - bulk (drop items by type)
 * - chng (execute arbitrary code)
 * - qnty (change item quantities)
 * - equipall (equip any item at any class/level)
 */

import { registerCheats, registerCheat } from "../core/registration.js";
import { bEngine, itemDefs, CList, itemTypes } from "../core/globals.js";
import { cheatConfig } from "../core/state.js";
import { dropOnChar } from "../helpers/dropOnChar.js";
import { alchemyTypes } from "../constants.js";

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

// Equip any item at any class/level
registerCheat({
    name: "equipall",
    message: "!danger! Equip any item at any class/level",
    fn: (params) => {
        for (const [index, element] of Object.entries(itemDefs)) {
            // Any item with Class attribute is set to ALL, and any with lvlReqToEquip set to 1
            if (element.h.Class) itemDefs[index].h.Class = "ALL";
            if (element.h.lvReqToEquip) itemDefs[index].h.lvReqToEquip = 1;
        }
        return `All items can be worn by any class at any level.`;
    },
});

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

// Bulk drop - drop all items of a given type
registerCheat({
    name: "bulk",
    message: "Drop a collection of items at once. Usage: bulk [type] [amount]",
    fn: (params) => {
        const type = params[0];
        const amount = parseInt(params[1]) || 1;

        if (!type || !itemTypes.has(type)) {
            return `Invalid type. Valid types:\n${Array.from(itemTypes).sort().join(", ")}`;
        }

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
});

// Class change - change character class by name
registerCheat({
    name: "class",
    message: "!danger! Change character class. Usage: class [class_name]",
    fn: (params) => {
        const className = params[0]?.toLowerCase();
        if (!className) {
            const validClasses = CList.ClassNames.slice(0, 41)
                .map((name, id) => `${name.toLowerCase()} (${id})`)
                .filter((s) => !s.startsWith("blank"))
                .join(", ");
            return `Usage: class [class_name]\nValid classes:\n${validClasses}`;
        }

        // Find class ID by name (case-insensitive)
        const classNames = CList.ClassNames.slice(0, 41);
        const classId = classNames.findIndex((name) => name.toLowerCase() === className);

        if (classId === -1 || className === "blank") {
            return `Invalid class name: ${className}`;
        }

        const displayName = classNames[classId];
        bEngine.setGameAttribute("CharacterClass", classId);
        return `Class changed to ${displayName} (ID: ${classId})`;
    },
});

// Build custom level handlers dispatch object
const customLevelHandlers = {
    furnace: (lvl) => {
        bEngine.setGameAttribute("FurnaceLevels", [16, lvl, lvl, lvl, lvl, lvl]);
        return `Furnace has been changed to ${lvl}.`;
    },
    statue: (lvl) => {
        bEngine.getGameAttribute("StatueLevels").forEach((item) => (item[0] = lvl));
        return `Statue has been changed to ${lvl}.`;
    },
    anvil: (lvl) => {
        const Levels = bEngine.getGameAttribute("AnvilPAstats");
        [3, 4, 5].forEach((i) => (Levels[i] = lvl));
        bEngine.setGameAttribute("AnvilPAstats", Levels);
        return `Anvil levels has been changed to ${lvl}.`;
    },
    talent: (lvl) => {
        const LevelsMax = bEngine.getGameAttribute("SkillLevelsMAX");
        const Levels = bEngine.getGameAttribute("SkillLevels");
        for (const idx of Object.keys(LevelsMax)) LevelsMax[idx] = Levels[idx] = lvl;
        return `Talent levels has been changed to ${lvl}.`;
    },
    stamp: (lvl) => {
        const LevelsMax = bEngine.getGameAttribute("StampLevelMAX");
        const Levels = bEngine.getGameAttribute("StampLevel");
        for (const [i, arr] of Object.entries(LevelsMax)) {
            for (const j of Object.keys(arr)) LevelsMax[i][j] = Levels[i][j] = lvl;
        }
        return `Stamp levels has been changed to ${lvl}.`;
    },
    shrine: (lvl) => {
        bEngine.getGameAttribute("ShrineInfo").forEach((item) => {
            item[3] = lvl;
            item[4] = 0;
        });
        return `Shrine levels has been changed to ${lvl}.`;
    },
};

/**
 * Handle skill level change by name.
 * @param {string} name - Skill name (lowercase)
 * @param {number} lvl - Level to set
 * @returns {string} Result message
 */
function handleSkillLevel(name, lvl) {
    // Special case: "class" is at index 0 in Lv0
    if (name === "class") {
        bEngine.getGameAttribute("Lv0")[0] = lvl;
        return `Class level has been changed to ${lvl}.`;
    }

    // Find skill in CList.SkillNames
    const skillNames = CList.SkillNames || [];
    const skillIndex = skillNames.findIndex((s) => s.toLowerCase() === name);

    if (skillIndex === -1) {
        return null; // Not a skill
    }

    // +1 offset because Lv0[0] is class
    bEngine.getGameAttribute("Lv0")[skillIndex + 1] = lvl;
    return `${skillNames[skillIndex]} level has been changed to ${lvl}.`;
}

// Level change - unified handler for skills, alchemy, and custom changers
registerCheat({
    name: "lvl",
    message: "Change the lvl of a skill or alchemy type to this value",
    fn: (params) => {
        const subcommand = params[0]?.toLowerCase();
        const value = parseInt(params[1]);

        if (!subcommand) {
            return "Usage: lvl [skill/alchemy/type] [value]";
        }
        if (isNaN(value)) {
            return "The lvl value has to be numeric!";
        }

        // 1. Check if it's an alchemy type
        if (subcommand in alchemyTypes) {
            return alchFn([subcommand, value]);
        }

        // 2. Check if it's a custom changer
        const customHandler = customLevelHandlers[subcommand];
        if (customHandler) {
            return customHandler(value);
        }

        // 3. Check if it's a skill name (from CList.SkillNames)
        const skillResult = handleSkillLevel(subcommand, value);
        if (skillResult) {
            return skillResult;
        }

        return `Invalid skill/type: ${subcommand}`;
    },
});
