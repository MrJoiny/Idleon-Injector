/**
 * CLI Interface Module
 *
 * Provides the command-line interface for the Idleon Cheat Injector.
 * Handles user interaction through an autocomplete prompt system, cheat execution,
 * and special commands like Chrome DevTools integration. Supports confirmation
 * prompts for parameter-requiring commands and maintains an interactive loop.
 */

const Enquirer = require("enquirer");
const { exec, execSync, spawn } = require("child_process");
const { createLogger, setActivePrompt } = require("../utils/logger");
const { broadcastCheatStates } = require("../server/wsServer");
const { checkForUpdates } = require("../updateChecker");
const { performUpdate } = require("../autoUpdater");
const { version } = require("../../../package.json");

const log = createLogger("CLI");

const commandHistory = [];
let historyIndex = -1;

const platformOpenCommands = {
    win32: (url) => `start "" "${url}"`,
    darwin: (url) => `open "${url}"`,
};

/**
 * Add command to history if it differs from the last entry
 * @param {string} command - Command to add
 */
function addToHistory(command) {
    if (commandHistory[commandHistory.length - 1] !== command) {
        commandHistory.push(command);
    }
}

/**
 * Navigate command history and return the value to use
 * @param {string} direction - "up" or "down"
 * @returns {string} History value to display
 */
function navigateHistory(direction) {
    if (commandHistory.length === 0) return null;

    if (direction === "up") {
        if (historyIndex === -1) {
            historyIndex = commandHistory.length - 1;
        } else if (historyIndex > 0) {
            historyIndex--;
        }
    } else {
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
        } else {
            historyIndex = -1;
            return "";
        }
    }
    return commandHistory[historyIndex] || "";
}

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

    // Steam: disconnect CDP first (it blocks the game from closing)
    try {
        await client.close();
    } catch {
        // Ignore CDP disconnect errors
    }

    try {
        if (process.platform === "win32") {
            execSync('taskkill /IM "LegendsOfIdleon.exe" /F', {
                stdio: "pipe",
            });
        } else {
            execSync('pkill -f "LegendsOfIdleon"', { stdio: "pipe" });
        }
    } catch {
        // Game may already be closed
    }
}

/**
 * Handle the "update" CLI command: check for updates, prompt, download, and apply.
 * @param {Object} client - CDP client instance
 * @param {Object} options - CLI options (injectorConfig, cdpPort, etc.)
 */
async function handleUpdateCommand(client, options) {
    if (!process.pkg) {
        log.error("Auto-update is only available in packaged builds.");
        return;
    }

    log.info("Checking for updates...");
    const updateInfo = await checkForUpdates(version);

    if (!updateInfo || !updateInfo.updateAvailable) {
        log.info("You are already on the latest version.");
        return;
    }

    log.info(`Update available: v${updateInfo.latestVersion}`);
    const { proceed } = await new Enquirer().prompt({
        type: "confirm",
        name: "proceed",
        message: `Update to v${updateInfo.latestVersion}? This will close the application.`,
    });

    if (!proceed) {
        log.info("Update cancelled.");
        return;
    }

    try {
        log.info("Preparing update...");
        const preparedUpdate = await performUpdate(updateInfo);

        log.info("Closing game...");
        await closeGameForUpdate(client, options.injectorConfig?.target || "steam");

        if (process.platform === "win32") {
            spawn("cmd.exe", ["/c", preparedUpdate.scriptPath], { detached: true, stdio: "ignore" }).unref();
        } else {
            spawn("bash", [preparedUpdate.scriptPath], { detached: true, stdio: "ignore" }).unref();
        }

        log.info(`Update is ready for: ${preparedUpdate.updatedFileNames}`);
        log.info("Update will be applied after exit. Please start the application manually.");
        process.exit(0);
    } catch (updateError) {
        log.error("Update failed:", updateError.message);
    }
}

/**
 * Start the CLI interface for user interaction
 * @param {string} context - JavaScript expression for game context
 * @param {Object} client - CDP client instance
 * @param {Object} options - Configuration options
 * @param {Object} options.injectorConfig - Injector configuration
 * @param {number} options.cdpPort - CDP port number
 */
