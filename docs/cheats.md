# Cheat Development Guide

This doc is for contributors adding new cheats to Idleon Injector. It assumes you are comfortable working in the browser runtime and reading the game's scripts.

## Cheat system overview

- Cheats are ES modules in `src/cheats/` bundled into `cheats.js` via `npm run build:cheats`.
- Runtime entry is `src/cheats/main.js`; see "Runtime globals" for the full list of exposed helpers and getters.
- `src/cheats/core/setup.js` waits for `gameReady` before installing proxies and running `startupCheats`.

## Where code goes

- `src/cheats/cheats/`: command cheats (toggles + parameterized commands).
- `src/cheats/proxies/`: hooks into game logic.
- `src/cheats/helpers/` and `src/cheats/utils/`: shared helpers.
- `src/cheats/core/`: state, registration, globals.

## Adding a command cheat

1. Create a new module in `src/cheats/cheats/`.
2. Register it with `registerCheat` or `registerCheats`.
3. Import it in `src/cheats/cheats/register.js` so rollup includes it.
4. Rebuild with `npm run build:cheats` (or `npm run watch:cheats`).
5. Restart the app.

### Registration API

#### registerCheat structure

From `src/cheats/cheats/utility.js`:

```js
import { registerCheat } from "../core/registration.js";

registerCheat({
    name: "gga",
    message: "The attribute you want to get, separated by spaces",
    needsParam: true,
    fn: (params) => gg_func(params, 0),
});
```

Fields:

- `name`: command string (`"gga"`, `"buy"`, `"list monster"`, etc).
- `message`: help text for UI/CLI.
- `fn`: command handler. It runs with `this` bound to the game context.
- `category`: optional category override (defaults to `"general"`).
- `needsParam`: whether the CLI expects parameters.

#### registerCheats structure

From `src/cheats/cheats/wide.js`:

```js
import { registerCheats } from "../core/registration.js";
import { firebase } from "../core/globals.js";

registerCheats({
    name: "wide",
    message: "all account-wide cheats",
    allowToggleChildren: true,
    subcheats: [
        { name: "gembuylimit", message: "set max gem item purchases", configurable: true },
        { name: "mtx", message: "gem shop cost nullification" },
        {
            name: "guildpoints",
            message: "Adds 1200 guild points to the guild.",
            fn: function () {
                firebase.guildPointAdjust(1200);
                return "Added 1200 guild points to the guild.";
            },
        },
    ],
});
```

Fields:

- `name`: command namespace (`"wide"`).
- `message`: help text.
- `category`: optional category override (inherits for subcheats if not set).
- `fn`: custom handler (overrides default toggle). When provided, you control `cheatState` updates manually.
- `subcheats`: array of subcheat definitions (same shape as a `registerCheats` node).
- `configurable`: allows numeric/boolean value input; writes to `cheatConfig` at the same path.
- `allowToggleChildren`: toggles all subcheats when called without args.
- `needsParam`: optional override for parameter expectation.

### Parameterized command example

From `src/cheats/cheats/wide.js`:

```js
registerCheat({
    name: "buy",
    message: "Buy gem shop packs. You get items from the pack, but no gems and no pets.",
    needsParam: true,
    fn: function (params) {
        const code = params[0];
        if (!code) {
            return "No code was given, provide a code";
        }

        firebase.addToMessageQueue("SERVER_CODE", "SERVER_ITEM_BUNDLE", code);
        return `${code} has been sent!`;
    },
});
```

### Configurable cheats

From `src/cheats/cheats/wide.js`:

```js
registerCheats({
    name: "wide",
    message: "all account-wide cheats",
    allowToggleChildren: true,
    subcheats: [{ name: "gembuylimit", message: "set max gem item purchases", configurable: true }],
});
```

`config.js` provides the defaults that map to the same path:

```js
exports.cheatConfig = {
    wide: {
        gembuylimit: 0,
    },
};
```

### UI categories

`category` controls grouping in the UI. If not specified, top-level cheat names become the category when using `registerCheats` with subcheats.

## Game globals and context

- `src/cheats/core/globals.js` exposes `gga`, `itemDefs`, `monsterDefs`, `cList`, `customMaps`, `dialogueDefs`, and
  others once `gameReady` completes.
- Import the globals from `core/globals.js` instead of walking window properties directly.

```js
import { gga, cList } from "../core/globals.js";
```

### Runtime globals

`src/cheats/main.js` exposes these globals in the game context:

- `window.cheat(action)`: main dispatcher (runs setup if needed).
- `window.setup()`: runs cheat setup explicitly.
- `window.updateCheatConfig()`: updates config at runtime.
- `window.getAutoCompleteSuggestions()`: UI suggestions API.
- `window.getOptionsListAccount()` / `window.setOptionsListAccountIndex()`: account options list helpers.
- `window.cheatStateList`: snapshot for UI/state lists.
- `window.cheats` / `window.cheatState`: command registry and live state.
- `window.bEngine`, `window.itemDefs`, `window.monsterDefs`, `window.cList`, `window.behavior`, `window.events`: game
  getters defined with `Object.defineProperty`.

