const { createUpdater } = require("../../updateService");
const { version } = require("../../../../package.json");
const { createLogger } = require("../../utils/logger");

const log = createLogger("API");

function setupUpdateRoutes(app, client, injectorConfig) {
    const updater = createUpdater();

    app.get("/api/update/check", async (req, res) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const updateInfo = await updater.check(url.searchParams.get("force") === "1");
            res.json({
                currentVersion: version,
                canApplyUpdate: !!process.pkg,
                checkedAt: Date.now(),
                updateAvailable: !!updateInfo?.updateAvailable,
                latestVersion: updateInfo?.latestVersion || version,
                url: updateInfo?.url || null,
                error: null,
            });
        } catch (error) {
            log.error("Error in /api/update/check:", error);
            res.status(500).json({
                currentVersion: version,
                canApplyUpdate: !!process.pkg,
                checkedAt: Date.now(),
                updateAvailable: false,
                latestVersion: version,
                url: null,
                error: error.message,
            });
        }
    });

    app.post("/api/update/apply", async (req, res) => {
        if (!process.pkg) {
            return res.status(400).json({
                error: "Auto-update is only available in packaged builds.",
            });
        }

        try {
            const preparedUpdate = await updater.prepare();
            if (!preparedUpdate) {
                return res.status(409).json({ error: "No update is available." });
            }

            res.json({
                message: "Update prepared. The app and game will close now. Restart manually after it exits.",
                updatedFileNames: preparedUpdate.updatedFileNames,
            });

            setTimeout(() => {
                updater.applyPrepared(client, { injectorConfig }, preparedUpdate).catch((error) => {
                    log.error("Failed to apply prepared update:", error);
                    process.exit(1);
                });
            }, 250);
        } catch (error) {
            log.error("Error in /api/update/apply:", error);
            res.status(500).json({ error: "Update failed", details: error.message });
        }
    });
}

module.exports = { setupUpdateRoutes };