async function startCliInterface(context, client, options = {}) {
    const { cdpPort } = options;
    const { Runtime } = client;

    log.info("CLI initialized. Type to filter, Enter to select. (Ctrl+Up/Down for history)");

    const choicesResult = await Runtime.evaluate({
        expression: `getAutoCompleteSuggestions()`,
        awaitPromise: true,
        returnByValue: true,
    });

    if (choicesResult.exceptionDetails) {
        log.error("Error getting autocomplete suggestions:", choicesResult.exceptionDetails.text);
        return;
    }

    const choices = (choicesResult.result.value || []).map((choice) => {
        // Set name to value for Enquirer display/selection
        if (!choice.name) choice.name = choice.value;
        // Create display message: "value (description)" for CLI readability
        choice.displayMessage = choice.message;
        const paramHint = choice.needsParam ? " [+param]" : "";
        choice.message = `${choice.value}${paramHint} (${choice.message || ""})`;
        return choice;
    });

    async function promptUser() {
        try {
            let valueChosen = false;
            const enquirer = new Enquirer();

            historyIndex = -1;

            const { action } = await enquirer.prompt({
                name: "action",
                message: "Action",
                type: "autocomplete",
                initial: 0,
                limit: 15,
                choices: choices,
                suggest: function (input, choices) {
                    if (input.length === 0) return [choices[0]];
                    const str = input.toLowerCase();
                    const mustInclude = str.split(" ");
                    return choices.filter((ch) => {
                        const msg = (ch.message || "").toLowerCase();
                        const val = (ch.value || "").toLowerCase();

                        if (str.startsWith(val + " ")) return false;

                        for (const word of mustInclude) {
                            // Match if word is in either value or message
                            if (!msg.includes(word) && !val.includes(word)) return false;
                        }
                        return true;
                    });
                },
                // Custom submit logic to handle confirmation for cheats that need parameters
                onSubmit: function (name, value, prompt) {
                    value = this.focused ? this.focused.value : value;
                    const choiceNeedsParam = this.focused?.needsParam === true;

                    // If parameter input needed and not yet given, re-render with the chosen value requiring a second Enter press
                    if (choiceNeedsParam && !valueChosen && this.focused) {
                        prompt.input = value;
                        prompt.state.cursor = value.length;
                        prompt.render();
                        valueChosen = true;
                        return new Promise(function () {});
                    } else {
                        this.addChoice({ name: value, value: value }, this.choices.length + 1);
                        return true;
                    }
                },
                onRun: async function () {
                    setActivePrompt(this);
                    const prompt = this;
                    this.on("keypress", (char, key) => {
                        if (!key?.ctrl || (key.name !== "up" && key.name !== "down")) return;
                        const historyValue = navigateHistory(key.name);
                        if (historyValue === null) return;
                        // Use setImmediate to set input after Enquirer's default handler
                        setImmediate(async () => {
                            prompt.input = historyValue;
                            prompt.cursor = historyValue.length;
                            await prompt.complete();
                            prompt.render();
                        });
                    });
                    await this.complete();
                },
                cancel: function () {},
            });

            addToHistory(action);
            setActivePrompt(null);

            if (action === "update") {
                await handleUpdateCommand(client, options);
            } else if (action === "chromedebug") {
                const response = await client.Target.getTargetInfo();
                const url = `http://localhost:${cdpPort}/devtools/inspector.html?experiment=true&ws=localhost:${cdpPort}/devtools/page/${response.targetInfo.targetId}`;
                const getCommand = platformOpenCommands[process.platform] || ((u) => `xdg-open "${u}"`);

                exec(getCommand(url), (error) => {
                    if (error) {
                        log.error("Failed to open chrome debugger in default browser:", error);
                    } else {
                        log.info("Opened idleon chrome debugger in default browser");
                    }
                });
            } else {
                const cheatResponse = await Runtime.evaluate({
                    expression: `cheat.call(${context}, '${action}')`,
                    awaitPromise: true,
                    allowUnsafeEvalBlockedByCSP: true,
                });
                if (cheatResponse.exceptionDetails) {
                    log.error(`Error executing cheat '${action}':`, cheatResponse.exceptionDetails.text);
                } else {
                    log.info(`${cheatResponse.result.value}`);
                    await broadcastCheatStates();
                }
            }
            await promptUser();
        } catch (promptError) {
            log.error("Error in promptUser:", promptError);
            await new Promise((res) => setTimeout(res, 1000));
            await promptUser();
        }
    }

    await promptUser();
}

module.exports = {
    startCliInterface,
};
