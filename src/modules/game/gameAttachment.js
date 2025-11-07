/**
 * Game Attachment Module
 * 
 * Handles platform-specific game launching and Chrome DevTools Protocol connection.
 * Supports both Windows (direct executable + Steam protocol) and Linux (Steam integration)
 * with automatic detection and fallback mechanisms for reliable game attachment.
 */

const spawn = require('child_process').spawn;
const http = require('http');
const path = require('path');
const os = require('os');
const { existsSync } = require('fs');

const {
  getCdpPort,
  getInjectorConfig,
  isLinux,
  getLinuxTimeout
} = require('../config/configManager');

// Constants
const IDLEON_APP_ID = 1476970;
const DEFAULT_TIMEOUT = 30000;
const LINUX_TIMEOUT = 10000;
const POLL_INTERVAL = 500;
const COMMON_STEAM_PATHS = [
  "/usr/bin/steam",
  "/usr/local/bin/steam",
  `${process.env.HOME}/.steam/steam/steam.sh`,
  `${process.env.HOME}/.local/share/Steam/steam.sh`,
];
const DEFAULT_IDLEON_PATHS = [
  path.join(process.env["ProgramFiles(x86)"] || "C:/Program Files (x86)", "Steam/steamapps/common/Legends of Idleon/LegendsOfIdleon.exe"),
  path.join(process.env["ProgramFiles"] || "C:/Program Files", "Steam/steamapps/common/Legends of Idleon/LegendsOfIdleon.exe"),
  path.join(process.env["ProgramW6432"] || "C:/Program Files", "Steam/steamapps/common/Legends of Idleon/LegendsOfIdleon.exe"),
  path.join(process.cwd(), "LegendsOfIdleon.exe"),
];

/**
 * Basic attach function for launching a game executable with remote debugging
 * @param {string} name - Path to the executable
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
function attach(name) {
  const cdp_port = getCdpPort();

  return new Promise((resolve, reject) => {
    const idleon = spawn(name, [`--remote-debugging-port=${cdp_port}`]);

    // Chrome/Electron outputs the DevTools WebSocket URL to stderr on startup.
    idleon.stderr.on('data', (data) => {
      const match = data.toString().match(/DevTools listening on (ws:\/\/.*)/);
      if (match) {
        resolve(match[1]);
      }
    });

    // Add error handler for spawn issues (like ENOENT)
    idleon.on('error', (err) => {
      reject(err); // Reject the promise to propagate the error
    });
  });
}

/**
 * Linux-specific attach function that polls for CDP endpoint
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
function AttachLinux(timeout = LINUX_TIMEOUT) {
  const cdp_port = getCdpPort();
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    function check() {
      const req = http.get(`http://localhost:${cdp_port}/json/version`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.webSocketDebuggerUrl) {
              return resolve(json.webSocketDebuggerUrl);
            }
            retry();
          } catch (err) {
            retry();
          }
        });
      });

      req.on('error', retry);
    }

    function retry() {
      if (Date.now() - startTime > timeout) {
        return reject(new Error('Timeout waiting for debugger WebSocket URL. Have you set --remote-debugging-port?'));
      }
      setTimeout(check, POLL_INTERVAL);
    }

    check();
  });
}

/**
 * Automatic Linux attach with Steam integration
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
async function autoAttachLinux(timeout = DEFAULT_TIMEOUT) {
  const cdp_port = getCdpPort();

  let steamCmd = "steam";

  // Try common locations if not in PATH
  const possibleSteamPaths = COMMON_STEAM_PATHS;

  const { access } = require("fs");
  const { promisify } = require("util");
  const accessAsync = promisify(access);
  let foundSteam = false;

  for (const p of possibleSteamPaths) {
    try {
      await accessAsync(p);
      steamCmd = p;
      foundSteam = true;
      break;
    } catch (e) { }
  }

  if (!foundSteam) {
    try {
      await accessAsync("/usr/bin/steam");
      steamCmd = "/usr/bin/steam";
      foundSteam = true;
    } catch (e) { }
  }

  if (!foundSteam) {
    console.error("[Linux] Could not find Steam executable. Please ensure Steam is installed and in your PATH.");
    throw new Error("Steam not found");
  }

  // Launch the game using Steam with the required parameters
  console.log(`[Linux] Launching Legends of Idleon using Steam (AppID: ${IDLEON_APP_ID})...`);
  const args = [
    "-applaunch",
    IDLEON_APP_ID.toString(),
    `--remote-debugging-port=${cdp_port}`
  ];

  const child = spawn(steamCmd, args, {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", (data) => {
    stderr += data.toString();
  });

  // Poll for CDP endpoint (reuse AttachLinux logic)
  try {
    const wsUrl = await AttachLinux(timeout);
    return wsUrl;
  } catch (e) {
    throw new Error(`[Linux] Failed to auto-launch with Steam: ${e.message}\nStderr: ${stderr}`);
  }
}

/**
 * Windows-specific attach function that polls for CDP endpoint
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
function AttachWindows(timeout = DEFAULT_TIMEOUT) {
  const cdp_port = getCdpPort();

  // Poll for CDP endpoint (like Linux)
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      const req = http.get(`http://localhost:${cdp_port}/json/version`, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.webSocketDebuggerUrl) {
              return resolve(json.webSocketDebuggerUrl);
            }
            retry();
          } catch (err) {
            retry();
          }
        });
      });
      req.on('error', retry);
    }

    function retry() {
      if (Date.now() - startTime > timeout) {
        return reject(new Error('Timeout waiting for debugger WebSocket URL. Have you set --remote-debugging-port?'));
      }
      setTimeout(check, POLL_INTERVAL);
    }

    check();
  });
}

/**
 * Find the Idleon executable on Windows
 * @returns {string|null} Path to the executable or null if not found
 */
