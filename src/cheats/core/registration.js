/**
 * Core Registration Module
 *
 * Contains cheat registration functions and the main cheat dispatcher.
 */

import { cheatState, setupDone } from "./state.js";

/**
 * Registry of all cheat commands.
 * Keys are command strings (e.g., "godlike crit"), values are { fn, message }.
 * @type {Object<string, {fn: Function, message: string}>}
 */
export const cheats = {};

/**
 * Reference to the setup function (set by setup.js to avoid circular dependency).
 * @type {Function|null}
 */
let setupFn = null;

/**
 * Reference to cheatConfig (injected at runtime).
 * @type {object}
 */
let cheatConfigRef = null;

/**
 * Set the setup function reference.
 * @param {Function} fn - The setup function
 */
export function setSetupFunction(fn) {
    setupFn = fn;
}

/**
 * Set the cheatConfig reference.
 * @param {object} config - The cheatConfig object
 */
export function setCheatConfig(config) {
    cheatConfigRef = config;
}

/**
 * Get the cheatConfig reference.
 * @returns {object}
 */
export function getCheatConfig() {
    return cheatConfigRef;
}

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
        if (!setupDone && setupFn) {
            (async () => {
                await setupFn.call(context);
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
 * @param {string} command - The command string (e.g., "drop" or "godlike crit")
 * @param {Function} fn - The function to execute when command is called
 * @param {string} message - Help message describing the cheat
 */
export function registerCheat(command, fn, message) {
    cheats[command] = { fn: fn, message: message };
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
 * @param {Function} [cheatMap.fn] - Custom function (overrides default toggle behavior)
 * @param {object[]} [cheatMap.subcheats] - Array of subcheat definitions
 * @param {object} [cheatMap.configurable] - Configuration options
 * @param {boolean} [cheatMap.canToggleSubcheats] - Allow mass toggle of subcheats
 * @param {string[]} [higherKeys] - Parent command keys (for recursion)
 */
export function registerCheats(cheatMap, higherKeys = []) {
    const cmd = higherKeys.concat(cheatMap.name).join(" ");

    // Navigate to the correct state object level
    let stateObject = higherKeys.reduce((obj, key) => obj[key], cheatState);
    stateObject[cheatMap.name] = cheatMap.hasOwnProperty("subcheats") ? {} : false;

    // Add toggle-all state if subcheats can be mass-toggled
    if (cheatMap["canToggleSubcheats"]) {
        stateObject[cheatMap.name + "s"] = false;
    }

    // Create the cheat handler function
    let fn = function (params) {
        // Cheat uses a custom function
        if (cheatMap.hasOwnProperty("fn")) {
            return cheatMap.fn.call(this, higherKeys.concat(cheatMap.name).concat(params).splice(1));
        }

        // Handle configurable cheats with value input
        if (params.length > 0) {
            if (!cheatMap.hasOwnProperty("configurable")) {
                return (
                    `Wrong subcommand, use one of these:\n` +
                    cheatMap.subcheats.map((p) => `${cmd} ${p.name} (${p.message})`).join("\n")
                );
            }

            let config = higherKeys.reduce((obj, key) => obj[key], cheatConfigRef);
            let val = params.slice(cheatMap.configurable["isObject"] ? 1 : 0).join(" ");

            if (val === "") {
                return `Invalid value, must be a boolean, number or function that returns a number.`;
            }

            try {
                val = JSON.parse(val);
            } catch (e) {
                val = new Function("return " + val)();
                if (isNaN(val(1))) {
                    return `Invalid value, must be a boolean, number or function that returns a number.`;
                }
            }

            stateObject[cheatMap.name] = true;

            if (cheatMap.configurable["isObject"]) {
                config[cheatMap.name][params[0]] = val;
                return `Set ${cmd} ${params[0]} to ${val}`;
            } else {
                config[cheatMap.name] = val;
                return `Set ${cmd} to ${val}`;
            }
        }

        // Handle mass toggle of subcheats
        if (!params[0] && cheatMap["subcheats"]) {
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

    registerCheat(cmd, fn, cheatMap["message"]);

    // Recursively register subcheats
    if (cheatMap.hasOwnProperty("subcheats")) {
        cheatMap.subcheats.forEach((map) => registerCheats(map, higherKeys.concat(cheatMap.name)));
    }
}

/**
 * Update cheat configuration from external source.
 *
 * @param {object} newConfig - New configuration to merge
 */
export function updateCheatConfig(newConfig) {
    if (cheatConfigRef) {
        for (const key in newConfig) {
            if (Object.hasOwnProperty.call(newConfig, key)) {
                cheatConfigRef[key] = newConfig[key];
            }
        }
    }
}

/**
 * Get all registered cheats.
 * @returns {Object<string, {fn: Function, message: string}>}
 */
export function getCheats() {
    return cheats;
}
