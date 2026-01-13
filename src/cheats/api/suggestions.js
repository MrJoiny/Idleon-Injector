/**
 * Suggestions API
 *
 * Functions for CLI/WebUI autocomplete and confirmation:
 * - getAutoCompleteSuggestions
 * - getChoicesNeedingConfirmation
 */

import { cheats } from "../core/registration.js";
import { summonUnits, keychainStatsMap } from "../constants/index.js";
import { itemDefs, monsterDefs } from "../core/globals.js";

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

    // Add cheat commands
    addChoices(choices, cheats, (name, def) => ({
        message: name + (def.message ? ` (${def.message})` : ""),
        value: name,
    }));

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

    // Add item drops (if itemDefs is available)
    addChoices(choices, itemDefs, (code, item) => {
        if (!item?.h?.displayName) return null;
        const name = item.h.displayName.replace(/_/g, " ");
        return {
            message: `drop ${code} (${name})`,
            value: `drop ${code}`,
        };
    });

    // Add monster spawns (if monsterDefs is available)
    addChoices(choices, monsterDefs, (code, monster) => {
        if (!monster?.h?.Name) return null;
        const name = monster.h.Name.replace(/_/g, " ");
        return {
            message: `spawn ${code} (${name})`,
            value: `spawn ${code}`,
        };
    });

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
