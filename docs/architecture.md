# Architecture Map

Orientation only: where things live and how the pieces connect. The code explains
how it works; this page only says where to look. Domain terms are defined in the
[Glossary](glossary.md); design rationale and accepted trade-offs live in
[Decisions](decisions.md).

These docs deliberately do not restate code behavior. There is no test suite that
could catch such docs drifting, so anything the source already says clearly is not
duplicated here. If you find prose explaining mechanics, it is stale by definition:
trust the code.

## Three runtimes

1. **Backend** (`src/modules/`, entry `src/main.js`): Node.js process. Attaches to
   the game over CDP, injects `cheats.js`, serves the dashboard (REST +
   WebSocket), and runs the CLI.
2. **Cheat bundle** (`src/cheats/`, built to `cheats.js`): ES modules evaluated
   inside the game page. Registers commands, proxies game logic, exposes runtime
   globals.
3. **Web UI** (`src/ui/`): VanJS dashboard served as static assets by the backend.
   Talks REST + WebSocket only; no direct game access.

Flow: UI / CLI -> backend -> CDP -> game page. Cheat-state changes broadcast back
over WebSocket.

## Where things live

Backend:

| Path | Role |
| --- | --- |
| `src/main.js` | Startup orchestration |
| `src/modules/game/` | CDP attach and injection pipeline |
| `src/modules/server/apiRoutes.js` | All REST endpoints |
| `src/modules/server/wsServer.js` | Cheat-state push, monitor sync |
| `src/modules/config/configManager.js` | Config load, merge, validation |
| `src/modules/cli/cliInterface.js` | Interactive CLI prompt |

Cheat bundle:

| Path | Role |
| --- | --- |
| `src/cheats/core/state.js` | Live `cheatState` / `cheatConfig` objects |
| `src/cheats/core/globals.js` | Game references populated by `gameReady()` |
| `src/cheats/core/registration.js` | Command registry and dispatcher; JSDoc documents every registration field |
| `src/cheats/cheats/` | Command cheats; `register.js` is the import manifest |
| `src/cheats/proxies/` | Game-logic hooks; `setup.js` wires them |
| `src/cheats/utils/proxy.js`, `utils/traverse.js` | Proxy and traversal helpers; JSDoc'd in place |

Web UI:

| Path | Role |
| --- | --- |
| `src/ui/entry/` | HTML entry point, CSS imports |
| `src/ui/components/views/` | One file per tab; `account/` holds the world tabs |
| `src/ui/services/api.js`, `services/ws.js` | Backend clients |
| `src/ui/state/store.js` | Reactive store |

## Boundaries

- Backend <-> UI contract is the code itself: endpoints in `apiRoutes.js`,
  messages in `wsServer.js` + `ws.js`. There is intentionally no separate API
  spec; a written copy would drift silently.
- Backend <-> game contract is `window.__idleon_cheats__`, created during
  injection (`src/modules/game/`).
