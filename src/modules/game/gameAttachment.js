/**
 * Game Attachment Module
 *
 * Handles platform-specific game launching and Chrome DevTools Protocol connection.
 * Supports both Windows (direct executable + Steam protocol) and Linux (Steam integration)
 * with automatic detection and fallback mechanisms for reliable game attachment.
 */

const spawn = require("child_process").spawn;
const http = require("http");
const path = require("path");
const os = require("os");
const { existsSync } = require("fs");
const { access } = require("fs").promises;
const CDP = require("chrome-remote-interface");
const { getRuntimePath } = require("../utils/runtimePaths");

const { getCdpPort, getInjectorConfig, isLinux, getLinuxTimeout } = require("../config/configManager");
const { createLogger } = require("../utils/logger");

const log = createLogger("Game");

const IDLEON_APP_ID = 1476970;
const DEFAULT_TIMEOUT = 30000;
const POLL_INTERVAL = 500;
const COMMON_STEAM_PATHS = [
    "/usr/bin/steam",
    "/usr/local/bin/steam",
    `${process.env.HOME}/.steam/steam/steam.sh`,
    `${process.env.HOME}/.local/share/Steam/steam.sh`,
];
const DEFAULT_IDLEON_PATHS = [
    path.join(
        process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)",
        "Steam/steamapps/common/Legends of Idleon/LegendsOfIdleon.exe"
    ),
    path.join(
        process.env.ProgramFiles || "C:/Program Files",
        "Steam/steamapps/common/Legends of Idleon/LegendsOfIdleon.exe"
    ),
    path.join(
        process.env.ProgramW6432 || "C:/Program Files",
        "Steam/steamapps/common/Legends of Idleon/LegendsOfIdleon.exe"
    ),
    getRuntimePath("LegendsOfIdleon.exe"),
];
const DEFAULT_BROWSER_PATHS = {
    win32: [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
        "C:/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe",
        `C:/Users/${process.env.USERNAME}/AppData/Local/Google/Chrome/Application/chrome.exe`,
        `C:/Users/${process.env.USERNAME}/AppData/Local/Microsoft/Edge/Application/msedge.exe`,
        `C:/Users/${process.env.USERNAME}/AppData/Local/BraveSoftware/Brave-Browser/Application/brave.exe`,
    ],
    darwin: [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/Applications/Opera.app/Contents/MacOS/Opera",
        "/Applications/Opera GX.app/Contents/MacOS/Opera GX",
    ],
    linux: [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/usr/bin/microsoft-edge",
        "/usr/bin/brave",
        "/usr/bin/opera",
        "/snap/bin/opera",
    ],
};

/**
 * Wait for CDP endpoint to be available by polling
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<string>} WebSocket URL
 */
function waitForCdpEndpoint(timeout = DEFAULT_TIMEOUT) {
    const cdp_port = getCdpPort();
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
        function check() {
            const req = http.get(`http://localhost:${cdp_port}/json/version`, (res) => {
                let data = "";
                res.on("data", (chunk) => {
                    data += chunk;
                });
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);
                        if (json.webSocketDebuggerUrl) {
                            return resolve(json.webSocketDebuggerUrl);
                        }
                        retry();
                    } catch {
                        retry();
                    }
                });
            });
            req.on("error", retry);
        }

        function retry() {
            if (Date.now() - startTime > timeout) {
                return reject(
                    new Error("Timeout waiting for debugger WebSocket URL. Have you set --remote-debugging-port?")
                );
            }
            setTimeout(check, POLL_INTERVAL);
        }

        check();
    });
}

