const { prepareConfigForJson } = require("../../utils/helpers");
const { saveConfiguration, updateSessionConfiguration } = require("../../config/configManager");
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
            const result = await updateSessionConfiguration(receivedFullConfig, config, gameBridge);
            if (result.contextLost) {
                return res.status(200).json({
                    message: "Configuration updated on server, but failed to apply in game (context lost)",
                });
            }

            if (!result.gameApplied) {
                return res.status(200).json({
                    message: "Configuration updated on server, but failed to apply in game",
                    details: result.details,
                });
            }

            res.json({ message: "Configuration updated successfully", details: result.details });
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
