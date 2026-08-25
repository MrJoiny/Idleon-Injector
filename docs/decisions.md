# Decisions

Why the injector is built the way it is. Each entry records the decision, what
makes it work, and the trade-off accepted. When a decision changes, update its
entry here instead of explaining it in prose elsewhere. This file records
rationale, not mechanics - mechanics belong next to the code that implements them.

## Injection via CDP request interception

The backend intercepts the game's bootstrap bundle (`*N.js`), evaluates the cheat
bundle in the page first, then patches the bootstrap so `window.__idleon_cheats__`
captures the game-root variable exactly where the bundle defines it.

Works because: interception disables cache and bypasses CSP reliably, and the root
variable name is minified, so capturing it at definition time (via `injreg`) beats
discovering it after the fact.

Trade-off: a game update can change the bootstrap and break `injreg` /
`interceptPattern`; both are tunable in `injectorConfig` for exactly this reason.
If interception fails, the original request continues so the game still loads.

## One fixed CDP port (32123)

Simplifies endpoint polling and Steam launch flags. Trade-off: one injector
session per machine.

## Cheats as ES modules bundled to one IIFE

`src/cheats/` is bundled by rollup into a single `cheats.js`: IIFE format, no
strict mode (the game context may not support it), side-effect imports preserved
so registration still runs. Trade-off: no hot reload - rebuild and restart after
changes.

## Base-first proxies

Proxied game methods always run the original first, then optionally override the
return value. This keeps game side effects and state consistent regardless of
whether a cheat is active. Standardized by helpers in
`src/cheats/utils/proxy.js`.

## Idempotent patch guards

Proxy setups mark patched objects (`_isPatched`) and re-run on the play button,
because character selection recreates game data objects (lists, item defs). The
guard skips re-wrapping an object still in memory but re-applies when the game has
replaced it.

## Layered config with type validation

Defaults live in committed `config.js`; user overrides live in gitignored
`config.custom.js`, merged per key and validated against default types. Editing
defaults directly would be lost on every update, hence the override layer.
Persistent saves write only the diff against defaults, so stale keys cannot leak
back into user configs.

## cheatConfig accepts functions

Values may be `(t) => ...` receiving the original game value (optionally plus
args), enabling proportional modifiers without duplicating game balance tables.

## VanJS vendor bundle, no UI build step

The dashboard uses vendored VanJS/VanX served as static assets. Compatibility
target includes older Chromium (87) because the embedded in-game browser is old;
avoid modern CSS/JS in the UI for this reason.

## pkg + Node 18 packaging, web-only macOS

Binaries ship Node 18 via `pkg` with the UI included as assets. macOS supports
only the web target because Steam attach is not implemented there.

## No automated tests

Validation is build + syntax check + lint + schema require. Consequence:
documentation must not restate code behavior - it would drift silently with
nothing to catch it. Docs are limited to navigation ([Architecture](architecture.md)),
domain language ([Glossary](glossary.md)), and rationale (this file).
