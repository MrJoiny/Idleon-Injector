/**
 * Dangerous Cheats
 *
 * High-risk cheats that can damage your account:
 * - wipe (inv, invslot, chest, chestslot, forge, overpurchases, cogs, ribbon, invlocked, chips, jargems, legends, prisma, exalted, sumdoubler)
 * - class (change character class)
 * - lvl (change skill/alchemy levels)
 * - bulk (drop items by type)
 * - chng (execute arbitrary code)
 * - equipall (equip any item at any class/level)
 */

import { registerCheats, registerCheat } from "../core/registration.js";
import { itemDefs, cList, itemTypes, gga } from "../core/globals.js";
import { dropOnChar } from "../helpers/dropOnChar.js";
import { alchemyTypes } from "../constants.js";
import { cheatConfig } from "../core/state.js";

// Wipe command handlers
const wipeHandlers = {
    inv() {
        const wipedef = gga.InventoryOrder;
        for (const index of Object.keys(wipedef)) wipedef[index] = "Blank";
        return "The inventory has been wiped";
    },
    invslot(params) {
        const wipedef = gga.InventoryOrder;
        const slot = parseInt(params[1]);
        if (isNaN(slot)) return "Specify a valid slot number";
        if (slot < 0 || slot >= wipedef.length) return "Invalid slot";
        wipedef[slot] = "Blank";
        return "Wipe inventory slot could result in a crash: Should be fine after restart";
    },
    chest() {
        const wipedef = gga.ChestOrder;
        for (const index of Object.keys(wipedef)) wipedef[index] = "Blank";
        return "Wipe chest could result in a crash: Should be fine after restart";
    },
    chestslot(params) {
        const wipedef = gga.ChestOrder;
        const slot = parseInt(params[1]);
        if (isNaN(slot)) return "Specify a valid slot number";
        if (slot < 0 || slot >= wipedef.length) return "Invalid slot";
        wipedef[slot] = "Blank";
        return "Wipe chest slot could result in a crash: Should be fine after restart";
    },
    forge() {
        const forgeOrder = gga.ForgeItemOrder;
        const forgeQty = gga.ForgeItemQuantity;
        for (const index of Object.keys(forgeOrder)) {
            forgeOrder[index] = "Blank";
            forgeQty[index] = 0;
        }
        return "The forge has been wiped. \nIf the game crashes, it should be fine after restart";
    },
    overpurchases() {
        const purchased = gga.GemItemsPurchased;
        const gemShopInfo = cList.MTXinfo;
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
            if (purchased[index] > numberAllowed) {
                purchased[index] = numberAllowed;
            }
        }
        return "Overpurchased items have been set to their max safe value";
    },
    cogs() {
        const cogOrder = gga.CogOrder;
        const cogMap = gga.CogMap;
        const startIndex = 108;

        for (let i = startIndex; i < cogOrder.length; i++) {
            if (typeof cogOrder[i] === "string" && cogOrder[i].includes("Player")) {
                continue;
            }

            cogOrder[i] = "Blank";

            if (cogMap[i].h) {
                for (const key of Object.keys(cogMap[i].h)) {
                    delete cogMap[i].h[key];
                }
            }
        }

        return `Cogs wiped.`;
    },
    ribbon() {
        const ribbons = gga.Ribbon;
        for (let i = 0; i <= 27; i++) {
            ribbons[i] = 0;
        }
        return "Ribbon storage (0-27) has been wiped";
    },
    invlocked() {
        const inventoryOrder = gga.InventoryOrder;
        const itemQuantity = gga.ItemQuantity;
        const lockedSlots = gga.LockedSlots;

        let wipedCount = 0;
        for (let i = 0; i < inventoryOrder.length; i++) {
            if (lockedSlots && lockedSlots[i]) continue;
            if (inventoryOrder[i] === "Blank") continue;

            inventoryOrder[i] = "Blank";
            if (itemQuantity) itemQuantity[i] = 0;
            wipedCount++;
        }
        return `Wiped ${wipedCount} non-locked inventory slots.`;
    },
    chips() {
        const lab = gga.Lab;
        const chipsCount = lab[15];
        for (let i = 0; i <= 21; i++) {
            chipsCount[i] = 0;
        }
        return "Lab chips have been wiped";
    },
    jargems() {
        const holes = gga.Holes;
        const gemCounts = holes[24];
        for (let i = 0; i < gemCounts.length; i++) {
            gemCounts[i] = 0;
        }
        return "Jar gems have been wiped";
    },
    legends() {
        const spelunk = gga.Spelunk;
        const legendsArray = spelunk[18];
        for (let i = 0; i < legendsArray.length; i++) {
            legendsArray[i] = 0;
        }
        return "Legend talents have been wiped";
    },
    prisma() {
        const prismaArray = gga.OptionsListAccount[384];
        const prismaAmount = prismaArray.split(",").length - 1;
        gga.OptionsListAccount[383] += prismaAmount * 10;
        gga.OptionsListAccount[384] = "0";

        return "Prisma bubbles have been wiped";
    },
    exalted() {
        gga.Compass[4] = [];
        return "Exalted stamps have been wiped";
    },
    sumdoubler() {
        const sumdoublerArray = gga.Holes[28];
        for (let i = 0; i < sumdoublerArray.length; i++) {
            sumdoublerArray[i] = -1;
        }
        return "Summoning doublers have been wiped";
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
    return "Unknown sub-command given\nKnown sub-commands are 'inv', 'chest', 'forge'";
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

    const tochange = gga.CauldronInfo[alchemyTypes[params[0]]];
    if (params[0] === "cauldronratecap") {
        for (let i = 4; i <= 7; i++) {
            for (let j = 2; j <= 3; j++) {
                tochange[i][j][1] = setlvl;
            }
        }
        return `All cauldron rate and cap set to lvl ${setlvl}`;
    }
    for (const index of Object.keys(tochange)) tochange[index] = setlvl;
    return `All ${params[0]} levels have changed to ${setlvl}.`;
}

