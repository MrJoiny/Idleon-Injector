/**
 * API Routes Module
 *
 * Defines all REST API endpoints for the web UI interface of the Idleon Cheat Injector.
 * Handles cheat execution, configuration management, DevTools integration, and file operations.
 * Provides the bridge between the web interface and the game's cheat system.
 */

const { deepMerge } = require("../utils/objectUtils");
const fs = require("fs").promises;
const path = require("path");
const {
    objToString,
    prepareConfigForJson,
    parseConfigFromJson,
    getDeepDiff,
    filterByTemplate,
} = require("../utils/helpers");
const { exec } = require("child_process");

/**
 * Sets up all API routes for the web UI
 * @param {Object} app - TinyRouter application instance
 * @param {string} context - JavaScript expression for game context
 * @param {Object} client - Chrome DevTools Protocol client
 * @param {Object} config - Configuration objects
 * @param {Object} config.cheatConfig - Cheat configuration object
 * @param {Array} config.startupCheats - Array of startup cheat names
 * @param {Object} config.injectorConfig - Injector configuration
 * @param {number} config.cdpPort - Chrome DevTools Protocol port
 */
function setupApiRoutes(app, context, client, config) {
    const { Runtime } = client;
    const { cheatConfig, defaultConfig, startupCheats, injectorConfig, cdpPort } = config;

    app.get("/api/heartbeat", (req, res) => {
        res.json({ status: "online", timestamp: Date.now() });
    });

    app.get("/api/cheats", async (req, res) => {
        try {
            const suggestionsResult = await Runtime.evaluate({
                expression: `getAutoCompleteSuggestions.call(${context})`,
                awaitPromise: true,
                returnByValue: true,
            });
            if (suggestionsResult.exceptionDetails) {
                console.error("API Error getting autocomplete suggestions:", suggestionsResult.exceptionDetails.text);
                res.status(500).json({
                    error: "Failed to get cheats from game",
                    details: suggestionsResult.exceptionDetails.text,
                });
            } else {
                const allCheats = suggestionsResult.result.value || [];

                const EXCLUDED_PREFIXES = [
                    "gga",
                    "ggk",
                    "cheats",
                    "list",
                    "search",
                    "chng",
                    "egga",
                    "eggk",
                    "chromedebug",
                ];
                const filteredCheats = allCheats.filter((c) => {
                    const cmd = c.value?.toLowerCase();
                    return !EXCLUDED_PREFIXES.some((prefix) => cmd === prefix || cmd?.startsWith(prefix + " "));
                });

                res.json(filteredCheats);
            }
        } catch (apiError) {
            console.error("API Error in /api/cheats:", apiError);
            res.status(500).json({ error: "Internal server error while fetching cheats" });
        }
    });

    app.post("/api/toggle", async (req, res) => {
        const { action } = await req.json();
        if (!action) {
            return res.status(400).json({ error: "Missing action parameter" });
        }
        try {
            const cheatResponse = await Runtime.evaluate({
                expression: `cheat.call(${context}, '${action}')`,
                awaitPromise: true,
                allowUnsafeEvalBlockedByCSP: true,
            });
            if (cheatResponse.exceptionDetails) {
                console.error(`API Error executing cheat '${action}':`, cheatResponse.exceptionDetails.text);
                res.status(500).json({
                    error: `Failed to execute cheat '${action}'`,
                    details: cheatResponse.exceptionDetails.text,
                });
            } else {
                console.log(`[Web UI] Executed: ${action} -> ${cheatResponse.result.value}`);
                res.json({ result: cheatResponse.result.value });
            }
        } catch (apiError) {
            console.error(`API Error executing cheat '${action}':`, apiError);
            res.status(500).json({ error: `Internal server error while executing cheat '${action}'` });
        }
    });

    app.get("/api/needs-confirmation", async (req, res) => {
        try {
            const confirmationResult = await Runtime.evaluate({
                expression: `getChoicesNeedingConfirmation.call(${context})`,
                awaitPromise: true,
                returnByValue: true,
            });
            if (confirmationResult.exceptionDetails) {
                console.error("API Error getting confirmation choices:", confirmationResult.exceptionDetails.text);
                res.status(500).json({
                    error: "Failed to get confirmation list from game",
                    details: confirmationResult.exceptionDetails.text,
                });
            } else {
                res.json(confirmationResult.result.value || []);
            }
        } catch (apiError) {
            console.error("API Error in /api/needs-confirmation:", apiError);
            res.status(500).json({ error: "Internal server error while fetching confirmation list" });
        }
    });

    app.get("/api/devtools-url", async (req, res) => {
        try {
            const response = await client.Target.getTargetInfo();
            if (response && response.targetInfo && response.targetInfo.targetId) {
                const targetId = response.targetInfo.targetId;
                const devtoolsUrl = `http://localhost:${cdpPort}/devtools/inspector.html?ws=localhost:${cdpPort}/devtools/page/${targetId}`;
                console.log(`[Web UI] Generated DevTools URL: ${devtoolsUrl}`);
                res.json({ url: devtoolsUrl });
            } else {
                console.error("API Error: Could not get target info to generate DevTools URL.");
                res.status(500).json({ error: "Failed to get target information from CDP client." });
            }
        } catch (apiError) {
            console.error("API Error getting DevTools URL:", apiError);
            res.status(500).json({
                error: "Internal server error while fetching DevTools URL",
                details: apiError.message,
            });
        }
    });

    app.get("/api/config", (req, res) => {
        try {
            const serializableCheatConfig = prepareConfigForJson(cheatConfig);

            let serializableDefaultConfig = {};
            if (defaultConfig) {
                serializableDefaultConfig = prepareConfigForJson(defaultConfig);
            }

            const fullConfigResponse = {
                startupCheats: startupCheats,
                cheatConfig: serializableCheatConfig,
                injectorConfig: injectorConfig,
                defaultConfig: serializableDefaultConfig,
            };
            res.json(fullConfigResponse);
        } catch (error) {
            console.error("API Error preparing full config for JSON:", error);
            res.status(500).json({ error: "Internal server error while preparing configuration" });
        }
    });

    app.post("/api/config/update", async (req, res) => {
        const receivedFullConfig = await req.json();

        if (!receivedFullConfig || typeof receivedFullConfig !== "object") {
            return res.status(400).json({
                error: "Invalid configuration data received.",
            });
        }

        try {
            if (receivedFullConfig.cheatConfig) {
                const receivedCheatConfig = receivedFullConfig.cheatConfig;
                const parsedCheatConfig = parseConfigFromJson(receivedCheatConfig);

                deepMerge(cheatConfig, parsedCheatConfig);
            }

            if (Array.isArray(receivedFullConfig.startupCheats)) {
                startupCheats.length = 0;
                startupCheats.push(...receivedFullConfig.startupCheats);
                console.log("[Web UI] Updated server-side startupCheats.");
            }

            if (receivedFullConfig.injectorConfig) {
                deepMerge(injectorConfig, receivedFullConfig.injectorConfig);
                console.log("[Web UI] Updated server-side injectorConfig.");
            }

            const parsedCheatConfig = receivedFullConfig.cheatConfig
                ? parseConfigFromJson(receivedFullConfig.cheatConfig)
                : cheatConfig;
            const contextExistsResult = await Runtime.evaluate({ expression: `!!(${context})` });
            if (!contextExistsResult || !contextExistsResult.result || !contextExistsResult.result.value) {
                console.error("API Error: Cheat context not found in iframe. Cannot update config in game.");
                return res.status(200).json({
                    message: "Configuration updated on server, but failed to apply in game (context lost).",
                });
            }

            const configStringForInjection = objToString(parsedCheatConfig);

            const updateExpression = `
        if (typeof updateCheatConfig === 'function') {
          updateCheatConfig(${configStringForInjection});
          'Config updated in game.';
        } else {
          'Error: updateCheatConfig function not found in game context.';
        }
      `;

            const updateResult = await Runtime.evaluate({
                expression: updateExpression,
                awaitPromise: true,
                allowUnsafeEvalBlockedByCSP: true,
            });

            let gameUpdateDetails = "N/A";
            if (updateResult.exceptionDetails) {
                console.error(`API Error updating config in game:`, updateResult.exceptionDetails.text);
                gameUpdateDetails = `Failed to apply in game: ${updateResult.exceptionDetails.text}`;
                return res.status(200).json({
                    message: "Configuration updated on server, but failed to apply in game.",
                    details: gameUpdateDetails,
                });
            } else {
                gameUpdateDetails = updateResult.result.value;
                console.log(`[Web UI] In-game config update result: ${gameUpdateDetails}`);
                if (gameUpdateDetails.startsWith("Error:")) {
                    return res.status(200).json({
                        message: "Configuration updated on server, but failed to apply in game.",
                        details: gameUpdateDetails,
                    });
                }
            }

            res.json({ message: "Configuration updated successfully.", details: gameUpdateDetails });
        } catch (apiError) {
            console.error("API Error in /api/config/update:", apiError);
            res.status(500).json({
                error: "Internal server error while updating configuration",
                details: apiError.message,
            });
        }
    });

    app.get("/api/cheat-states", async (req, res) => {
        try {
            const statesResult = await Runtime.evaluate({
                expression: `cheatStateList.call(${context})`,
                awaitPromise: true,
                returnByValue: true,
            });

            if (statesResult.exceptionDetails) {
                console.error("API Error getting cheat states:", statesResult.exceptionDetails.text);
                res.status(500).json({
                    error: "Failed to get cheat states from game",
                    details: statesResult.exceptionDetails.text,
                });
            } else {
                res.json({ data: statesResult.result.value || {} });
            }
        } catch (apiError) {
            console.error("API Error in /api/cheat-states:", apiError);
            res.status(500).json({
                error: "Internal server error while fetching cheat states",
                details: apiError.message,
            });
        }
    });

    app.get("/api/options-account", async (req, res) => {
        try {
            const optionsResult = await Runtime.evaluate({
                expression: `getOptionsListAccount.call(${context})`,
                awaitPromise: true,
                returnByValue: true,
            });

            if (optionsResult.exceptionDetails) {
                console.error("API Error getting OptionsListAccount:", optionsResult.exceptionDetails.text);
                res.status(500).json({
                    error: "Failed to get OptionsListAccount from game",
                    details: optionsResult.exceptionDetails.text,
                });
            } else {
                let data = optionsResult.result.value;

                // FIX: Normalize object/map response to array
                if (data && typeof data === "object" && !Array.isArray(data)) {
                    data = Object.assign([], data);
                }

                if (data === null) {
                    res.status(500).json({ error: "OptionsListAccount not found in game context" });
                } else {
                    res.json({ data: data });
                }
            }
        } catch (apiError) {
            console.error("API Error in /api/options-account:", apiError);
            res.status(500).json({
                error: "Internal server error while fetching OptionsListAccount",
                details: apiError.message,
            });
        }
    });

    app.post("/api/options-account/index", async (req, res) => {
        const { index, value } = await req.json();

        if (index === undefined || value === undefined) {
            return res.status(400).json({
                error: "Missing required parameters: index and value",
            });
        }

        if (typeof index !== "number" || index < 0) {
            return res.status(400).json({
                error: "Invalid index. Must be a non-negative number.",
            });
        }

        try {
            let serializedValue;
            if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                serializedValue = objToString(value);
            } else {
                serializedValue = JSON.stringify(value);
            }

            const updateExpression = `setOptionsListAccountIndex.call(${context}, ${index}, ${serializedValue})`;

            const updateResult = await Runtime.evaluate({
                expression: updateExpression,
                awaitPromise: true,
                allowUnsafeEvalBlockedByCSP: true,
            });

            if (updateResult.exceptionDetails) {
                console.error(`API Error updating OptionsListAccount[${index}]:`, updateResult.exceptionDetails.text);
                res.status(500).json({
                    error: `Failed to update OptionsListAccount[${index}] in game`,
                    details: updateResult.exceptionDetails.text,
                });
            } else {
                const success = updateResult.result.value;
                if (success) {
                    console.log(`[Web UI] OptionsListAccount[${index}] updated to:`, value);
                    res.json({ message: `Index ${index} updated successfully`, value: value });
                } else {
                    res.status(500).json({ error: `Failed to update OptionsListAccount[${index}] in game context` });
                }
            }
        } catch (apiError) {
            console.error(`API Error in /api/options-account/index POST:`, apiError);
            res.status(500).json({
                error: "Internal server error while updating OptionsListAccount index",
                details: apiError.message,
            });
        }
    });

    app.post("/api/config/save", async (req, res) => {
        const receivedFullConfig = await req.json();

        if (
            !receivedFullConfig ||
            typeof receivedFullConfig !== "object" ||
            !receivedFullConfig.cheatConfig ||
            !Array.isArray(receivedFullConfig.startupCheats)
        ) {
            return res.status(400).json({
                error: "Invalid configuration data received for saving. Expected { startupCheats: [...], cheatConfig: {...} }.",
            });
        }

        try {
            const uiCheatConfigRaw = receivedFullConfig.cheatConfig || cheatConfig;
            const uiStartupCheats = receivedFullConfig.startupCheats || startupCheats;
            const uiInjectorConfig = receivedFullConfig.injectorConfig || injectorConfig;

            let parsedUiCheatConfig = parseConfigFromJson(uiCheatConfigRaw);

            if (defaultConfig?.cheatConfig) {
                parsedUiCheatConfig = filterByTemplate(parsedUiCheatConfig, defaultConfig.cheatConfig) || {};
            }

            let filteredInjectorConfig = uiInjectorConfig;
            if (defaultConfig?.injectorConfig) {
                filteredInjectorConfig = filterByTemplate(uiInjectorConfig, defaultConfig.injectorConfig) || {};
            }

            const cheatConfigDiff = getDeepDiff(parsedUiCheatConfig, defaultConfig?.cheatConfig) || {};
            const injectorConfigDiff = getDeepDiff(filteredInjectorConfig, defaultConfig?.injectorConfig) || {};
            const startupCheatsDiff =
                JSON.stringify(uiStartupCheats) !== JSON.stringify(defaultConfig?.startupCheats) ? uiStartupCheats : [];

            const new_injectorConfig = objToString(injectorConfigDiff).replaceAll("\\", "\\\\");

            const fileContentString = `
/****************************************************************************************************
 * This file is generated by the Idleon Cheat Injector UI.
 * Only user overrides are saved here - defaults are inherited from config.js.
 * Manual edits might be overwritten when saving from the UI.
 ****************************************************************************************************/

exports.startupCheats = ${JSON.stringify(startupCheatsDiff, null, "\t")};

exports.cheatConfig = ${objToString(cheatConfigDiff)};

exports.injectorConfig = ${new_injectorConfig};
`;
            const savePath = path.join(process.cwd(), "config.custom.js");

            await fs.writeFile(savePath, fileContentString.trim());
            console.log(`[Web UI] Configuration saved to ${savePath}`);

            if (uiStartupCheats) {
                startupCheats.length = 0;
                startupCheats.push(...uiStartupCheats);
            }
            if (parsedUiCheatConfig) deepMerge(cheatConfig, parsedUiCheatConfig);
            if (filteredInjectorConfig) deepMerge(injectorConfig, filteredInjectorConfig);

            res.json({ message: "Configuration successfully saved to config.custom.js" });
        } catch (apiError) {
            console.error("API Error in /api/config/save:", apiError);
            res.status(500).json({
                error: "Internal server error while saving configuration file",
                details: apiError.message,
            });
        }
    });

    app.post("/api/open-url", async (req, res) => {
        const { url } = await req.json();
        if (!url) {
            return res.status(400).json({ error: "Missing url parameter" });
        }

        const command =
            process.platform === "win32"
                ? `start "" "${url}"`
                : process.platform === "darwin"
                ? `open "${url}"`
                : `xdg-open "${url}"`;

        exec(command, (error) => {
            if (error) {
                console.error(`Failed to open URL: ${url}`, error);
                return res.status(500).json({ error: "Failed to open URL", details: error.message });
            }
            res.json({ message: "URL opened successfully" });
        });
    });
}

module.exports = {
    setupApiRoutes,
};
