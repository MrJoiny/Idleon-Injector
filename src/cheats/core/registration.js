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
 * @param {string} action - The cheat command to execute
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
            return result ?? "Done";
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
 * @param {boolean} [cheatDef.needsParam=false] - Whether this cheat needs/accepts a parameter input
 */
export function registerCheat({ name, fn, message, category = "general", needsParam = false }) {
    cheats[name] = { fn, message, category, needsParam };
}

/**
 * Register a cheat with optional subcheats.
 *
 * This function handles:
 * - Simple toggle cheats
 * - Configurable cheats (with value input)
 * - Nested subcheats (hierarchical commands)
 * - Mass toggle of all subcheats
 * - Namespace-only parents (children without callable parent)
 *
 * @param {object} cheatMap - Cheat definition object
 * @param {string} cheatMap.name - Command name
 * @param {string} cheatMap.message - Help message
 * @param {string} [cheatMap.category] - Category for grouping (overrides inherited)
 * @param {Function} [cheatMap.fn] - Custom function (overrides default toggle behavior)
 * @param {object[]} [cheatMap.subcheats] - Array of subcheat definitions
 * @param {boolean} [cheatMap.configurable] - Configuration options (implies needsParam: true)
 * @param {boolean} [cheatMap.allowToggleChildren] - Allow mass toggle of all subcheats when parent is called with no args
 * @param {boolean} [cheatMap.registerParent=true] - Register this node as a callable command (set false for namespace-only parents)
 * @param {boolean} [cheatMap.needsParam] - Whether this cheat needs/accepts a parameter input (auto-inferred from configurable if not set)
 * @param {string[]} [higherKeys] - Parent command keys (for recursion)
 * @param {string} [parentCategory] - Category inherited from parent
 */
export function registerCheats(cheatMap, higherKeys = [], parentCategory = null) {
    const cmd = higherKeys.concat(cheatMap.name).join(" ");

    // Category priority: explicit > inherited > top-level name (if has subcheats) > "general"
    const category =
        cheatMap.category ||
        parentCategory ||
        (higherKeys.length === 0 && cheatMap.subcheats ? cheatMap.name : null) ||
        "general";

    // Navigate to the correct state object level
    const stateObject = higherKeys.reduce((obj, key) => obj[key], cheatState);
    stateObject[cheatMap.name] = "subcheats" in cheatMap ? {} : false;

    if ("subcheats" in cheatMap) {
        stateObject[cheatMap.name + "s"] = false;
    }

    // Create the cheat handler function
    const fn = function (params) {
        if ("fn" in cheatMap) {
            return cheatMap.fn.call(this, higherKeys.concat(cheatMap.name).concat(params).splice(1));
        }

        // Handle configurable cheats with value input
        if (params.length > 0) {
            if (!("configurable" in cheatMap)) {
                if (cheatMap.subcheats && cheatMap.subcheats.length > 0) {
                    return (
                        `Wrong subcommand, use one of these:\n` +
                        cheatMap.subcheats.map((p) => `${cmd} ${p.name} (${p.message})`).join("\n")
                    );
                }
                return "This cheat doesn't accept values";
            }

            const config = higherKeys.reduce((obj, key) => (obj[key] ??= {}), cheatConfig);
            let val = params.join(" ");

            if (val === "") {
                return `Invalid value. Must be a number or boolean.`;
            }

            try {
                val = JSON.parse(val);
                if (typeof val !== "number" && typeof val !== "boolean") {
                    return `Invalid value. Must be a number or boolean.`;
                }
            } catch {
                return `Invalid value. Must be a number or boolean.`;
            }

            stateObject[cheatMap.name] = true;
            config[cheatMap.name] = val;
            return `Set ${cmd} to ${val}`;
        }

        // Handle mass toggle of subcheats (only if allowToggleChildren is set)
        if (!params[0] && cheatMap.subcheats && cheatMap.allowToggleChildren) {
            for (const i in stateObject[cheatMap.name]) {
                stateObject[cheatMap.name][i] = !stateObject[cheatMap.name + "s"];
            }
            stateObject[cheatMap.name + "s"] = !stateObject[cheatMap.name + "s"];
            return `${stateObject[cheatMap.name + "s"] ? "Activated" : "Deactivated"} ${cheatMap.message}`;
        }

        if ("subcheats" in cheatMap) {
            stateObject[cheatMap.name + "s"] = !stateObject[cheatMap.name + "s"];
            return `${stateObject[cheatMap.name + "s"] ? "Activated" : "Deactivated"} ${cheatMap.message}.`;
        }
        stateObject[cheatMap.name] = !stateObject[cheatMap.name];
        return `${stateObject[cheatMap.name] ? "Activated" : "Deactivated"} ${cheatMap.message}.`;
    };

    // Infer needsParam from configurable if not explicitly set
    const needsParam = cheatMap.needsParam ?? cheatMap.configurable ?? false;
    const registerParent = cheatMap.registerParent ?? true;

    if (registerParent) {
        registerCheat({ name: cmd, fn, message: cheatMap.message, category, needsParam });
    }

    // Recursively register subcheats, passing category
    if ("subcheats" in cheatMap) {
        cheatMap.subcheats.forEach((map) => registerCheats(map, higherKeys.concat(cheatMap.name), category));
    }
}

/**
 * Get all registered cheats.
 * @returns {Object<string, {fn: Function, message: string, category: string}>}
 */
export function getCheats() {
    return cheats;
}
