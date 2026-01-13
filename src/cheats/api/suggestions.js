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
import { bEngine, itemDefs, monsterDefs, CList } from "../core/globals.js";

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
    // here are items stored that are not visible in the w5 slab
    const itemBlacklist = new Set(CList.RANDOlist[17]);
    itemBlacklist.delete("COIN");

    // cheat commands
    addChoices(choices, cheats, (name, def) => ({
        value: name,
        message: def?.message || "",
        category: def?.category || "general",
    }));

    // item commands (drop, nomore, multiplestacks)
    addChoices(choices, itemDefs, (code, item) => {
        if (!item?.h?.displayName) return null;
        if (itemBlacklist.has(code)) return null;
        const name = item.h.displayName.replace(/_/g, " ");
        // filtering out ui items named strung jewels
        if (code != "Quest66" && name == "Strung Jewels") return null;

        return [
            { value: `drop ${code}`, message: name, category: "drop" },
            { value: `nomore ${code}`, message: name, category: "nomore" },
            { value: `multiplestacks ${code}`, message: name, category: "multiplestacks" },
        ];
    });

    // monster spawns
    addChoices(choices, monsterDefs, (code, monster) => {
        if (!monster?.h?.Name) return null;
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

    // game attributes (gga)
    if (bEngine?.gameAttributes?.h) {
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
        "class",
        "multiplestacks",
    ];
}
