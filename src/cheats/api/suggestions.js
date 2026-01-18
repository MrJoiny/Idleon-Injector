/**
 * Suggestions API
 *
 * Functions for CLI/WebUI autocomplete and confirmation:
 * - getAutoCompleteSuggestions
 * - getChoicesNeedingConfirmation
 */

import { cheats } from "../core/registration.js";
import { summonUnits, keychainStatsMap, alchemyTypes } from "../constants.js";
import { bEngine, itemDefs, monsterDefs, cList, itemTypes } from "../core/globals.js";
import { getAllBundles } from "../helpers/bundles.js";

// Custom level changers for lvl command suggestions
const customLevelChangerNames = ["furnace", "statue", "anvil", "talent", "stamp", "shrine"];

/**
 * Helper to add choices from an object's keys.
 * @param {Array} choices - Target array to push choices to
 * @param {object} source - Source object to iterate keys
 * @param {function} formatter - (key, item) => choice | choice[] | null
 */
function addChoices(choices, source, formatter) {
    if (!source) return;
    for (const key of Object.keys(source)) {
        const result = formatter(key, source[key]);
        if (!result) continue;
        if (Array.isArray(result)) {
            choices.push(...result);
        } else {
            choices.push(result);
        }
    }
}

/**
 * Get autocomplete suggestions for the CLI/WebUI.
 * @returns {Array<{value: string, message: string, category: string}>}
 */
export function getAutoCompleteSuggestions() {
    const choices = [];

    // Add "cheats" as the first choice (default when Enter pressed with empty input)
    if (cheats.cheats) {
        choices.push({
            value: "cheats",
            message: cheats.cheats.message || "list available cheats",
            category: "general",
        });
    }

    // here are items stored that are not visible in the w5 slab
    const itemBlacklist = new Set(cList.RANDOlist[17]);
    itemBlacklist.delete("COIN");

    const allBundles = getAllBundles();

    // cheat commands (skip "cheats" since it's already added as first)
    addChoices(choices, cheats, (name, def) => {
        if (name === "cheats") return null;
        return {
            value: name,
            message: def.message || "",
            category: def.category || "general",
        };
    });

    // item commands (drop, nomore, multiplestacks)
    addChoices(choices, itemDefs, (code, item) => {
        if (!item.h.displayName) return null;
        if (itemBlacklist.has(code)) return null;
        const name = item.h.displayName.replace(/_/g, " ");
        // filtering out ui items named strung jewels
        if (code !== "Quest66" && name === "Strung Jewels") return null;

        return [
            { value: `drop ${code}`, message: name, category: "drop" },
            { value: `nomore ${code}`, message: name, category: "nomore" },
            { value: `multiplestacks ${code}`, message: name, category: "multiplestacks" },
        ];
    });

    // monster spawns
    addChoices(choices, monsterDefs, (code, monster) => {
        if (!monster.h.Name) return null;
        const name = monster.h.Name.replace(/_/g, " ");
        return { value: `spawn ${code}`, message: name, category: "spawn" };
    });

    // summon units
    addChoices(choices, summonUnits, (unit) => ({
        value: `w6 sumunit ${unit}`,
        message: "",
        category: "w6",
    }));

    // keychain stats
    addChoices(choices, keychainStatsMap, (stat) => ({
        value: `keychain ${stat}`,
        message: "",
        category: "keychain",
    }));

    // bulk item types
    for (const type of itemTypes) {
        choices.push({
            value: `bulk ${type}`,
            message: `Drop all ${type} items`,
            category: "bulk",
        });
    }

    // buy bundle codes
    for (const [name, code] of allBundles) {
        choices.push({
            value: `buy ${code}`,
            message: name,
            category: "buy",
        });
    }

    // class names
    if (cList.ClassNames) {
        const classNames = cList.ClassNames.slice(0, 41);
        for (const [id, name] of classNames.entries()) {
            if (!name || name.toLowerCase() === "blank") continue;
            choices.push({
                value: `class ${name.toLowerCase()}`,
                message: `Change to ${name} (ID: ${id})`,
                category: "class",
            });
        }
    }

    // lvl - skills from cList.SkillNames
    if (cList.SkillNames) {
        // Special case: class level at index 0
        choices.push({
            value: "lvl class",
            message: "Change class level",
            category: "lvl",
        });
        for (const name of cList.SkillNames) {
            if (!name || name === "Blank") continue;
            choices.push({
                value: `lvl ${name.toLowerCase()}`,
                message: `Change ${name} level`,
                category: "lvl",
            });
        }
    }

    // lvl - alchemy types (static)
    for (const type of Object.keys(alchemyTypes)) {
        choices.push({
            value: `lvl ${type}`,
            message: `Change all ${type} levels`,
            category: "lvl",
        });
    }

    // lvl - custom changers (static)
    for (const name of customLevelChangerNames) {
        choices.push({
            value: `lvl ${name}`,
            message: `Change all ${name} levels`,
            category: "lvl",
        });
    }

    // game attributes (gga)
    if (bEngine.gameAttributes.h) {
        for (const key of Object.keys(bEngine.gameAttributes.h)) {
            choices.push({
                value: `gga ${key}`,
                message: "",
                category: "gga",
            });
        }
    }

    return choices;
}

/**
 * Get commands that need confirmation/additional input.
 * This is now also used to make a value fields for the ui
 * @returns {string[]}
 */
export function getChoicesNeedingConfirmation() {
    return [
        "drop",
        "spawn",
        "w4 mainframe",
        "w4 chipbonuses",
        "search",
        "wide gembuylimit",
        "wide candytime",
        "gga",
        "multiply",
        "w6 summoning",
        "w6 ninjaItem",
        "lvl",
        "qnty",
        "setalch",
        "wipe invslot",
        "wipe chestslot",
        "bulk",
        "buy",
        "class",
        "multiplestacks",
    ];
}
