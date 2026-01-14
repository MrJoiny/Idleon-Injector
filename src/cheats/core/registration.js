/**
 * Core Registration Module
 *
 * Contains cheat registration functions and the main cheat dispatcher.
 */

import { cheatState, setupDone, cheatConfig } from "./state.js";
// Note: setup.js is imported dynamically below to avoid circular dependency

/**
 * Registry of all cheat commands.
 * Keys are command strings (e.g., "godlike crit"), values are { fn, message, category }.
 * @type {Object<string, {fn: Function, message: string, category: string}>}
 */
export const cheats = {};

/**
 * Main cheat dispatcher - executes cheat commands.
 *
 * Parses the action string to find matching cheat commands,
 * passing remaining parts as parameters.
 *
 * @param {string} action - The cheat command to execute (e.g., "godlike crit" or "drop Copper 100")
 * @param {object} context - The game context (this)
 * @returns {string} Result message
 */
export function cheat(action, context) {
    try {
        if (!setupDone) {
            (async () => {
                // Dynamic import to avoid circular dependency
                const { setup } = await import("./setup.js");
                await setup.call(context);
            })();
        }

        const command = action.split(" ");
        const params = [];
        let foundCheat = cheats[command.join(" ")];

        // Progressively pop words from command to params until we find a match
        while (!foundCheat && command.length > 0) {
            params.unshift(command.pop());
            foundCheat = cheats[command.join(" ")];
        }

        if (foundCheat) {
            const result = foundCheat.fn.call(context, params);
            return result ?? "Done.";
        } else {
            return `${action.split(" ")[0]} is not a valid option.`;
        }
    } catch (error) {
        return `Error: ${error.stack}`;
    }
}

/**
 * Register a simple cheat command.
 *
 * @param {object} cheatDef - Cheat definition object
 * @param {string} cheatDef.name - The command string (e.g., "drop" or "godlike crit")
 * @param {Function} cheatDef.fn - The function to execute when command is called
 * @param {string} cheatDef.message - Help message describing the cheat
 * @param {string} [cheatDef.category="general"] - Category for grouping in UI
 */
export function registerCheat({ name, fn, message, category = "general" }) {
    cheats[name] = { fn, message, category };
}

/**
 * Register a cheat with optional subcheats.
 *
 * This function handles:
 * - Simple toggle cheats
 * - Configurable cheats (with value input)
 * - Nested subcheats (hierarchical commands)
 * - Mass toggle of all subcheats
 *
 * @param {object} cheatMap - Cheat definition object
 * @param {string} cheatMap.name - Command name
 * @param {string} cheatMap.message - Help message
 * @param {string} [cheatMap.category] - Category for grouping (overrides inherited)
 * @param {Function} [cheatMap.fn] - Custom function (overrides default toggle behavior)
 * @param {object[]} [cheatMap.subcheats] - Array of subcheat definitions
 * @param {object} [cheatMap.configurable] - Configuration options
 * @param {boolean} [cheatMap.canToggleSubcheats] - Allow mass toggle of subcheats
 * @param {string[]} [higherKeys] - Parent command keys (for recursion)
 * @param {string} [parentCategory] - Category inherited from parent
 */
export function registerCheats(cheatMap, higherKeys = [], parentCategory = null) {
    const cmd = higherKeys.concat(cheatMap.name).join(" ");

    // Determine category: explicit > inherited > derive from top-level name > "general"
    let category;
    if (cheatMap.category) {
        category = cheatMap.category;
    } else if (parentCategory) {
        category = parentCategory;
    } else if (higherKeys.length === 0 && cheatMap.subcheats) {
        // Top-level group with subcheats: use name as category (e.g., "w1")
        category = cheatMap.name;
    } else {
        category = "general";
    }

    // Navigate to the correct state object level
    const stateObject = higherKeys.reduce((obj, key) => obj[key], cheatState);
    stateObject[cheatMap.name] = cheatMap.hasOwnProperty("subcheats") ? {} : false;

    // Add toggle-all state if subcheats can be mass-toggled
    if (cheatMap.canToggleSubcheats) {
        stateObject[cheatMap.name + "s"] = false;
    }

    // Create the cheat handler function
    const fn = function (params) {
        // Cheat uses a custom function
        if (cheatMap.hasOwnProperty("fn")) {
            return cheatMap.fn.call(this, higherKeys.concat(cheatMap.name).concat(params).splice(1));
        }

        // Handle configurable cheats with value input
        if (params.length > 0) {
            if (!cheatMap.hasOwnProperty("configurable")) {
                if (cheatMap.subcheats && cheatMap.subcheats.length > 0) {
                    return (
                        `Wrong subcommand, use one of these:\n` +
                        cheatMap.subcheats.map((p) => `${cmd} ${p.name} (${p.message})`).join("\n")
                    );
                }
                return "This cheat doesn't accept values.";
            }

            const config = higherKeys.reduce((obj, key) => {
                if (!obj[key] || typeof obj[key] !== "object") {
                    obj[key] = {};
                }
                return obj[key];
            }, cheatConfig);
            let val = params.slice(cheatMap.configurable.isObject ? 1 : 0).join(" ");

            if (val === "") {
                return `Invalid value, must be a boolean, number or function that returns a number.`;
            }

            try {
                val = JSON.parse(val);
            } catch (error) {
                if (cheatConfig?.debug?.errors) {
                    console.warn("Cheat config parse failed, using function fallback:", error);
                }
                val = new Function("return " + val)();
                if (isNaN(val(1))) {
                    return `Invalid value, must be a boolean, number or function that returns a number.`;
                }
            }

            stateObject[cheatMap.name] = true;

            if (cheatMap.configurable.isObject) {
                config[cheatMap.name][params[0]] = val;
                return `Set ${cmd} ${params[0]} to ${val}`;
            } else {
                config[cheatMap.name] = val;
                return `Set ${cmd} to ${val}`;
            }
        }

        // Handle mass toggle of subcheats
        if (!params[0] && cheatMap.subcheats) {
            for (const i in stateObject[cheatMap.name]) {
                stateObject[cheatMap.name][i] = !stateObject[cheatMap.name + "s"];
            }
            stateObject[cheatMap.name + "s"] = !stateObject[cheatMap.name + "s"];
            return `${stateObject[cheatMap.name + "s"] ? "Activated" : "Deactivated"} ${cheatMap.message}`;
        }

        // Simple toggle
        stateObject[cheatMap.name] = !stateObject[cheatMap.name];
        return `${stateObject[cheatMap.name] ? "Activated" : "Deactivated"} ${cheatMap.message}.`;
    };

    registerCheat({ name: cmd, fn, message: cheatMap.message, category });

    // Recursively register subcheats, passing category
    if (cheatMap.hasOwnProperty("subcheats")) {
        cheatMap.subcheats.forEach((map) => registerCheats(map, higherKeys.concat(cheatMap.name), category));
    }
}

/**
 * Update cheat configuration from external source.
 *
 * @param {object} newConfig - New configuration to merge
 */
export function updateCheatConfig(newConfig) {
    if (cheatConfig) {
        for (const key in newConfig) {
            if (Object.hasOwnProperty.call(newConfig, key)) {
                cheatConfig[key] = newConfig[key];
            }
        }
    }
}

/**
 * Get all registered cheats.
 * @returns {Object<string, {fn: Function, message: string, category: string}>}
 */
export function getCheats() {
    return cheats;
}
