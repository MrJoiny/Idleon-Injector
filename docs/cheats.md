# Cheat Development

For contributors adding cheats. Registration and helper APIs are documented as
JSDoc next to their implementations - read those files; this guide covers
workflow and domain rules only.

## Workflow

1. Edit modules under `src/cheats/`.
2. Rebuild: `npm run build:cheats` (or keep `npm run watch:cheats` running).
3. Restart the app - no hot reload for the injected context.

## Adding a command

1. Create a module in `src/cheats/cheats/`.
2. Register with `registerCheat` (single command) or `registerCheats`
   (namespaces, subcheats, toggles, configurable values). Full field reference:
   JSDoc in `src/cheats/core/registration.js`.
3. Import the module in `src/cheats/cheats/register.js` so the bundler includes
   it.

Minimal shape:

```js
import { registerCheat } from "../core/registration.js";

registerCheat({
    name: "mycheat",
    message: "what it does",
    fn: () => "done",
});
```

Registered commands appear in both the CLI and Web UI automatically; `category`
controls UI grouping. Configurable cheats read their defaults from matching
`cheatConfig` paths - see [Configuration](config.md).

## Hooking game logic (proxies)

Prefer the helpers in `src/cheats/utils/proxy.js` over hand-written wrappers;
that file's JSDoc documents signatures and parameters:

- `createMethodProxy`: wrap a method; original runs first (base-first), handler
  may replace the result.
- `createProxy`: intercept a property get/set (defs, cList entries).
- `createConfigLookupProxy`: map method args to `cheatConfig` overrides.
- `nullifyListCost`: zero out cost entries in nested lists while enabled.

Base-first is mandatory: original game logic must run for its side effects before
any override returns.

```js
import { events } from "../core/globals.js";
import { cheatState } from "../core/state.js";
import { createMethodProxy } from "../utils/proxy.js";

const ActorEvents12 = events(12);

createMethodProxy(ActorEvents12, "_customBlock_PlayerReach", (base) => {
    if (cheatState.godlike.reach) return 666;
    return base;
});
```

## Domain rules

- Import game references from `src/cheats/core/globals.js` (`gga`, `cList`,
  `itemDefs`, ...) instead of walking window properties directly. They are
  populated once `gameReady()` completes and are guaranteed afterwards.
- Haxe wraps fields under `.h`; use `traverse(obj, depth, worker)` to unwrap
  automatically (see `src/cheats/utils/traverse.js`).
- Proxy setups must be idempotent (`_isPatched` guard pattern). Character
  selection recreates game data objects, so setup re-runs on play to restore
  lost proxies: the guard skips objects still in memory and re-applies to
  replaced ones.
