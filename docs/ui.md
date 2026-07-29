# UI Development

How the VanJS-based UI is structured, syncs to the backend, and how to extend it.

## Directory map

- `src/ui/entry/`: HTML entry point and CSS imports.
- `src/ui/components/`: UI building blocks and view containers.
- `src/ui/components/views/`: Cheats, Config, Account, Search, and DevTools workspaces.
- `src/ui/services/`: API and WebSocket clients.
- `src/ui/state/`: Reactive store and constants.
- `src/ui/styles/`: CSS partials (imported by `entry/style.css`).
- `src/ui/config/`: Config descriptions and account schema.
- `src/ui/assets/`: Icon set and UI assets.
- `src/ui/vendor/`: `van` and `van-x` bundles.

## Entry point

`src/ui/entry/index.html` mounts the app:

```js
import van from "/vendor/van-1.6.0.js";
import { App } from "/components/App.js";

van.add(document.body, App());
```

`src/ui/entry/style.css` is the CSS entry. Add new partials in `src/ui/styles/` and import there.

`src/ui/components/App.js` initializes heartbeat monitoring and keyboard shortcuts, mounts workspace content, and keeps global Toast, Activity, and update surfaces available.

## State management

`src/ui/state/store.js` uses VanX reactivity (`vanX.reactive`) and exposes a simple service-style API.

State buckets:

- `store.app`: UI state (active workspace, loading state, heartbeat, toast, drawers, and update state).
- `store.data`: data from the backend (cheats, config, account options, cheat states, monitor values).

Notable `store.app` UI flags include `configForcedPath` (focused config path from cheat gear icon) and `configDrawerOpen` (side drawer state while on Cheats).

Persisted UI settings:

- Sidebar collapsed state is stored in `localStorage`.
- Cheat favorites, recent commands, Search key favorites, selected Search keys, and saved Search results are stored in `localStorage`.
- Config, Activity, Search key, and Search inspector drawers are session-only.

Core flows:

- `store.initHeartbeat()` opens the WebSocket and checks `/api/heartbeat`.
- `store.loadCheats()` requests `/api/cheats` and lazily fetches `/api/config` if not loaded.
- `store.loadConfig()` fetches `/api/config` for the Config tab.
- `store.loadAccountOptions()` fetches `/api/options-account` and `/config/optionsAccountSchema.json`.

Heartbeat details:

- WebSocket connection status is the primary heartbeat signal.
- 10s interval falls back to `/api/heartbeat` when WS is disconnected.
- Electron mode uses the same WebSocket + heartbeat flow as browser UI.

## Services layer

API requests centralized in `src/ui/services/api.js`:

- `fetchCheatsData()` -> `GET /api/cheats`
- `executeCheatAction()` -> `POST /api/toggle`
- `fetchConfig()` -> `GET /api/config`
- `saveConfigFile()` -> `POST /api/config/save`
- `updateSessionConfig()` -> `POST /api/config/update`
- `fetchOptionsAccount()` -> `GET /api/options-account`
- `updateOptionAccountIndex()` -> `POST /api/options-account/index`
- `fetchDevToolsUrl()` -> `GET /api/devtools-url`
- `fetchCheatStates()` -> `GET /api/cheat-states`
- `openExternalUrl()` -> `POST /api/open-url`

WebSocket updates live in `src/ui/services/ws.js` and push cheat-state changes into `store.data.activeCheatStates`.
Monitor subscriptions use the same socket, pushing `monitor-state` updates into `store.data.monitorValues`.

WebSocket client auto-reconnects every 10s in all runtimes.

## Core views

### Cheats view

`src/ui/components/views/AtlasCheats.js` is the main cheat explorer.

Features:

- Scope navigation covers all, active, favorite, recent, and category-filtered commands.
- The command table filters by command, description, or category and paginates at 50 rows.
- Row selection is available by pointer, Enter/Space, and table Arrow/J/K navigation.
- Execution remains separate from selection; stateful commands use switches and one-shot commands use Run.
- Parameterized commands collect their value in the inspector and block execution until it is supplied.
- Favorites and recents preserve complete parameterized command strings in `localStorage`.
- The inspector exposes command details and linked config without hiding the command table.
- Linked config can also open the shared Config drawer beside the Cheats workspace.

Useful helpers:

- `API.executeCheatAction(action)` triggers `/api/toggle`; Atlas records the result through `store.notify()`.
- `store.navigateToCheatConfig(cheatValue)` focuses Config for that cheat path (opens the side drawer when on Cheats, otherwise switches to full Config tab).
- `store.data.activeCheatStates` receives WebSocket state updates that Atlas flattens for its switches and Active scope.

### Config view

`src/ui/components/views/Config.js` edits `startupCheats`, `cheatConfig`, and `injectorConfig` through the shared draft in `views/config/configDraft.js`.

Key behaviors:

