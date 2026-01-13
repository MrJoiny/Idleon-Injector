/**
 * Suggestions API
 *
 * Functions for CLI/WebUI autocomplete and confirmation:
 * - getAutoCompleteSuggestions
 * - getChoicesNeedingConfirmation
 */

import { cheats } from "../core/registration.js";
import { summonUnits } from "../constants/summonUnits.js";
import { keychainStatsMap } from "../constants/keychainStats.js";
import { itemDefs, monsterDefs, CList } from "../core/globals.js";

/**
 * Helper to add choices from an object's keys.
 * @param {Array} choices - Target array to push choices to
 * @param {object} source - Source object to iterate keys
 * @param {function} formatter - (key, item) => { message, value }
 */
function addChoices(choices, source, formatter) {
    if (!source) return;
    for (const key of Object.keys(source)) {
        const choice = formatter(key, source[key]);
        if (choice) choices.push(choice);
    }
}

/**
 * Get autocomplete suggestions for the CLI/WebUI.
 * @returns {Array<{message: string, value: string}>}
 */
export function getAutoCompleteSuggestions() {
    const choices = [];
    // here are items stored that are not visible in the w5 slab
    const itemBlacklist = new Set(CList.RANDOlist[17]);

    // Add cheat commands
    addChoices(choices, cheats, (name, def) => ({
        message: `${name} (${def?.message || " "})`,
        value: name,
    }));

    // Add item drops
    addChoices(choices, itemDefs, (code, item) => {
        if (!item?.h?.displayName) return null;
        if (itemBlacklist.has(code)) return null;
        const name = item.h.displayName.replace(/_/g, " ");
        // filtering out ui items named strung jewels
        if (code != "Quest66" && name == "Strung Jewels") return null;
        choices.push({
            message: `nomore ${code} (${name})`,
            value: `nomore ${code}`,
        });
        choices.push({
            message: `multiplestacks ${code} (${name})`,
            value: `multiplestacks ${code}`,
        });
        return {
            message: `drop ${code} (${name})`,
            value: `drop ${code}`,
        };
    });

    // Add monster spawns
    addChoices(choices, monsterDefs, (code, monster) => {
        if (!monster?.h?.Name) return null;
        const name = monster.h.Name.replace(/_/g, " ");
        return {
            message: `spawn ${code} (${name})`,
            value: `spawn ${code}`,
        };
    });

    // Add summon units
    addChoices(choices, summonUnits, (unit) => ({
        message: `w6 sumunit ${unit}`,
        value: `w6 sumunit ${unit}`,
    }));

    // Add keychain stats
    addChoices(choices, keychainStatsMap, (stat) => ({
        message: `keychain ${stat}`,
        value: `keychain ${stat}`,
    }));

    return choices;
}

/**
 * Get commands that need confirmation/additional input.
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
        "class",
        "multiplestacks",
    ];
}
