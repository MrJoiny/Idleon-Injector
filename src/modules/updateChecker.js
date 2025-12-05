const https = require('https');

/**
 * Compares two semantic version strings.
 * @param {string} v1 - First version string (e.g., "1.4.2")
 * @param {string} v2 - Second version string (e.g., "1.5.0")
 * @returns {number} - 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
    const p1 = v1.replace(/^v/, '').split('.').map(Number);
    const p2 = v2.replace(/^v/, '').split('.').map(Number);

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
function checkForUpdates(currentVersion) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.github.com',
            path: '/repos/MrJoiny/Idleon-Injector/releases/latest',
            method: 'GET',
            headers: {
                'User-Agent': 'Idleon-Injector-Update-Checker'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const release = JSON.parse(data);
                        const latestVersion = release.tag_name;

                        if (compareVersions(latestVersion, currentVersion) > 0) {
                            resolve({
                                updateAvailable: true,
                                latestVersion: latestVersion,
                                url: release.html_url
                            });
                        } else {
                            resolve({ updateAvailable: false });
                        }
                    } catch (e) {
                        console.error('Failed to parse update check response:', e);
                        resolve(null);
                    }
                } else {
                    // Silently fail on non-200 to avoid annoying users if offline/rate limited
                    resolve(null);
                }
            });
        });

        req.on('error', (error) => {
            console.error('Update check failed:', error.message);
            resolve(null);
        });

        req.end();
    });
}

module.exports = { checkForUpdates };
