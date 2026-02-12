# Backend Architecture

How the Node.js backend attaches to Idleon, injects the cheat bundle, and serves the UI/API/CLI.

## Repository layout

- `src/main.js`: Application entry point and orchestration.
- `src/modules/config/configManager.js`: Loads `config.js` and `config.custom.js` and exposes accessors.
- `src/modules/game/`: CDP attachment and injection pipeline.
- `src/modules/server/`: Web server, API routes, and WebSocket updates.
- `src/modules/server/tinyRouter.js`: Lightweight router with `.json()` and `.status()` helpers.
- `src/modules/server/wsServer.js`: WebSocket lifecycle, cheat-state broadcasts, and value monitor sync.
- `src/modules/cli/cliInterface.js`: Interactive CLI prompt.
- `src/modules/updateChecker.js`: GitHub release check for update hints.
- `src/modules/utils/`: Logging and helper utilities.

## Startup sequence

`src/main.js` drives the runtime in this order:

1. `printHeader()` shows version info and update check.
2. `loadConfiguration()` merges defaults with `config.custom.js` overrides.
3. `createWebServer()` prepares the TinyRouter instance (UI optional).
4. `attachToTarget()` connects to Steam or Web targets via CDP.
5. `setupIntercept()` installs request interception and injects `cheats.js`.
6. Registers `Page.loadEventFired` handler to initialize the cheat context.
7. `Page.reload({ ignoreCache: true })` triggers the first intercepted load.
8. `initializeCheatContext()` runs `setup.call(context)` in the game.
9. Starts API routes, WebSocket server, and CLI once the first page load completes.

The `servicesStarted` flag prevents multiple UI/CLI startups when the page reloads.

`handleError()` logs fatal failures, prints CDP hints, and waits for Enter before exiting.

## Configuration loading

`configManager.js` loads two files in order (relative to `process.cwd()`, with a parent fallback for packaged builds):

- `config.js` (defaults)
- `config.custom.js` (overrides, optional)

Merge behavior:

- `injectorConfig` is deep-merged.
- `startupCheats` is unioned to avoid duplicates.
- `cheatConfig` is deep-merged.
- `defaultConfig` is stored as the pristine `config.js` copy (used for UI diffs and saves).

Ports are fixed by helpers:

- `getCdpPort()` returns the constant `32123`.
- `getWebPort()` returns `injectorConfig.webPort` or falls back to `8080`.
- `getLinuxTimeout()` returns `injectorConfig.onLinuxTimeout` (Linux attach timeout).

## CDP attachment

`src/modules/game/gameAttachment.js` handles platform-specific attachment.

`waitForCdpEndpoint()` polls `http://localhost:<cdpPort>/json/version` until a WebSocket URL appears.

### Steam target

Windows:

- `findIdleonExe()` checks `injectorConfig.gameExePath`, then standard Steam paths.
- `attach(exePath)` spawns `LegendsOfIdleon.exe --remote-debugging-port=32123`.
- If direct launch fails or times out, it falls back to Steam protocol:

```text
steam://run/1476970//--remote-debugging-port=32123
```

Linux:

- `autoAttachLinux()` tries `steam -applaunch 1476970 --remote-debugging-port=32123`.
- If Steam auto-launch fails, it waits for manual launch and polls the CDP endpoint.

macOS:

- Steam target is blocked; use the web target.

### Web target

`attachToWeb()` launches a Chromium-based browser and attaches to the Idleon tab.

- `resolveBrowserPath()` checks `injectorConfig.browserPath` or common install locations by OS.
- Uses `injectorConfig.browserUserDataDir` or defaults to `idleon-web-profile`.
- Spawns the browser with CDP and browser safety flags:

```text
--remote-debugging-port=32123
--user-data-dir=<profile>
--no-first-run
--no-default-browser-check
--remote-allow-origins=*
--site-per-process
--disable-extensions
--new-window
<idleonUrl>
```

- Linux adds `--disable-gpu` for stability.
- `waitForIdleonTarget()` scans CDP targets and matches host or URL against `injectorConfig.webUrl`.
- The returned hook is `target.webSocketDebuggerUrl` (or the target itself when provided).

## Injection pipeline

`src/modules/game/cheatInjection.js` installs a CDP interceptor that patches the game bundle and injects cheats.

Key steps:

1. Read `cheats.js` from disk.
2. Prepend runtime config values used by cheats:

```js
let startupCheats = ["wide mtx"];
let cheatConfig = { ... };
let webPort = 8080;
```

