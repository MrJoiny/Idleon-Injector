/**
 * Suggestions API
 *
 * Functions for CLI/WebUI autocomplete:
 * - getAutoCompleteSuggestions
 */

import { cheats } from "../core/registration.js";
import { summonUnits, keychainStatsMap, alchemyTypes, bulkTypeBlacklist } from "../constants.js";
import { itemDefs, monsterDefs, cList, itemTypes, gga } from "../core/globals.js";
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
            ...(def.needsParam && { needsParam: true }),
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
            { value: `drop ${code}`, message: name, category: "drop", needsParam: true },
            { value: `nomore ${code}`, message: name, category: "nomore" },
            { value: `multiplestacks ${code}`, message: name, category: "multiplestacks", needsParam: true },
        ];
    });

    // monster spawns
    addChoices(choices, monsterDefs, (code, monster) => {
        if (!monster.h.Name) return null;
        const name = monster.h.Name.replace(/_/g, " ");
        return { value: `spawn ${code}`, message: name, category: "spawn", needsParam: true };
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
        if (bulkTypeBlacklist.has(type)) continue;
        choices.push({
            value: `bulk ${type}`,
            message: `Drop all ${type} items`,
            category: "bulk",
            needsParam: true,
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
    const classNames = cList.ClassNames.slice(0, 41);
    for (const [id, name] of classNames.entries()) {
        if (!name || name.toLowerCase() === "blank") continue;
        choices.push({
            value: `class ${name.toLowerCase()}`,
            message: `Change to ${name} (ID: ${id})`,
            category: "class",
        });
    }

    // lvl - skills from cList.SkillNames

    // Special case: class level at index 0
    choices.push({
        value: "lvl class",
        message: "Change class level",
        category: "lvl",
        needsParam: true,
    });
    for (const name of cList.SkillNames) {
        if (!name || name === "Blank") continue;
        choices.push({
            value: `lvl ${name.toLowerCase()}`,
            message: `Change ${name} level`,
            category: "lvl",
            needsParam: true,
        });
    }

    // lvl - alchemy types (static)
    for (const type of Object.keys(alchemyTypes)) {
        choices.push({
            value: `lvl ${type}`,
            message: `Change all ${type} levels`,
            category: "lvl",
            needsParam: true,
        });
    }

    // lvl - custom changers (static)
    for (const name of customLevelChangerNames) {
        choices.push({
            value: `lvl ${name}`,
            message: `Change all ${name} levels`,
            category: "lvl",
            needsParam: true,
        });
    }

    // game attributes (gga)
    for (const key of Object.keys(gga)) {
        choices.push({
            value: `gga ${key}`,
            message: "",
            category: "gga",
        });
    }

    // w4 chips suggestions
    if (cList.ChipDesc) {
        choices.push({
            value: "w4 chips all",
            message: "Set amount for all lab chips",
            category: "w4",
            needsParam: true,
        });
        for (const chip of cList.ChipDesc) {
            if (!chip[0]) continue;
            choices.push({
                value: `w4 chips ${chip[0].toLowerCase()}`,
                message: chip[1],
                category: "w4",
                needsParam: true,
            });
        }
    }

    // w5 jargems suggestions

    choices.push({
        value: "w5 jargems all",
        message: "Set amount for all jar gems",
        category: "w5",
        needsParam: true,
    });
    for (const gem of cList.HolesInfo[67]) {
        const parts = gem.split("|");
        if (!parts[0]) continue;
        choices.push({
            value: `w5 jargems ${parts[0].toLowerCase()}`,
            message: parts[3] || "",
            category: "w5",
            needsParam: true,
        });
    }

    return choices;
}
