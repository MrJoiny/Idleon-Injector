/**
 * Suggestions API
 *
 * Functions for CLI/WebUI autocomplete:
 * - getAutoCompleteSuggestions
 */

import { cheats } from "../core/registration.js";
import { bulkTypeBlacklist, HIDE_BARE_COMMANDS } from "../constants.js";
import { itemDefs, monsterDefs, itemTypes, gga } from "../core/globals.js";
import { getAllBundles } from "../helpers/bundles.js";

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
    const pendingProviders = new Map(Object.entries(cheats).filter(([, definition]) => definition.suggestions));
    const addCommandSuggestions = (name) => {
        const definition = pendingProviders.get(name);
        if (!definition) return;
        choices.push(...definition.suggestions());
        pendingProviders.delete(name);
    };

    // Add "cheats" as the first choice (default when Enter pressed with empty input)
    if (cheats.cheats) {
        choices.push({
            value: "cheats",
            message: cheats.cheats.message || "list available cheats",
            category: "general",
        });
    }

    const allBundles = getAllBundles();

    // cheat commands (skip "cheats" since it's already added as first)
    addChoices(choices, cheats, (name, def) => {
        if (name === "cheats") return null;
        if (HIDE_BARE_COMMANDS.has(name)) return null;
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
        let name;
        // get the right message names for the cards
        if (code.startsWith("Cards")) {
            name = monsterDefs[item.h.desc_line1]?.h.Name?.replace(/_/g, " ") ?? item.h.desc_line1;
        } else {
            name = item.h.displayName.replace(/_/g, " ");
        }
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

    // Keep migrated command groups in their legacy autocomplete positions.
    addCommandSuggestions("w6 sumunit");
    addCommandSuggestions("keychain");

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
            message: name + " (One Time Use, does not provide gems and pets)",
            category: "buy",
        });
    }

    addCommandSuggestions("class");
    addCommandSuggestions("lvl");

    // game attributes (gga)
    for (const key of Object.keys(gga)) {
        choices.push({
            value: `gga ${key}`,
            message: "",
            category: "gga",
        });
    }

    addCommandSuggestions("w4 chips");

    // Remaining providers follow the legacy groups, including jar gems.
    for (const name of pendingProviders.keys()) {
        addCommandSuggestions(name);
    }

    return choices;
}
