# UI Development

How the VanJS-based UI is structured, syncs to the backend, and how to extend it.

## Directory map

- `src/ui/entry/`: HTML entry point and CSS imports.
- `src/ui/components/`: UI building blocks and view containers.
- `src/ui/components/views/`: Cheats, Config, Account, Search, Monitor, DevTools tabs.
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

`src/ui/components/App.js` initializes heartbeat monitoring, keyboard shortcuts, and mounts the tab content.

## State management

`src/ui/state/store.js` uses VanX reactivity (`vanX.reactive`) and exposes a simple service-style API.

State buckets:

- `store.app`: UI state (active tab, loading state, heartbeat, toast, view mode).
- `store.data`: data from the backend (cheats, config, account options, cheat states, monitor values).

Notable `store.app` UI flags include `configForcedPath` (focused config path from cheat gear icon) and `configDrawerOpen` (side drawer state while on Cheats).

Persisted UI settings:

- Sidebar collapsed state and cheat view mode (tabs/list) are stored in `localStorage`.
- Favorites and recents are stored in `localStorage` via the Cheats view.
- Config drawer open/closed state is session-only (not persisted).

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

`src/ui/components/views/Cheats.js` is the main cheat explorer.

Features:

- Favorites and recents stored in `localStorage`.
- Quick-access section surfaces favorites and recents for one-click execution.
- Categories ordered by `CATEGORY_ORDER` in `src/ui/state/constants.js`.
- `SearchBar` filters by command value or description.
- Supports list and tab layouts (stored in `store.app.cheatsViewMode`).
- Tabs view paginates with "Load more" (50 items per page).
- List view uses lazy `<details>` categories, auto-expands on search.
- Parameterized cheats render inline input ("Val"); missing values block execution.
- Favorites support parameterized commands by storing full action string.
- Includes a Config drawer toggle so Cheat commands stay visible while editing Config side-by-side.

Useful helpers:

- `store.executeCheat(action, message)` triggers `/api/toggle` and shows toast feedback.
- `store.navigateToCheatConfig(cheatValue)` focuses Config for that cheat path (opens the side drawer when on Cheats, otherwise switches to full Config tab).
- `store.getActiveCheats()` flattens active cheat state into a display list.

### Config view

`src/ui/components/views/Config.js` edits `startupCheats`, `cheatConfig`, and `injectorConfig`.

Key behaviors:

- Builds a local `draft` via `vanX.reactive` to avoid direct edits on live config.
- Sub-tabs: Cheat Config, Startup Cheats, Injector Config.
- Startup Cheats auto-show a separate `Value` input when a selected command has `needsParam`.
- Supports category filtering and search on cheat config keys.
- Uses `ConfigNode` to recursively render object trees.
- Uses forced-path mode when coming from Cheats gear icon, with "SHOWING" banner.
- Can run as a right-side drawer while Cheats stays open; close from drawer header or toggle button in Cheats.
- Saves apply to RAM (`/api/config/update`) or persist to disk (`/api/config/save`).
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
- **Favorites**: Quick-select common data categories.
- **Value Matching**:
    - Supports strings (case-insensitive contains).
    - Supports numbers (exact or rounding tolerance for floats).
    - Supports ranges (e.g., `100-200`).
    - Supports `true`, `false`, `null`, `undefined`.
- **Path Copying**: Clicking a result copies the full Haxe access path to clipboard.
- **Send to Monitor**: The eye icon subscribes the path in the Monitor view.
- **Performance**: "Load more" pattern handles large result sets without freezing.

### Monitor view

`src/ui/components/views/Monitor.js` tracks values over WebSocket and displays history.

Features:

- Add watchers by entering a path (e.g., `gga.GemsOwned`) or sending a Search result.
- Shows current value and last 10 updates per watch.
- Remove watchers with Unwatch action.

### DevTools view

`src/ui/components/views/DevTools.js` embeds or launches Chrome DevTools:

- Calls `/api/devtools-url` and loads it in an iframe.
- When embedded in the in-game UI, prompts for pop-out to avoid crashes.
- Embedded mode can open Web UI or DevTools in external window via `/api/open-url`.

## Components and patterns

Common components in `src/ui/components/`:

- `Sidebar`: tab navigation and quick actions.
- `SearchBar`: shared filter input used by Cheats and Account.
- `ConfigNode`: recursive config renderer with tooltips.
- `Toast` + `Tooltip`: global UI helpers.

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