/**
 * Basic attach function for launching a game executable with remote debugging
 * @param {string} name - Path to the executable
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
function attach(name) {
    const cdp_port = getCdpPort();

    return new Promise((resolve, reject) => {
        const idleon = spawn(name, [`--remote-debugging-port=${cdp_port}`]);
        let resolved = false;

        idleon.stderr.on("data", (data) => {
            const match = data.toString().match(/DevTools listening on (ws:\/\/.*)/);
            if (match && !resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                resolve(match[1]);
            }
        });

        idleon.on("error", (err) => {
            if (!resolved) {
                clearTimeout(timeoutId);
                reject(err);
            }
        });

        const timeoutId = setTimeout(() => {
            if (!resolved) {
                try {
                    idleon.kill("SIGTERM");
                } catch {
                    // Ignore kill errors; process may have already exited
                }

                reject(new Error("Timeout waiting for game to start"));
            }
        }, 30000);

        idleon.on("close", () => {
            clearTimeout(timeoutId);
            if (!resolved) {
                reject(new Error("Game process closed before CDP was available"));
            }
        });
    });
}

/**
 * Automatic Linux attach with Steam integration
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
async function autoAttachLinux(timeout = DEFAULT_TIMEOUT) {
    const cdp_port = getCdpPort();
    let steamCmd = null;

    for (const steamPath of COMMON_STEAM_PATHS) {
        try {
            await access(steamPath);
            steamCmd = steamPath;
            break;
        } catch {
            // Expected when path doesn't exist, continue searching
        }
    }

    if (!steamCmd) {
        log.error("Steam not found - ensure Steam is installed");
        throw new Error("Steam not found");
    }

    log.info("Launching Idleon via Steam");
    const args = ["-applaunch", IDLEON_APP_ID.toString(), `--remote-debugging-port=${cdp_port}`];

    const child = spawn(steamCmd, args, {
        detached: true,
        stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    child.stderr.on("data", (data) => {
        stderr += data.toString();
    });

    try {
        return await waitForCdpEndpoint(timeout);
    } catch (e) {
        throw new Error(`Failed to auto-launch with Steam: ${e.message}\nStderr: ${stderr}`);
    }
}

/**
 * Resolve the browser executable path for web injection.
 * @param {Object} injectorConfig - Injector configuration.
 * @returns {string} Path to the browser executable.
 */
function resolveBrowserPath(injectorConfig = getInjectorConfig()) {
    if (injectorConfig.browserPath) {
        if (existsSync(injectorConfig.browserPath)) {
            return injectorConfig.browserPath;
        }
        throw new Error(`Configured browserPath does not exist: ${injectorConfig.browserPath}`);
    }

    const candidates = DEFAULT_BROWSER_PATHS[os.platform()] || [];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    throw new Error("Could not find a compatible Chromium-based browser");
}

/**
 * Wait for an Idleon page target to appear in CDP.
 * @param {string} idleonUrl - Idleon web URL to match.
 * @param {number} timeout - Timeout in milliseconds.
 * @returns {Promise<Object>} The matching CDP target.
 */
async function waitForIdleonTarget(idleonUrl, timeout = DEFAULT_TIMEOUT) {
    const cdpPort = getCdpPort();
    const startTime = Date.now();

    const matchesIdleonTarget = (targetUrl) => {
        if (!targetUrl || targetUrl === "about:blank") {
            return false;
        }

        if (targetUrl === idleonUrl || targetUrl.startsWith(idleonUrl)) {
            return true;
        }

        try {
            const targetHost = new URL(targetUrl).host;
            const idleonHost = new URL(idleonUrl).host;
            return targetHost === idleonHost;
        } catch {
            return targetUrl.includes(idleonUrl);
        }
    };

    while (Date.now() - startTime < timeout) {
        try {
            const targets = await CDP.List({ port: cdpPort });
            const target = targets.find((candidate) => {
                if (candidate.type !== "page") {
                    return false;
                }

                return matchesIdleonTarget(candidate.url);
            });

            if (target) {
                return target;
            }
        } catch {
            // CDP not ready yet, will retry
        }

        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }

    throw new Error(`Timeout waiting for Idleon page at ${idleonUrl}`);
}

