/** Register HTTP routes with a shared game bridge and live configuration. */
const { createGameBridge } = require("../game/gameBridge");
const { exec } = require("child_process");
const { createLogger } = require("../utils/logger");
const { version } = require("../../../package.json");
const { setupGameRoutes } = require("./routes/game");
const { setupCheatRoutes } = require("./routes/cheats");
const { setupSearchRoutes } = require("./routes/search");
const { setupConfigRoutes } = require("./routes/config");
const { setupUpdateRoutes } = require("./routes/updates");
const { setupSushiRoutes } = require("./routes/sushi");

const log = createLogger("API");

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
    const gameBridge = createGameBridge(client.Runtime, context);
    const { cdpPort } = config;

    setupUpdateRoutes(app, client, config.injectorConfig);
    setupCheatRoutes(app, gameBridge);
    setupGameRoutes(app, gameBridge);
    setupSearchRoutes(app, gameBridge);
    setupConfigRoutes(app, gameBridge, config);
    setupSushiRoutes(app, gameBridge, client);

    app.get("/api/heartbeat", (req, res) => {
        res.json({ status: "online", timestamp: Date.now() });
    });

    app.get("/api/app-info", (req, res) => {
        try {
            res.json({ version });
        } catch (error) {
            log.error("Error in /api/app-info:", error);
            res.status(500).json({ error: error.message });
        }
    });

    app.get("/api/devtools-url", async (req, res) => {
        try {
            const response = await client.Target.getTargetInfo();
            if (response && response.targetInfo && response.targetInfo.targetId) {
                const targetId = response.targetInfo.targetId;
                const devtoolsUrl = `http://localhost:${cdpPort}/devtools/inspector.html?ws=localhost:${cdpPort}/devtools/page/${targetId}`;
                log.debug(`Generated DevTools URL: ${devtoolsUrl}`);
                res.json({ url: devtoolsUrl });
            } else {
                log.error("Could not get target info to generate DevTools URL");
                res.status(500).json({ error: "Failed to get target information from CDP client" });
            }
        } catch (apiError) {
            log.error("Error getting DevTools URL:", apiError);
            res.status(500).json({
                error: "Internal server error while fetching DevTools URL",
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
                log.error(`Failed to open URL: ${url}`, error);
                return res.status(500).json({ error: "Failed to open URL", details: error.message });
            }
            res.json({ message: "URL opened successfully" });
        });
    });
}

module.exports = { setupApiRoutes };
