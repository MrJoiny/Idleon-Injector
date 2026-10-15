const { deepMerge } = require("../../utils/objectUtils");
const { prepareConfigForJson, parseConfigFromJson } = require("../../utils/helpers");
const { saveConfiguration } = require("../../config/configManager");
const { createLogger } = require("../../utils/logger");

const log = createLogger("API");

function setupConfigRoutes(app, gameBridge, config) {
    const { cheatConfig, defaultConfig, startupCheats, injectorConfig } = config;

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
            log.error("Error preparing full config for JSON:", error);
            res.status(500).json({ error: "Internal server error while preparing configuration" });
        }
    });

    app.post("/api/config/update", async (req, res) => {
        const receivedFullConfig = await req.json();

        if (!receivedFullConfig || typeof receivedFullConfig !== "object") {
            return res.status(400).json({
                error: "Invalid configuration data received",
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
                log.debug("Updated server-side startupCheats");
            }

            if (receivedFullConfig.injectorConfig) {
                deepMerge(injectorConfig, receivedFullConfig.injectorConfig);
                log.debug("Updated server-side injectorConfig");
            }

            const parsedCheatConfig = receivedFullConfig.cheatConfig
                ? parseConfigFromJson(receivedFullConfig.cheatConfig)
                : cheatConfig;
            const contextExistsResult = await gameBridge.isAttached();
            if (!contextExistsResult) {
                log.error("Cheat context not found in iframe. Cannot update config in game");
                return res.status(200).json({
                    message: "Configuration updated on server, but failed to apply in game (context lost)",
                });
            }

            const updateResult = await gameBridge.updateConfig(parsedCheatConfig);

            let gameUpdateDetails = "N/A";
            if (updateResult.error) {
                log.error("Error updating config in game:", updateResult.error.text);
                gameUpdateDetails = `Failed to apply in game: ${updateResult.error.text}`;
                return res.status(200).json({
                    message: "Configuration updated on server, but failed to apply in game",
                    details: gameUpdateDetails,
                });
            } else {
                gameUpdateDetails = updateResult.value;
                log.debug(`In-game config update result: ${gameUpdateDetails}`);
                if (gameUpdateDetails.startsWith("Error:")) {
                    return res.status(200).json({
                        message: "Configuration updated on server, but failed to apply in game",
                        details: gameUpdateDetails,
                    });
                }
            }

            res.json({ message: "Configuration updated successfully", details: gameUpdateDetails });
        } catch (apiError) {
            log.error("Error in /api/config/update:", apiError);
            res.status(500).json({
                error: "Internal server error while updating configuration",
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
                error: "Invalid configuration data received for saving. Expected { startupCheats: [...], cheatConfig: {...} }",
            });
        }

        try {
            await saveConfiguration(receivedFullConfig);
            res.json({ message: "Configuration successfully saved to config.custom.js" });
        } catch (apiError) {
            log.error("Error in /api/config/save:", apiError);
            res.status(500).json({
                error: "Internal server error while saving configuration file",
                details: apiError.message,
            });
        }
    });
}

module.exports = { setupConfigRoutes };
