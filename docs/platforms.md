# Platform and Injection Modes

Idleon Injector supports two targets: Steam and Web. Select the target via `injectorConfig.target` in `config.custom.js`.

## Common constants

- CDP port is fixed at `32123` (`getCdpPort()` in `configManager.js`).
- Default UI port is `8080` unless `injectorConfig.webPort` overrides it.
- Default attach timeout is 30s; Linux uses `injectorConfig.onLinuxTimeout` when attaching.

## Steam target

Set:

```js
exports.injectorConfig = { target: "steam" };
```

### Windows flow

1. `findIdleonExe()` checks `injectorConfig.gameExePath` and common Steam install paths.
2. `attach(exePath)` spawns `LegendsOfIdleon.exe --remote-debugging-port=32123`.
3. If direct launch fails or times out, the injector launches via Steam protocol:

```text
steam://run/1476970//--remote-debugging-port=32123
```

4. The injector polls `http://localhost:32123/json/version` until CDP is ready.

### Linux flow

1. `autoAttachLinux()` searches for `steam.sh` in common paths.
2. Spawns `steam -applaunch 1476970 --remote-debugging-port=32123`.
3. If auto-launch fails, it waits for a manual game launch and polls CDP.
4. Timeout is controlled by `injectorConfig.onLinuxTimeout`.

### macOS

Steam target is not supported on macOS. Use the web target instead.
The main entry point throws a clear error if `target` is not `web` on macOS.

## Web target

Set:

```js
exports.injectorConfig = {
    target: "web",
    webUrl: "https://www.legendsofidleon.com/ytGl5oc/",
};
```

`webUrl` is required for web mode; the injector will error if it is missing.

### Browser resolution

`resolveBrowserPath()` picks a Chromium-based browser by:

1. Using `injectorConfig.browserPath` if set.
2. Falling back to known locations for Chrome, Edge, Brave, or Opera.

If no executable is found, the injector throws a "Could not find a compatible Chromium-based browser" error.

### Browser launch arguments

The injector spawns the browser with:

```text
--remote-debugging-port=32123
--user-data-dir=<profile>
--no-first-run
--no-default-browser-check
--remote-allow-origins=*
--site-per-process
--disable-extensions
--new-window
<webUrl>
```

Linux adds `--disable-gpu` for stability.

If `injectorConfig.browserUserDataDir` is empty, it defaults to `idleon-web-profile` in the repo root.

### Target matching

`waitForIdleonTarget()` selects a CDP page target that:

- Matches `webUrl` exactly, or
- Shares the same host as `webUrl`.

If the Idleon page never appears, the injector throws `Timeout waiting for Idleon page`.

The web attach flow is:

1. Launch the browser with CDP enabled.
2. Poll `/json/version` until the CDP WebSocket URL is available.
3. Find the Idleon page target and return its `webSocketDebuggerUrl`.

## Injection tuning

If a game update changes the bootstrap script, update these fields in `injectorConfig`:

- `interceptPattern` (default `*N.js`).
- `injreg` (default `\w+\.ApplicationMain\s*?=`).

## Troubleshooting

- `No inspectable targets`: Steam client is not running or the game launched without CDP.
- `Timeout waiting for debugger WebSocket URL`: the target did not open CDP on port 32123.
- `Timeout waiting for Idleon page`: wrong `webUrl`, slow load, or browser profile lock.
- `Configured browserPath does not exist`: fix the path or clear it to auto-detect.
- `webUrl is required when target is 'web'`: add a valid Idleon URL.
