/**
 * Core Setup Module
 *
 * Contains the main setup function that initializes all cheats and proxies.
 */

import { cheatState, markSetupDone, setupDone } from "./state.js";
import { gameReady, registerCommonVariables, getGameContext } from "./globals.js";
import { cheats, cheat, registerCheat, registerCheats, setSetupFunction, setCheatConfig } from "./registration.js";

/**
 * Reference to cheatConfig (injected at runtime).
 * @type {object}
 */
let cheatConfigRef = null;

/**
 * Reference to startupCheats (injected at runtime).
 * @type {string[]}
 */
let startupCheatsRef = [];

/**
 * Dependency injection registry for setup functions.
 * @type {Object<string, Function|null>}
 */
const setupDeps = {
    setupAllProxies: null,
    setupFirebaseProxy: null,
    injectWebUI: null,
    registerDynamicCheats: null,
};

/**
 * Set a setup dependency function.
 * @param {string} name - Dependency name (setupAllProxies, setupFirebaseProxy, injectWebUI, registerDynamicCheats)
 * @param {Function} fn - The function to set
 */
export function setSetupDependency(name, fn) {
    if (name in setupDeps) {
        setupDeps[name] = fn;
    }
}

// Legacy setters for backwards compatibility
export const setSetupAllProxies = (fn) => setSetupDependency("setupAllProxies", fn);
export const setSetupFirebaseProxy = (fn) => setSetupDependency("setupFirebaseProxy", fn);
export const setInjectWebUI = (fn) => setSetupDependency("injectWebUI", fn);
export const setRegisterDynamicCheats = (fn) => setSetupDependency("registerDynamicCheats", fn);

/**
 * Initialize setup with runtime-injected config.
 * Called from main index.js with the globals from cheatInjection.js.
 *
 * @param {object} config - The cheatConfig object
 * @param {string[]} startupCheats - Array of startup cheat commands
 */
export function initSetup(config, startupCheats) {
    cheatConfigRef = config;
    startupCheatsRef = startupCheats || [];
    setCheatConfig(config);
    setSetupFunction(setup);
}

/**
 * Main setup function - initializes all cheats and proxies.
 *
 * This function:
 * 1. Waits for the game to be ready
 * 2. Sets up Firebase proxy for character selection handling
 * 3. Sets up all game proxies
 * 4. Registers dynamic cheats that need game data
 * 5. Runs startup cheats
 * 6. Injects the web UI (if enabled)
 *
 * @returns {Promise<string>} Setup result message
 */
export async function setup() {
    if (setupDone) return "Cheat setup complete";
    console.log("Entering setup function...");
    markSetupDone();

    try {
        await gameReady(this);

        // Ensure cheatConfig.multiply exists with defaults
        if (cheatConfigRef && !cheatConfigRef.multiply) {
            cheatConfigRef.multiply = {
                damage: 1,
                efficiency: 1,
                afk: 1,
                drop: 1,
                money: 1,
                classexp: 1,
                crystal: 1,
                skillexp: 1,
                shopstock: 1,
                printer: 1,
                monsters: 1,
            };
        }

        // Setup Firebase proxy for character selection handling
        if (setupDeps.setupFirebaseProxy) {
            setupDeps.setupFirebaseProxy(this);
        }

        // Setup all game proxies
        if (setupDeps.setupAllProxies) {
            setupDeps.setupAllProxies(this, cheatConfigRef);
        }

        // Register dynamic cheats that need game data
        if (setupDeps.registerDynamicCheats) {
            setupDeps.registerDynamicCheats(this, {
                // TODO: Pass dropOnChar and rollAllObols when implemented
            });
        }

        // Run startup cheats
        let rtn = [];
        rtn.push("--------------------");
        rtn = rtn.concat(runStartupCheats.call(this));
        rtn.push("Cheat setup complete");
        rtn.push("--------------------");
        rtn.push("Hit enter to list available cheats");
        rtn.push(
            "Cheats will find as you type, so if you're looking for eg gem cheats, or an item just type it and see what comes up"
        );
        rtn.push("--------------------");

        console.log("Exiting setup function successfully.");

        // Inject web UI if enabled
        if (cheatConfigRef?.ingameUI && setupDeps.injectWebUI) {
            setupDeps.injectWebUI();
        }

        return rtn.join("\n");
    } catch (setupError) {
        console.error("Error occurred during setup function:", setupError.stack || setupError);
        return "Error during cheat setup.";
    }
}

/**
 * Run startup cheats from config.
 *
 * @returns {string[]} Array of result messages
 */
export function runStartupCheats() {
    let rtn = [];
    startupCheatsRef.forEach((c) => {
        rtn.push(cheat(c, this));
    }, this);
    return rtn;
}
