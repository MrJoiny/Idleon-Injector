const { createLogger } = require("./utils/logger");

const log = createLogger("UpdateChecker");

/**
 * Compares two semantic version strings.
 * @param {string} v1 - First version string (e.g., "1.4.2")
 * @param {string} v2 - Second version string (e.g., "1.5.0")
 * @returns {number} - 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
    const p1 = v1.replace(/^v/, "").split(".").map(Number);
    const p2 = v2.replace(/^v/, "").split(".").map(Number);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
        const n1 = p1[i] || 0;
        const n2 = p2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
}

/**
 * Checks for updates against the GitHub repository.
 * @param {string} currentVersion - The current version of the application.
 * @returns {Promise<{updateAvailable: boolean, latestVersion: string, url: string}|null>}
 */
async function checkForUpdates(currentVersion) {
    try {
        const response = await fetch("https://api.github.com/repos/MrJoiny/Idleon-Injector/releases/latest", {
            headers: { "User-Agent": "Idleon-Injector-Update-Checker" },
        });

        // Silently fail on non-200 to avoid annoying users if offline/rate limited
        if (!response.ok) return null;

        const release = await response.json();
        const latestVersion = release.tag_name;
        if (compareVersions(latestVersion, currentVersion) <= 0) return { updateAvailable: false };

        return {
            updateAvailable: true,
            latestVersion,
            url: release.html_url,
            assets: (release.assets || []).map((asset) => ({
                name: asset.name,
                url: asset.browser_download_url,
                size: asset.size,
            })),
        };
    } catch (error) {
        log.error("Update check failed:", error.message);
        return null;
    }
}

module.exports = { checkForUpdates };
