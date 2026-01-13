/**
 * Core Setup Module
 *
 * Contains the main setup function that initializes all cheats and proxies.
 */

import { markSetupDone, setupDone, cheatConfig, startupCheats } from "./state.js";
import { gameReady } from "./globals.js";
import { cheat } from "./registration.js";

// Imports for setup logic
import { setupAllProxies } from "../proxies/setup.js";
import { setupFirebaseProxy } from "../proxies/firebase.js";
import { injectWebUI } from "../ui/overlay.js";
import { registerDynamicCheats } from "../cheats/register.js";

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
        if (cheatConfig && !cheatConfig.multiply) {
            cheatConfig.multiply = {
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
        setupFirebaseProxy(this);

        // Setup all game proxies
        setupAllProxies(this, cheatConfig);

        // Register dynamic cheats that need game data
        registerDynamicCheats(this);

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
        if (cheatConfig?.ingameUI) {
            injectWebUI();
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
    startupCheats.forEach((c) => {
        rtn.push(cheat(c, this));
    }, this);
    return rtn;
}
