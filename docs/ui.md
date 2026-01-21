# UI Development

This document covers how the VanJS-based UI is structured, how it syncs to the backend, and how to extend it safely.

## Directory map

- `src/ui/entry/`: HTML entry point and CSS imports.
- `src/ui/components/`: UI building blocks and view containers.
- `src/ui/components/views/`: Cheats, Config, Account, DevTools tabs.
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

`src/ui/entry/style.css` is the CSS entry. Add new partials in `src/ui/styles/` and import them there.

`src/ui/components/App.js` initializes heartbeat monitoring, keyboard shortcuts, and mounts the tab content.

## State management

`src/ui/state/store.js` uses VanX reactivity (`vanX.reactive`) and exposes a simple service-style API.

State buckets:

- `store.app`: UI state (active tab, loading state, heartbeat, toast, view mode).
- `store.data`: data from the backend (cheats, config, account options, cheat states).

Persisted UI settings:

- Sidebar collapsed state and cheat view mode (tabs/list) are stored in `localStorage`.
- Favorites and recents are stored in `localStorage` via the Cheats view.

Core flows:

- `store.initHeartbeat()` opens the WebSocket and checks `/api/heartbeat`.
- `store.loadCheats()` requests `/api/cheats` and lazily fetches `/api/config` if it is not loaded.
- `store.loadConfig()` fetches `/api/config` for the Config tab.
- `store.loadAccountOptions()` fetches `/api/options-account` and `/config/optionsAccountSchema.json`.

Heartbeat details:

- WebSocket connection status is treated as the primary heartbeat signal.
- A 10s interval falls back to `/api/heartbeat` when WS is disconnected.
- Electron mode uses the same WebSocket + heartbeat flow as the browser UI.

## Services layer

API requests are centralized in `src/ui/services/api.js`:

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

The WebSocket client auto-reconnects every 10s in all runtimes.

## Core views

### Cheats view

`src/ui/components/views/Cheats.js` is the main cheat explorer.

Features:

- Favorites and recent commands are stored in `localStorage`.
- The quick-access section surfaces favorites and recents for one-click execution.
- Categories are ordered by `CATEGORY_ORDER` in `src/ui/state/constants.js`.
- `SearchBar` filters by command value or description.
- Supports list and tab layouts (stored in `store.app.cheatsViewMode`).
- Tabs view paginates with a "Load more" button (50 items per page).
- List view uses lazy `<details>` categories and auto-expands on search.
- Parameterized cheats render an inline input ("Val"); missing values block execution.
- Favorites support parameterized commands by storing the full action string.

Useful helpers:

- `store.executeCheat(action, message)` triggers `/api/toggle` and shows toast feedback.
- `store.navigateToCheatConfig(cheatValue)` jumps to Config with a focused path.
- `store.getActiveCheats()` flattens active cheat state into a display list (if used by UI components).

### Config view

`src/ui/components/views/Config.js` edits `startupCheats`, `cheatConfig`, and `injectorConfig`.

Key behaviors:

- Builds a local `draft` via `vanX.reactive` to avoid direct edits on the live config.
- Sub-tabs: Cheat Config, Startup Cheats, Injector Config.
- Supports category filtering and search on cheat config keys.
- Uses `ConfigNode` to recursively render object trees.
- Uses a forced-path mode when coming from the Cheats gear icon, with a "SHOWING" banner.
- Saves can apply to RAM (`/api/config/update`) or persist to disk (`/api/config/save`).
- Injector config shows a "restart required" warning banner.

Function values (like `(t) => t * 2`) are edited through `FunctionInput`:

- Parsing logic lives in `src/ui/utils/functionParser.js`.
- Recognizes multiply, divide, fixed, passthrough, min, max, and complex forms.
- Sliders are provided for multiply/divide values; raw editor is used for complex.

Save behavior:

- Session updates call `/api/config/update`.
- Persistent saves call `/api/config/save` and write `config.custom.js`.

### Account view

`src/ui/components/views/Account.js` exposes `OptionsListAccount` editing.

- Users must confirm a warning before data is loaded.
- Uses `src/ui/config/optionsAccountSchema.json` for labels, types, warnings, and AI flags.
- `Hide AI` filters out `schema.AI` entries for easier manual work.
- Rows render number inputs, boolean toggles, or raw JSON strings based on the value type.
- Each "SET" writes to memory via `/api/options-account/index` with optimistic UI updates.

### DevTools view

`src/ui/components/views/DevTools.js` embeds or launches Chrome DevTools:

- Calls `/api/devtools-url` and loads it in an iframe.
- When embedded in the in-game UI, it prompts for pop-out to avoid crashes.
- Embedded mode can open the Web UI or DevTools in an external window via `/api/open-url`.

## Components and patterns

Common components live in `src/ui/components/`:

- `Sidebar`: tab navigation and quick actions.
- `SearchBar`: shared filter input used by Cheats and Account.
- `ConfigNode`: recursive config renderer with tooltips.
- `Toast` + `Tooltip`: global UI helpers.

Typical component pattern:

```js
const { div, button } = van.tags;

export const MyWidget = () => {
    const count = van.state(0);

    return div(
        button({ onclick: () => count.val++ }, "Increment"),
        () => `Count: ${count.val}`
    );
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

`IS_ELECTRON` in `src/ui/state/constants.js` is used for Electron-specific UI behavior (like external link handling). WebSocket updates are available in Electron and browser modes.

`window.parent !== window` is used to detect embedded mode for the DevTools view, which forces a pop-out workflow.
