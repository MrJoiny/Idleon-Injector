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
const { existsSync, access } = require('fs');
const { promisify } = require('util');

const {
  getCdpPort,
  getInjectorConfig,
  isLinux,
  getLinuxTimeout
} = require('../config/configManager');

const accessAsync = promisify(access);

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
 * Basic attach function for launching a game executable with remote debugging
 * @param {string} name - Path to the executable
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
function attach(name) {
  const cdp_port = getCdpPort();

  return new Promise((resolve, reject) => {
    const idleon = spawn(name, [`--remote-debugging-port=${cdp_port}`]);
    let resolved = false;

    idleon.stderr.on('data', (data) => {
      const match = data.toString().match(/DevTools listening on (ws:\/\/.*)/);
      if (match && !resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve(match[1]);
      }
    });

    idleon.on('error', (err) => {
      if (!resolved) {
        clearTimeout(timeoutId);
        reject(err);
      }
    });

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        try {
          idleon.kill('SIGTERM');
        } catch (err) {
        }
        reject(new Error('Timeout waiting for game to start'));
      }
    }, 30000);

    idleon.on('close', () => {
      clearTimeout(timeoutId);
      if (!resolved) {
        reject(new Error('Game process closed before CDP was available'));
      }
    });
  });
}

/**
 * Linux-specific attach function that polls for CDP endpoint
 * @param {number} timeout - Timeout in milliseconds (default: 10000)
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
function attachLinux(timeout = LINUX_TIMEOUT) {
  return waitForCdpEndpoint(timeout);
}

/**
 * Automatic Linux attach with Steam integration
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
async function autoAttachLinux(timeout = DEFAULT_TIMEOUT) {
  const cdp_port = getCdpPort();

  let steamCmd = "steam";

  const possibleSteamPaths = COMMON_STEAM_PATHS;
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
    console.error("[Linux] Could not find Steam executable. Please ensure Steam is installed and in your PATH.");
    throw new Error("Steam not found");
  }

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
  const stderrHandler = (data) => {
    stderr += data.toString();
  };
  child.stderr.on("data", stderrHandler);

  try {
    const wsUrl = await attachLinux(timeout);
    child.stderr.off("data", stderrHandler);
    return wsUrl;
  } catch (e) {
    child.stderr.off("data", stderrHandler);
    throw new Error(`[Linux] Failed to auto-launch with Steam: ${e.message}\nStderr: ${stderr}`);
  }
}

/**
 * Windows-specific attach function that polls for CDP endpoint
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise<string>} WebSocket URL for Chrome DevTools Protocol
 */
function attachWindows(timeout = DEFAULT_TIMEOUT) {
  return waitForCdpEndpoint(timeout);
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

  for (const path of DEFAULT_IDLEON_PATHS) {
    if (existsSync(path)) return path;
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
      hook = await attachLinux(linuxTimeout);
    }
  } else if (os.platform() === 'win32') {
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
      hook = await attachWindows(linuxTimeout || DEFAULT_TIMEOUT);
    }
  } else {
    hook = await attach('LegendsOfIdleon.exe');
  }

  console.log("Attached to game process.");
  return hook;
}

module.exports = {
  attachToGame,
  attach,
  attachLinux,
  autoAttachLinux,
  attachWindows,
  findIdleonExe,
  launchIdleonViaSteamProtocol
};