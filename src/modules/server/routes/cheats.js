const { broadcastCheatStates } = require("../wsServer");
const { createLogger } = require("../../utils/logger");

const log = createLogger("API");

function setupCheatRoutes(app, gameBridge) {
    app.get("/api/cheats", async (req, res) => {
        try {
            const suggestionsResult = await gameBridge.callHelper("getAutoCompleteSuggestions");
            if (suggestionsResult.error) {
                log.error("Error getting autocomplete suggestions:", suggestionsResult.error.text);
                res.status(500).json({
                    error: "Failed to get cheats from game",
                    details: suggestionsResult.error.text,
                });
            } else {
                const allCheats = suggestionsResult.value || [];

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
            log.error("Error in /api/cheats:", apiError);
            res.status(500).json({ error: "Internal server error while fetching cheats" });
        }
    });

    app.post("/api/toggle", async (req, res) => {
        const { action } = await req.json();
        if (!action) {
            return res.status(400).json({ error: "Missing action parameter" });
        }
        try {
            const cheatResponse = await gameBridge.executeCheat(action);
            if (cheatResponse.error) {
                log.error(`Error executing cheat '${action}':`, cheatResponse.error.text);
                res.status(500).json({
                    error: `Failed to execute cheat '${action}'`,
                    details: cheatResponse.error.text,
                });
            } else {
                log.debug(`Executed: ${action} -> ${cheatResponse.value}`);
                res.json({ result: cheatResponse.value });

                // Broadcast updated cheat states to all WebSocket clients
                broadcastCheatStates();
            }
        } catch (apiError) {
            log.error(`Error executing cheat '${action}':`, apiError);
            res.status(500).json({ error: `Internal server error while executing cheat '${action}'` });
        }
    });

    app.get("/api/cheat-states", async (req, res) => {
        try {
            const statesResult = await gameBridge.callHelper("cheatStateList");

            if (statesResult.error) {
                log.error("Error getting cheat states:", statesResult.error.text);
                res.status(500).json({
                    error: "Failed to get cheat states from game",
                    details: statesResult.error.text,
                });
            } else {
                res.json({ data: statesResult.value || {} });
            }
        } catch (apiError) {
            log.error("Error in /api/cheat-states:", apiError);
            res.status(500).json({
                error: "Internal server error while fetching cheat states",
                details: apiError.message,
            });
        }
    });
}

module.exports = { setupCheatRoutes };
