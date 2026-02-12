# Platform and Injection Modes

Two targets: Steam and Web. Select via `injectorConfig.target` in `config.custom.js`.

## Common constants

- CDP port fixed at `32123` (`getCdpPort()` in `configManager.js`).
- UI port defaults to `8080` unless `injectorConfig.webPort` overrides.
- Attach timeout defaults to 30s; Linux uses `injectorConfig.onLinuxTimeout`.

## Steam target

Set:

```js
exports.injectorConfig = { target: "steam" };
```

### Windows flow

1. `findIdleonExe()` checks `injectorConfig.gameExePath` and common Steam install paths.
2. `attach(exePath)` spawns `LegendsOfIdleon.exe --remote-debugging-port=32123`.
3. If direct launch fails or times out, falls back to Steam protocol:

```text
steam://run/1476970//--remote-debugging-port=32123
```

4. Polls `http://localhost:32123/json/version` until CDP is ready.

### Linux flow

1. `autoAttachLinux()` searches for `steam.sh` in common paths.
2. Spawns `steam -applaunch 1476970 --remote-debugging-port=32123`.
3. If auto-launch fails, waits for manual launch and polls CDP.
4. Timeout is controlled by `injectorConfig.onLinuxTimeout`.

### macOS

Steam target not supported on macOS. Use web target instead.
Entry point throws an error if `target` is not `web` on macOS.

## Web target

Set:

```js
exports.injectorConfig = {
    target: "web",
    webUrl: "https://www.legendsofidleon.com/ytGl5oc/",
};
```

`webUrl` is required for web mode; errors if missing.

### Browser resolution

`resolveBrowserPath()` picks a Chromium-based browser:

1. Uses `injectorConfig.browserPath` if set.
2. Falls back to known locations for Chrome, Edge, Brave, or Opera.

If no executable found, throws "Could not find a compatible Chromium-based browser".

### Browser launch arguments

Spawns the browser with:

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

If `injectorConfig.browserUserDataDir` is empty, defaults to `idleon-web-profile` in the repo root.

### Target matching

`waitForIdleonTarget()` selects a CDP page target that matches `webUrl` exactly or shares the same host.

If the Idleon page never appears, throws `Timeout waiting for Idleon page`.

Web attach flow:

1. Launch the browser with CDP enabled.
2. Poll `/json/version` until the CDP WebSocket URL is available.
3. Find the Idleon page target and return its `webSocketDebuggerUrl`.

## Injection tuning

If a game update changes the bootstrap script, update these `injectorConfig` fields:

- `interceptPattern` (default `*N.js`).
- `injreg` (default `\w+\.ApplicationMain\s*?=`).

## Troubleshooting

- `No inspectable targets`: Steam not running or game launched without CDP.
- `Timeout waiting for debugger WebSocket URL`: target did not open CDP on port 32123.
- `Timeout waiting for Idleon page`: wrong `webUrl`, slow load, or browser profile lock.
- `Configured browserPath does not exist`: fix path or clear to auto-detect.
- `webUrl is required when target is 'web'`: add a valid Idleon URL.