/**
 * Launch the browser and attach to the Idleon web session.
 * @returns {Promise<Object|string>} CDP target or WebSocket URL.
 */
async function attachToWeb() {
    const injectorConfig = getInjectorConfig();
    const idleonUrl = injectorConfig.webUrl;

    if (!idleonUrl) {
        throw new Error("webUrl is required when target is 'web'");
    }

    const timeout = isLinux() ? getLinuxTimeout() : DEFAULT_TIMEOUT;
    const cdpPort = getCdpPort();
    const browserPath = resolveBrowserPath(injectorConfig);
    const userDataDir = injectorConfig.browserUserDataDir || getRuntimePath("idleon-web-profile");
    const args = [
        `--remote-debugging-port=${cdpPort}`,
        `--user-data-dir=${userDataDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--remote-allow-origins=*",
        "--site-per-process",
        "--disable-extensions",
        "--new-window",
        idleonUrl,
    ];

    if (os.platform() === "linux") {
        args.push("--disable-gpu");
    }

    log.info("Launching browser");
    spawn(browserPath, args, { detached: true, stdio: "ignore" });

    await waitForCdpEndpoint(timeout);

    const target = await waitForIdleonTarget(idleonUrl, timeout);
    const hook = target.webSocketDebuggerUrl || target;

    log.info("Connected to Idleon web session");
    return hook;
}

/**
 * Find the Idleon executable on Windows
 * @returns {string|null} Path to the executable or null if not found
 */
function findIdleonExe() {
    const injectorConfig = getInjectorConfig();

    if (injectorConfig.gameExePath && existsSync(injectorConfig.gameExePath)) {
        return injectorConfig.gameExePath;
    }

    for (const exePath of DEFAULT_IDLEON_PATHS) {
        if (existsSync(exePath)) return exePath;
    }

    return null;
}

/**
 * Launch Idleon via Steam protocol on Windows
 * @returns {ChildProcess} The spawned process
 */
function launchIdleonViaSteamProtocol() {
    const cdp_port = getCdpPort();

    const steamUrl = `steam://run/${IDLEON_APP_ID}//--remote-debugging-port=${cdp_port}`;
    return spawn("cmd", ["/c", "start", "", steamUrl], {
        detached: true,
        stdio: "ignore",
    });
}

/**
 * Main entry point for game attachment that handles platform detection
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
async function attachToGame() {
    const platform = os.platform();
    const timeout = getLinuxTimeout() || DEFAULT_TIMEOUT;

    if (platform === "darwin") {
        throw new Error(
            "Steam target is not supported on macOS. Please set target: 'web' in your config to use the web version"
        );
    }

    let hook;

    if (isLinux()) {
        try {
            hook = await autoAttachLinux(timeout);
        } catch (autoErr) {
            log.warn("Steam auto-launch failed:", autoErr.message);
            log.info("Waiting for manual game launch");
            hook = await waitForCdpEndpoint(timeout);
        }
    } else if (platform === "win32") {
        let exePath = findIdleonExe();
        if (exePath) {
            try {
                hook = await attach(exePath);
            } catch (err) {
                log.warn(`Direct launch failed: ${err.message}`);
                exePath = null;
            }
        }
        if (!exePath) {
            log.info("Launching Idleon via Steam");
            launchIdleonViaSteamProtocol();
            hook = await waitForCdpEndpoint(timeout);
        }
    } else {
        throw new Error(`Unsupported platform for Steam target: ${platform}`);
    }

    log.info("Connected to game process");
    return hook;
}

/**
 * Attach to Idleon based on the configured target.
 * @returns {Promise<Object|string>} CDP target or WebSocket URL.
 */
async function attachToTarget() {
    const injectorConfig = getInjectorConfig();
    const target = (injectorConfig.target || "steam").toLowerCase();

    if (target === "web") {
        return attachToWeb();
    }

    return attachToGame();
}

module.exports = {
    attachToTarget,
};
