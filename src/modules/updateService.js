const { execFileSync, spawn } = require("child_process");
const { performUpdate } = require("./autoUpdater");
const { createLogger } = require("./utils/logger");

const log = createLogger("UpdateService");

/**
 * Close the current game target before handing off to the updater.
 * @param {Object} client - CDP client instance
 * @param {string} target - Configured injection target
 */
async function closeGameForUpdate(client, target) {
    if ((target || "steam").toLowerCase() === "web") {
        try {
            await Promise.race([client.Browser.close(), new Promise((resolve) => setTimeout(resolve, 3000))]);
        } catch {
            // Browser may already be closed
        }

        try {
            await client.close();
        } catch {
            // Ignore CDP disconnect errors
        }

        return;
    }

    try {
        await client.close();
    } catch {
        // Ignore CDP disconnect errors
    }

    try {
        if (process.platform === "win32") {
            execFileSync("taskkill", ["/IM", "LegendsOfIdleon.exe", "/F"], {
                stdio: "pipe",
            });
        } else {
            execFileSync("pkill", ["-f", "LegendsOfIdleon"], { stdio: "pipe" });
        }
    } catch {
        // Game may already be closed
    }
}

/**
 * Launch the prepared updater script in the background.
 * @param {{scriptPath: string}} preparedUpdate
 */
function launchPreparedUpdate(preparedUpdate) {
    if (process.platform === "win32") {
        spawn("cmd.exe", ["/c", preparedUpdate.scriptPath], { detached: true, stdio: "ignore" }).unref();
        return;
    }

    spawn("bash", [preparedUpdate.scriptPath], { detached: true, stdio: "ignore" }).unref();
}

/**
 * Close the game, launch the prepared updater, and exit the injector.
 * @param {Object} client - CDP client instance
 * @param {Object} options - Runtime options
 * @param {Object} options.injectorConfig - Injector configuration
 * @param {{scriptPath: string, updatedFileNames: string}} preparedUpdate
 */
async function applyPreparedUpdateAndExit(client, options, preparedUpdate) {
    log.info("Closing game...");
    await closeGameForUpdate(client, options.injectorConfig?.target || "steam");

    launchPreparedUpdate(preparedUpdate);

    log.info(`Update is ready for: ${preparedUpdate.updatedFileNames}`);
    log.info("Update will be applied after exit. Please start the application manually.");
    process.exit(0);
}

/**
 * Prepare an update, close runtime targets, launch updater, and exit.
 * @param {Object} client - CDP client instance
 * @param {Object} options - Runtime options
 * @param {Object} updateInfo - Release info from the update checker
 */
async function prepareAndExitForUpdate(client, options, updateInfo) {
    log.info("Preparing update...");
    const preparedUpdate = await performUpdate(updateInfo);
    await applyPreparedUpdateAndExit(client, options, preparedUpdate);
}

module.exports = {
    applyPreparedUpdateAndExit,
    prepareAndExitForUpdate,
};
