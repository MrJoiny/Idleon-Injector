/**
 * Core Setup Module
 *
 * Contains the main setup function that initializes all cheats and proxies.
 */

import { markSetupDone, setupDone, cheatConfig, startupCheats } from "./state.js";
import { gameReady, gameContext } from "./globals.js";
import { cheat } from "./registration.js";

// Imports for setup logic
import { setupAllProxies } from "../proxies/setup.js";
import { injectWebUI } from "../ui/overlay.js";
import { monitor } from "./valueMonitor.js";

/**
 * Main setup function - initializes all cheats and proxies.
 *
 * This function:
 * 1. Waits for the game to be ready
 * 2. Sets up Firebase proxy for character selection handling
 * 3. Sets up all game proxies
 * 4. Runs startup cheats
 * 5. Injects the web UI (if enabled)
 *
 * @returns {Promise<string>} Setup result message
 */
export async function setup() {
    if (setupDone) return "Cheat setup complete";
    console.log("Entering setup function...");
    markSetupDone();

    try {
        await gameReady(this);

        setupAllProxies();

        monitor.init();

        const rtn = [
            "--------------------",
            ...runStartupCheats(),
            "Cheat setup complete",
            "--------------------",
            "Hit enter to list available cheats",
            "Cheats will find as you type, so if you're looking for eg gem cheats, or an item just type it and see what comes up",
            "--------------------",
        ];

        console.log("Exiting setup function successfully.");

        if (cheatConfig.ingameUI) {
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
    return startupCheats.map((c) => cheat(c, gameContext));
}
