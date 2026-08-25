# Platforms and Injection Modes

Two targets, selected with `injectorConfig.target` in `config.custom.js`:
`steam` (Windows/Linux) and `web` (any desktop OS; the only option on macOS).

## Constants

- CDP port: fixed `32123`.
- Dashboard port: `injectorConfig.webPort`, default `8080`.

## Steam target

- Windows: launches the installed game exe with
  `--remote-debugging-port=32123`; falls back to the Steam protocol URL if
  direct launch fails or times out.
- Linux: launches through Steam (`steam -applaunch <appid>
  --remote-debugging-port=32123`). If auto-launch fails, wait for a manual game
  start while polling the endpoint. Timeout: `injectorConfig.onLinuxTimeout`.
- macOS: unsupported - use `web`.

## Web target

Requires `injectorConfig.webUrl`.

- Browser resolution: `injectorConfig.browserPath` if set, otherwise known
  Chrome/Edge/Brave/Opera install locations. Error if none found.
- Profile: `injectorConfig.browserUserDataDir` if set, otherwise a default
  profile directory under the runtime directory.
- Linux spawns the browser with `--disable-gpu` for stability.

## Injection tuning

When a game update changes the bootstrap script, adjust in `config.custom.js`:

- `interceptPattern`: which script gets intercepted (default `*N.js`).
- `injreg`: regex capturing the game-root variable assignment (default
  `\w+\.ApplicationMain\s*?=`).

## Attach errors

| Message (substring) | Meaning | Fix |
| --- | --- | --- |
| `No inspectable targets` | Steam not running, or game already open without CDP | Start Steam first; close the running game |
| `Timeout waiting for debugger WebSocket URL` | Target never opened CDP on 32123 | Relaunch via the injector |
| `Timeout waiting for Idleon page` | Wrong/slow `webUrl`, or profile locked by another window | Verify URL; close other windows using the profile |
| `Could not find a compatible Chromium-based browser` | Auto-detection failed | Set `browserPath` |
| `webUrl is required when target is 'web'` | Missing URL | Add `webUrl` to `injectorConfig` |
