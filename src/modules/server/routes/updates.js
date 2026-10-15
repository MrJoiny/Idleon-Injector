const { checkForUpdates } = require("../../updateChecker");
const { performUpdate } = require("../../autoUpdater");
const { applyPreparedUpdateAndExit } = require("../../updateService");
const { version } = require("../../../../package.json");
const { createLogger } = require("../../utils/logger");

const log = createLogger("API");

function setupUpdateRoutes(app, client, injectorConfig) {
    let cachedUpdateInfo = null;
    let updateCheckRequest = null;

    const getUpdateInfo = (force = false) => {
        if (!force && cachedUpdateInfo) return cachedUpdateInfo;
        if (!force && updateCheckRequest) return updateCheckRequest;

        updateCheckRequest = checkForUpdates(version)
            .then((updateInfo) => {
                cachedUpdateInfo = updateInfo || { updateAvailable: false };
                return cachedUpdateInfo;
            })
            .finally(() => {
                updateCheckRequest = null;
            });

        return updateCheckRequest;
    };

    app.get("/api/update/check", async (req, res) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const updateInfo = await getUpdateInfo(url.searchParams.get("force") === "1");
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
            const updateInfo = await getUpdateInfo();
            if (!updateInfo?.updateAvailable) {
                return res.status(409).json({ error: "No update is available." });
            }

            const preparedUpdate = await performUpdate(updateInfo);
            res.json({
                message: "Update prepared. The app and game will close now. Restart manually after it exits.",
                updatedFileNames: preparedUpdate.updatedFileNames,
            });

            setTimeout(() => {
                applyPreparedUpdateAndExit(client, { injectorConfig }, preparedUpdate).catch((error) => {
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
