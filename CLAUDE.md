# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                  # Install dependencies
npm run build:cheats         # Bundle src/cheats/ -> cheats.js (required before start)
npm run watch:cheats         # Rebuild cheats bundle on every save (keep open in one terminal)
npm run start                # Run from source (requires cheats.js to already exist)
npm run validate             # build:cheats + syntax check + eslint + schema validation
npx eslint src/cheats/       # Lint cheats only
npm run build                # Package Windows .exe
npm run build-unix           # Package Linux binary
npm run build-macos-x64      # Package macOS Intel binary
npm run build-macos-arm64    # Package macOS Apple Silicon binary
```

**Development loop**: run `npm run watch:cheats` in one terminal, `npm run start` in another. There is no hot reload — restart after any cheat change.

## Architecture

The project is a Node.js CDP (Chrome DevTools Protocol) injector for the Legends of Idleon browser game. It has two major halves:

### Backend (`src/`)

**`src/main.js`** is the orchestration entry. Startup order:
1. Load config (`configManager.js`)
2. Create HTTP server (`webServer.js`)
3. Attach to game via CDP (`gameAttachment.js`)
4. Inject `cheats.js` via request interception (`cheatInjection.js`)
5. On page load, run `setup.call(context)` in game, start API + WebSocket + CLI

**`src/modules/game/`**: CDP attachment (Steam or web) and injection pipeline. The injector intercepts `*N.js` (game bundle), prepends runtime config, evaluates the cheat bundle in the page, then patches in `window.__idleon_cheats__`.

**`src/modules/server/`**: `webServer.js` + `tinyRouter.js` serve the UI and REST API; `wsServer.js` pushes cheat-state and monitor updates via WebSocket. All API routes live in `apiRoutes.js`.

**`src/modules/config/configManager.js`**: Loads `config.js` (defaults) then deep-merges `config.custom.js` (user overrides, gitignored). `startupCheats` arrays are unioned; `cheatConfig` and `injectorConfig` are deep-merged. `defaultConfig` holds a pristine clone of `config.js` for UI diffs.

**Config files** (`config.js` / `config.custom.js`) are loaded from the runtime base directory — the executable's directory in packaged builds, `process.cwd()` in source runs.

### Cheat bundle (`src/cheats/`)

This entire directory is bundled by Rollup into `cheats.js` (IIFE format, `cheats.js` is gitignored). Entry: `src/cheats/main.js`.

- **`src/cheats/core/`**: `setup.js` waits for `gameReady`, installs proxies, runs `startupCheats`. `registration.js` holds the cheat registry. `globals.js` exposes typed accessors (`gga`, `cList`, `itemDefs`, etc.) once game is ready.
- **`src/cheats/cheats/`**: Command implementations registered via `registerCheat` / `registerCheats`. All modules must be imported in `register.js`.
- **`src/cheats/proxies/`**: Intercept game methods per tick. All proxy setup functions are wired in `proxies/setup.js`.
- **`src/cheats/utils/proxy.js`**: Helpers — `createMethodProxy` (base-first method wrap), `createProxy` (property getter override), `createConfigLookupProxy` (key-based config lookup), `nullifyListCost` (zero list costs).
- **`src/cheats/utils/traverse.js`**: `traverse(obj, depth, worker)` walks Haxe `.h` objects; used to apply proxies across large lists like `cList`.

**Adding a cheat**: create a module in `src/cheats/cheats/`, call `registerCheat` / `registerCheats`, import it in `register.js`, rebuild.

**Patch guards**: use `_isPatched` sentinel on objects to prevent double-wrapping. `setupFirebaseProxy()` re-runs certain setup functions on character select because the game replaces underlying objects.

### Web UI (`src/ui/`)

VanJS + VanX SPA, no build step. Served from `src/ui/entry/index.html` at `http://localhost:8080`.

- **`src/ui/state/store.js`**: Central reactive state (`vanX.reactive`). `store.app` = UI state; `store.data` = backend data.
- **`src/ui/services/api.js`** / **`ws.js`**: All fetch calls and WebSocket subscription in one place.
- **`src/ui/components/views/`**: Tab views — Cheats, Config, Account, Search, Monitor, DevTools.
- **`src/ui/state/constants.js`**: `VIEWS`, `VIEW_ORDER`, `CATEGORY_ORDER`, `IS_ELECTRON`.

**Adding a view**: create in `views/`, add to `VIEWS`/`VIEW_ORDER` in `constants.js`, register in `App.js` `viewFactories`, add API calls to `api.js`/`store.js`, add CSS partial in `styles/` and import in `entry/style.css`.

**Config editing**: `Config.js` builds a local `draft` via `vanX.reactive`. Session saves → `POST /api/config/update`; disk saves → `POST /api/config/save` (writes only diffs from `defaultConfig`). Function values (`(t) => t * 2`) are parsed/serialized by `src/ui/utils/functionParser.js`.

## Key conventions

- `cheats.js` is gitignored — always run `npm run build:cheats` first.
- New cheat config fields go in `config.js` (default) + `src/ui/config/configDescriptions.js` (tooltip).
- New `pkg` assets (files the packaged binary needs) must be under `src/ui/` or listed in `pkg.assets` in `package.json`.
- When adding API routes, wrap calls in `try/catch` and return `res.status(500).json({ error: error.message })`.
- The CDP port is fixed at `32123`; the web UI port defaults to `8080` (`injectorConfig.webPort`).
- `injreg` (`\\w+\\.ApplicationMain\\s*?=`) is the injection regex that may need updating after game patches.