- Uses one reactive draft and separate RAM/disk baselines to avoid direct edits on live config.
- Sub-tabs: Cheat Config, Startup Cheats, Injector Config.
- Startup Cheats auto-show a separate `Value` input when a selected command has `needsParam`.
- Supports category filtering and search on cheat config keys.
- Uses `ConfigNode` to recursively render object trees.
- Uses forced-path mode when coming from Cheats gear icon, with "SHOWING" banner.
- Can run as a right-side drawer while Cheats stays open; close from drawer header or toggle button in Cheats.
- Saves explicitly apply the cheat config to RAM (`/api/config/update`) or persist the full draft to disk (`/api/config/save`).
- `Ctrl+S` saves the shared config draft from the Cheats or Config workspace.
- Injector config shows "restart required" warning banner.

Function values (like `(t) => t * 2`) are edited through `FunctionInput`:

- Parsing logic lives in `src/ui/utils/functionParser.js`.
- Recognizes multiply, divide, fixed, passthrough, min, max, and complex forms.
- Sliders provided for multiply/divide values; raw editor for complex.

Save behavior:

- Session updates call `/api/config/update`.
- Persistent saves call `/api/config/save` and write `config.custom.js`.

### Account view

`src/ui/components/views/Account.js` exposes `OptionsListAccount` editing.

- Users must confirm a warning before data loads.
- Uses `src/ui/config/optionsAccountSchema.json` for labels, types, warnings, and AI flags.
- `Hide AI` filters out `schema.AI` entries for easier manual editing.
- Rows render number inputs, boolean toggles, or raw JSON based on value type.
- Each "SET" writes to memory via `/api/options-account/index` with optimistic updates.

### Search view

`src/ui/components/views/Search.js` provides a tool for finding values in the game's internal data (`gga`).

Features:

- **Key Whitelist**: Select top-level game attribute categories to search (e.g., `PlayerDATABASE`, `SkillLevels`).
- **Favorites**: Curated defaults and user-edited key favorites persist independently; an intentionally empty list stays empty.
- **Value Matching**:
    - Supports strings (case-insensitive contains).
    - Supports numbers (exact or rounding tolerance for floats).
    - Supports ranges (e.g., `100-200`).
    - Supports `true`, `false`, `null`, `undefined`.
- **Result inspector**: Selecting a result exposes its path, value editor, and monitor state.
- **Path Copying**: Copy actions produce the full Haxe access path and immediate toast feedback.
- **Saved monitors**: Saved results can subscribe or pause their live monitor in the Search inspector.
- **Performance**: "Load more" pattern handles large result sets without freezing.

### Activity drawer

`src/ui/components/ActivityDrawer.js` keeps notifications and active value monitors available from every workspace.

Features:

- Activity lists the same success and error events shown immediately by Toast.
- Monitors show current values and recent updates received over WebSocket.
- Monitor subscriptions are owned by saved Search results and can be paused or removed there.

### DevTools view

`src/ui/components/views/DevTools.js` embeds or launches Chrome DevTools:

- Calls `/api/devtools-url` and loads it in an iframe.
- When embedded in the in-game UI, prompts for pop-out to avoid crashes.
- Embedded mode can open Web UI or DevTools in external window via `/api/open-url`.

## Components and patterns

Common components in `src/ui/components/`:

- `AtlasHeader` + `Sidebar`: global status, workspace navigation, and workspace-specific context.
- `WorkspaceContext`: contextual navigation supplied by the active workspace.
- `ActivityDrawer`: notification history and live monitor output.
- `SearchBar`: shared filter input used by Cheats and Account.
- `ConfigNode`: recursive config renderer with tooltips.
- `Toast` + `Tooltip`: global immediate feedback helpers.

Typical component pattern:

```js
const { div, button } = van.tags;

export const MyWidget = () => {
    const count = van.state(0);

    return div(button({ onclick: () => count.val++ }, "Increment"), () => `Count: ${count.val}`);
};
```

## Adding a new view

1. Create a view component in `src/ui/components/views/`.
2. Add its metadata to `src/ui/state/constants.js` in `VIEWS` and `VIEW_ORDER`.
3. Register it in `src/ui/components/App.js` under `viewFactories`.
4. Add any API calls to `src/ui/services/api.js` and expose them via `store.js`.
5. Add CSS in `src/ui/styles/_yourfile.css` and import it in `entry/style.css`.

Example registration in `App.js`:

```js
const viewFactories = {
    [VIEWS.CHEATS.id]: Cheats,
    [VIEWS.CONFIG.id]: Config,
    [VIEWS.MYVIEW.id]: MyView,
};
```

## Embedded vs desktop behavior

`IS_ELECTRON` in `src/ui/state/constants.js` handles Electron-specific UI behavior (like external link handling). WebSocket updates available in Electron and browser modes.

`window.parent !== window` detects embedded mode for DevTools view, forcing pop-out workflow.