// Equip any item at any class/level
// note: this needs to be a registercheats, for the toggle to work
registerCheats({
    name: "equipall",
    message: "!danger! Equip any item at any class/level",
});

// Wipe commands
registerCheats({
    name: "wipe",
    message: "Wipe certain stuff from your account. Use with caution!",
    subcheats: [
        { name: "inv", message: "Wipe your inventory", fn: wipeFunction },
        { name: "invslot", message: "Wipe your inventory slot (0-indexed)", needsParam: true, fn: wipeFunction },
        { name: "chest", message: "Wipe your chest", fn: wipeFunction },
        { name: "chestslot", message: "Wipe your chest slot (0-indexed)", needsParam: true, fn: wipeFunction },
        { name: "forge", message: "Wipe your forge", fn: wipeFunction },
        { name: "overpurchases", message: "Set overpurchased gem shop items to max safe value", fn: wipeFunction },
        { name: "cogs", message: "Remove all unused cogs", fn: wipeFunction },
        { name: "ribbon", message: "Wipe your ribbon storage (0-27)", fn: wipeFunction },
        { name: "invlocked", message: "Wipe your inventory slots that are NOT locked", fn: wipeFunction },
        { name: "chips", message: "Wipe your lab chips", fn: wipeFunction },
        { name: "jargems", message: "Wipe your jar gems", fn: wipeFunction },
        { name: "legends", message: "Wipe your legends", fn: wipeFunction },
        { name: "prisma", message: "Wipe your prisma", fn: wipeFunction },
        { name: "exalted", message: "Wipe your exalted", fn: wipeFunction },
        { name: "sumdoubler", message: "Wipe your summoning doublers", fn: wipeFunction },
    ],
});