3. Register interception using `injectorConfig.interceptPattern` (default `*N.js`).
4. Disable cache and bypass CSP to keep interception reliable.
5. For each intercepted response:
    - Download the body (`Network.getResponseBodyForInterception`).
    - Match `injectorConfig.injreg` (default `\w+\.ApplicationMain\s*?=`) to capture the game root variable.
    - Evaluate the cheat bundle in the page context (`Runtime.evaluate`) before patching the script.
    - Inject the game root reference into `window.__idleon_cheats__`.
    - Return the modified response via `rawResponse` (full headers + body).
6. If injection fails, the interceptor continues the original request to avoid a hanging load.

Relevant snippet:

```js
const replacementRegex = new RegExp(config.injreg);
const newBody = originalBody.replace(replacementRegex, `window.__idleon_cheats__=${AppVar[0]};$&`);
```

## Cheat context and runtime init

`createCheatContext()` builds the expression used by both UI and CLI:

```js
window.__idleon_cheats__ || window.document.querySelector("iframe")?.contentWindow?.__idleon_cheats__;
```

`initializeCheatContext()` checks the context exists, then executes:

```js
setup.call(context);
```

`initializeCheatContext()` uses `allowUnsafeEvalBlockedByCSP` and returns false if the context is missing.

## Web server and API

`src/modules/server/webServer.js` creates a lightweight HTTP server:

- `TinyRouter` handles JSON API routes.
- Static assets are served from `src/ui` when `injectorConfig.enableUI` is true (root `/` maps to `entry/index.html`).
- WebSocket server is attached for live cheat-state updates.

`tinyRouter.js` polyfills `res.status()`, `res.json()`, and `req.json()` for JSON bodies.

`src/modules/server/apiRoutes.js` defines all REST endpoints. The core ones are:

- `GET /api/heartbeat`: `{ status: "online", timestamp }`
- `GET /api/cheats`: autocomplete list from `getAutoCompleteSuggestions`.
- `POST /api/toggle`: executes a cheat command.
- `GET /api/config`: startupCheats + cheatConfig + injectorConfig + defaultConfig.
- `POST /api/config/update`: updates runtime config in memory and in-game.
- `POST /api/config/save`: writes `config.custom.js` with diffs only.
- `GET /api/options-account`: reads `OptionsListAccount` from game memory.
- `POST /api/options-account/index`: writes a single options list entry.
- `GET /api/cheat-states`: returns current cheat states via `cheatStateList`.
- `GET /api/devtools-url`: returns the CDP DevTools URL for the attached target.
- `POST /api/open-url`: opens a local browser tab for help/devtools links.

Example payload:

```json
POST /api/toggle
{ "action": "wide mtx" }
```

Successful responses return `{ result: "..." }` with the command output string.

## WebSocket updates

`src/modules/server/wsServer.js` pushes cheat-state and monitor updates to UI clients, and accepts updates from the game runtime.

Message format:

```json
{
    "type": "cheat-states",
    "data": { "wide": { "mtx": true } }
}
```

`broadcastCheatStates()` is called after cheats run so the UI stays in sync without polling.

Monitor messages:

```json
{ "type": "identify", "clientType": "ui" }
{ "type": "monitor-subscribe", "id": "gga-GemsOwned", "path": "gga.GemsOwned" }
{ "type": "monitor-unsubscribe", "id": "gga-GemsOwned" }
{ "type": "monitor-update", "id": "gga-GemsOwned", "value": 123, "ts": 1700000000000 }
{ "type": "monitor-state", "data": { "gga-GemsOwned": { "path": "gga.GemsOwned", "history": [] } } }
```

Notes:

- Clients default to `ui`; the game runtime re-identifies with `identify`.
- Monitor history stores the last 10 values per id, broadcast as `monitor-state`.
- `monitor-subscribe` and `monitor-unsubscribe` evaluate `window.monitorWrap` and `window.monitorUnwrap` in the game context.

On connection, clients receive current cheat state and monitor state immediately.

## CLI integration

`src/modules/cli/cliInterface.js` uses the same CDP context as the UI:

- Autocomplete list comes from `getAutoCompleteSuggestions.call(context)`.
- Commands execute via `cheat.call(context, '<action>')`.
- A built-in `chromedebug` command opens the DevTools URL directly.
- The CLI uses Enquirer autocomplete with token matching and a two-step confirm for parameterized cheats.

## Error handling and troubleshooting

- `No inspectable targets` usually means Steam is not running or the game is already open without `--remote-debugging-port`.
- `Injection regex did not match` indicates `injectorConfig.injreg` is stale after a game update.
- `Timeout waiting for debugger WebSocket URL` means the target never opened the CDP port.
- `webUrl is required when target is 'web'` means a URL is missing for web attach.
- `Could not find a compatible Chromium-based browser` means auto-detection failed.
- `Cheat context not found` means the page loaded but `window.__idleon_cheats__` was never created.

When adding API routes, wrap runtime calls in `try/catch` and return JSON errors:

```js
res.status(500).json({ error: error.message });
```