function findIdleonExe() {
  const injectorConfig = getInjectorConfig();

  // Default Steam install locations for Idleon
  const defaultSteamPaths = DEFAULT_IDLEON_PATHS;

  if (injectorConfig.gameExePath && existsSync(injectorConfig.gameExePath)) {
    return injectorConfig.gameExePath;
  }

  for (const p of defaultSteamPaths) {
    if (existsSync(p)) return p;
  }

  return null;
}

/**
 * Launch Idleon via Steam protocol on Windows
 * @returns {ChildProcess} The spawned process
 */
function launchIdleonViaSteamProtocol() {
  const cdp_port = getCdpPort();

  // Pass remote debugging port as launch arg
  const steamUrl = `steam://run/${IDLEON_APP_ID}//--remote-debugging-port=${cdp_port}`;
  return spawn('cmd', ['/c', 'start', '', steamUrl], { detached: true, stdio: 'ignore' });
}

/**
 * Main entry point for game attachment that handles platform detection
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
async function attachToGame() {
  const onLinux = isLinux();
  const linuxTimeout = getLinuxTimeout();

  let hook;

  if (onLinux) {
    try {
      hook = await autoAttachLinux(linuxTimeout);
    } catch (autoErr) {
      console.error("[Linux] Auto attach failed:", autoErr.message);
      console.log("[Linux] Falling back to manual attach. Please launch the game via Steam with the required parameters.");
      hook = await AttachLinux(linuxTimeout);
    }
  } else if (os.platform() === 'win32') {
    // --- Windows logic ---
    let exePath = findIdleonExe();
    if (exePath) {
      try {
        hook = await attach(exePath);
      } catch (err) {
        console.error(`[Windows] Failed to launch Idleon EXE at ${exePath}:`, err.message);
        exePath = null;
      }
    }
    if (!exePath) {
      console.log('[Windows] Could not find LegendsOfIdleon.exe. Attempting to launch via Steam protocol...');
      launchIdleonViaSteamProtocol();
      hook = await AttachWindows(linuxTimeout || DEFAULT_TIMEOUT);
    }
  } else {
    // Default (legacy) logic
    hook = await attach('LegendsOfIdleon.exe');
  }

  console.log("Attached to game process.");
  return hook;
}

module.exports = {
  attachToGame,
  attach,
  AttachLinux,
  autoAttachLinux,
  AttachWindows,
  findIdleonExe,
  launchIdleonViaSteamProtocol
};