// Bulk drop - drop all items of a given type
registerCheat({
    name: "bulk",
    category: "bulk",
    message: "Drop a collection of items at once. Usage: bulk [type] [amount]",
    needsParam: true,
    fn: (params) => {
        const type = params[0];
        const amount = parseInt(params[1]) || 1;

        if (!type || !itemTypes.has(type)) {
            return `Invalid type. Valid types:\n${Array.from(itemTypes).sort().join(", ")}`;
        }

        const blackList = new Set(cList.RANDOlist[64]);
        const itemBlacklist = new Set(cList.RANDOlist[17]);
        let droppedCount = 0;

        for (const [code, entry] of Object.entries(itemDefs)) {
            if (entry.h.Type === type && !blackList.has(code) && !itemBlacklist.has(code)) {
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
    category: "class",
    message: "!danger! Change character class. Usage: class [class_name]",
    needsParam: true,
    fn: (params) => {
        const className = params[0].toLowerCase();
        if (!className) {
            const validClasses = cList.ClassNames.slice(0, 41)
                .map((name, id) => `${name.toLowerCase()} (${id})`)
                .filter((s) => !s.startsWith("blank"))
                .join(", ");
            return `Usage: class [class_name]\nValid classes:\n${validClasses}`;
        }

        // Find class ID by name (case-insensitive)
        const classNames = cList.ClassNames.slice(0, 41);
        const classId = classNames.findIndex((name) => name.toLowerCase() === className);

        if (classId === -1 || className === "blank") {
            return `Invalid class name: ${className}`;
        }

        const displayName = classNames[classId];
        gga.CharacterClass = classId;
        return `Class changed to ${displayName} (ID: ${classId})`;
    },
});

// Build custom level handlers dispatch object
const customLevelHandlers = {
    furnace: (lvl) => {
        gga.FurnaceLevels = [16, lvl, lvl, lvl, lvl, lvl];
        return `Furnace has been changed to ${lvl}.`;
    },
    statue: (lvl) => {
        gga.StatueLevels.forEach((item) => (item[0] = lvl));
        return `Statue has been changed to ${lvl}.`;
    },
    anvil: (lvl) => {
        const Levels = gga.AnvilPAstats;
        [3, 4, 5].forEach((i) => (Levels[i] = lvl));
        gga.AnvilPAstats = Levels;
        return `Anvil levels has been changed to ${lvl}.`;
    },
    talent: (lvl) => {
        const LevelsMax = gga.SkillLevelsMAX;
        const Levels = gga.SkillLevels;
        for (const idx of Object.keys(LevelsMax)) LevelsMax[idx] = Levels[idx] = lvl;
        return `Talent levels has been changed to ${lvl}.`;
    },
    stamp: (lvl) => {
        const LevelsMax = gga.StampLevelMAX;
        const Levels = gga.StampLevel;
        for (const [i, arr] of Object.entries(LevelsMax)) {
            for (const j of Object.keys(arr)) LevelsMax[i][j] = Levels[i][j] = lvl;
        }
        return `Stamp levels has been changed to ${lvl}.`;
    },
    shrine: (lvl) => {
        gga.ShrineInfo.forEach((item) => {
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
        gga.Lv0[0] = lvl;
        return `Class level has been changed to ${lvl}.`;
    }

    // Find skill in cList.SkillNames
    const skillNames = cList.SkillNames || [];
    const skillIndex = skillNames.findIndex((s) => s.toLowerCase() === name);

    if (skillIndex === -1) {
        return null; // Not a skill
    }

    // +1 offset because Lv0[0] is class
    gga.Lv0[skillIndex + 1] = lvl;
    return `${skillNames[skillIndex]} level has been changed to ${lvl}.`;
}

// Level change - unified handler for skills, alchemy, and custom changers
registerCheat({
    name: "lvl",
    category: "lvl",
    message: "Change the lvl of a skill or alchemy type to this value",
    needsParam: true,
    fn: (params) => {
        const subcommand = params[0].toLowerCase();
        const value = parseInt(params[1]);

        if (!subcommand) {
            return "Usage: lvl [skill/alchemy/type] [value]";
        }
        if (isNaN(value)) {
            return "The lvl value has to be numeric!";
        }

        // Check if it's an alchemy type
        if (subcommand in alchemyTypes) {
            return alchFn([subcommand, value]);
        }

        // Check if it's a custom changer
        const customHandler = customLevelHandlers[subcommand];
        if (customHandler) {
            return customHandler(value);
        }

        // Check if it's a skill name (from cList.SkillNames)
        const skillResult = handleSkillLevel(subcommand, value);
        if (skillResult) {
            return skillResult;
        }

        return `Invalid skill/type: ${subcommand}`;
    },
});

// A highly dangerous function that lets you manually change in-game variables, like:
// > chng bEngine.getGameAttribute("QuestComplete").h["Secretkeeper1"]=1
registerCheat({
    name: "chng",
    message: "!danger! Execute arbitrary code. Caution advised. Consider chromedebug instead",
    fn: (params) => {
        if (!cheatConfig.chng_enabled) {
            return "chng command is currently disabled in config.js Enable it ONLY if you know what you are doing.";
        }

        try {
            eval(params[0]);
            return `${params[0]}`;
        } catch (error) {
            return `Error: ${error}`;
        }
    },
});
