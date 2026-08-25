# Glossary

Domain language used across the codebase, UI, and docs, ordered roughly from
game-side to tool-side.

## Game (Idleon / Stencyl / Haxe)

The game client is a Stencyl export: Haxe compiled to JavaScript. Class and method
names are machine-generated, which is why code references names like
`ActorEvents12`.

- **Stencyl engine**: underlying game engine (`com.stencyl.Engine` on the page),
  exposed to cheats as `bEngine`.
- **Haxe `.h` wrapper**: Haxe wraps instance fields under an `.h` object
  (e.g., `itemDefs.Froggy.h.ID`). Raw objects look empty without unwrapping;
  `traverse()` in `src/cheats/utils/traverse.js` does it automatically.
- **gga**: the game attributes map (`bEngine.gameAttributes.h`). Root of nearly
  all account/player state; paths like `gga.GemsOwned` are used by Search,
  Monitor, and account writes.
- **cList**: `gga.CustomLists.h`. Static content tables (shop items, MTX costs,
  vials, prayers, ...).
- **itemDefs / monsterDefs**: `gga.ItemDefinitionsGET.h` /
  `gga.MonsterDefinitionsGET.h`.
- **ActorEvents\<N\>**: generated script classes per Stencyl actor
  (`scripts.ActorEvents_<N>`); fetched via `events(N)` from
  `src/cheats/core/globals.js`.
- **_customBlock_***: custom logic blocks authored in the Stencyl editor, exported
  as methods on ActorEvents classes. Primary hook points for proxies.
- **behavior**: `com.stencyl.behavior.Script`, base class of actor behavior
  scripts.
- **firebase**: `window.FirebaseStorage`, the game's server-message interface
  (item bundles, guild points, ...).
- **OptionsListAccount**: game-memory list behind the Account Options editor.

## Injector

- **CDP**: Chrome DevTools Protocol. Fixed port **32123**.
- **injreg / interceptPattern**: regex and file pattern locating the injection
  point in the bootstrap bundle; retuned when a game update changes it (see
  [Platforms](platforms.md)).
- **cheatState**: live toggle state per cheat, mirrored to the UI over WebSocket.
- **cheatConfig**: parameter values for configurable cheats; persisted as a diff
  against defaults.
- **startupCheats**: command strings executed automatically after injection.
- **monitorWrap / monitorUnwrap**: watch an arbitrary `gga` path from the Web UI
  Monitor tab.

## UI

- **World tabs (W1-W7)**: Account view tabs mirroring the game's worlds. Nested
  panels (Alchemy in W2, Construction in W3) hold feature sub-tabs. See
  [Account Pages Patterns](account-pages.md).
- **wide**: cheat namespace for account-wide toggles.