## Proxy patterns (advanced)

Use a proxy when you need to intercept game logic consistently (per tick or per call). All proxies are wired into `src/cheats/proxies/setup.js`, which imports per-module setup functions (names vary, e.g. `setupEvents012Proxies`, `setupFirebaseProxy`). Prefer the helpers in `src/cheats/utils/proxy.js` (`createMethodProxy`, `createProxy`, `createConfigLookupProxy`, `nullifyListCost`) to keep the patterns consistent.

### Base-first helper pattern (recommended)

Use `createMethodProxy` to standardize base-first behavior.

```js
import { cheatState } from "../core/state.js";
import { createMethodProxy } from "../utils/proxy.js";

createMethodProxy(ActorEvents12, "_customBlock_PlayerReach", (base) => {
    if (cheatState.godlike.reach) return 666;
    return base;
});
```

Parameters:

- `target`: object that owns the method.
- `methodName`: (games) method name to wrap.
- `handler`: `(baseResult, ...args) => newResult`, called after the original method runs (base-first).

Best used for: intercepting game methods that must run for side effects, while selectively overriding their return values.

### Property proxy helper

Use `createProxy` for data objects or list entries that should return a modified value while a cheat is enabled.

```js
import { cheatState } from "../core/state.js";
import { cList } from "../core/globals.js";
import { createProxy } from "../utils/proxy.js";

createProxy(cList, "AlchemyVialItemsPCT", (original) => {
    if (cheatState.w2.vialrng) return new Array(original.length).fill(99);
    return original;
});
```

Parameters:

- `targetObj`: object that owns the property you want to proxy.
- `index`: property name or array index to intercept.
- `callback`: either a simple getter (`(original) => newValue`) or `{ get, set }` handlers for more control.

Best used for: static data lookups (defs, cList entries) where you want conditional values without changing the original object structure.

### Config lookup helper

Use `createConfigLookupProxy` when a method should look up overrides from `cheatConfig` based on keys or args.

```js
import { events } from "../core/globals.js";
import { createConfigLookupProxy } from "../utils/proxy.js";

const ActorEvents189 = events(189);
createConfigLookupProxy(ActorEvents189, "_customBlock_CauldronStats", [{ state: "w2.alchemy" }]);
```

Parameters:

- `target`: object that owns the method.
- `methodName`: method name to wrap.
- `mappings`: array of configs describing how to read `cheatState` and `cheatConfig`.

Mapping fields:

- `state`: dot-path in `cheatState` that enables the override.
- `config`: optional dot-path in `cheatConfig` (defaults to `state`).
- `fixedKey`: optional key to match against `args[0]` before applying.
- `value`: optional constant to return when `fixedKey` matches.

Best used for: method hooks that need to map key-based lookups to `cheatConfig` functions without repeating large if / else blocks.

### List cost helper

Use `nullifyListCost` to zero out nested list values when a cheat is enabled.

```js
import { cList } from "../core/globals.js";
import { nullifyListCost } from "../utils/proxy.js";

nullifyListCost(cList.MTXinfo, 3, [3, 7], "wide.mtx", 0);
```

Parameters:

- `list`: root list to traverse.
- `depth`: how deep to traverse before applying proxies.
- `indices`: index or array of indices to replace at the target level.
- `statePath`: dot-path in `cheatState` that enables the override.
- `zeroValue`: optional replacement value (defaults to "0").

Best used for: list-style costs and requirements (MTX, prayers, tasks) that should flip to a constant when enabled.

### Patch guards with \_isPatched

From `src/cheats/proxies/items.js`:

```js
export function setupItemProxies() {
    if (itemDefs._isPatched) return;
    Object.defineProperty(itemDefs, "_isPatched", { value: true, enumerable: false });

    for (const item of Object.values(itemDefs)) {
        if (!item.h) continue;
        // ... apply createProxy helpers per item
    }
}
```

The `_isPatched` flag prevents double-wrapping if setup is called more than once. This matters because the character selection flow recreates game data objects (lists, item defs, etc.), so `setupFirebaseProxy()` re-runs select setup functions on play button to restore lost proxies. The guard makes those setups idempotent: it skips re-wrapping when
the same object is still in memory, but allows re-application when the game has replaced the underlying object. In practice the re-run setup functions are `setupCListProxy`, `setupGameAttributeProxies`, and `setupItemProxies`.

## Build and verify

- `npm run build:cheats` or `npm run watch:cheats`
- `npm run start`
- Restart the app after changes (no hot reload)
