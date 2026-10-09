# AGENTS.md

Operational guidelines for AI coding agents working in the Idleon Injector repository.

---

## Operational Boundaries

### Always
* **Validate syntax and types:** Run `npm run validate` to ensure the cheats bundle builds, syntax checks pass, and ESLint is clean before completing a task.
* **Guard against action bias:** If a reported bug cannot be reproduced or is already resolved by current code, report findings clearly instead of proposing speculative changes. Never invent modifications for working behavior.
* **Clean up verification scripts:** You may create temporary `.cjs` verification scripts to test behavior. Delete them completely before completing your turn.
* **Target Chromium 87:** The Steam embedded client runs Chromium 87. Keep UI code and browser-injected code compatible with Chromium 87, or supply a verified fallback.

### Ask First
* **Opening Pull Requests:** Never create, open, or push a pull request without explicit user confirmation.
* **Adding dependencies:** Check with the user before adding packages to `package.json`.
* **Config schema changes:** Modifying `src/ui/config/optionsAccountSchema.json` requires updating `src/ui/config/configDescriptions.js`.

### Never
* **Never edit protected paths:**
  * `config.js`: Default settings. Put user overrides in `config.custom.js`.
  * `src/ui/vendor/`: Upstream vendored libraries (VanJS). Do not modify directly.
  * `.scratch/`: Local artifacts and notes. Never stage, commit, or clean up unrelated files.
* **Never use `codex/` branch prefixes:** Follow the existing branch naming style unless explicitly requested.

---

## Runtime Environment & Bindings

* **Web UI Dashboard:** Hosted locally at `http://localhost:8080` by default.
* **Game CDP Remote Debugging:** Connects via Chrome DevTools Protocol on port `32123` by default.
* **Runtime Target:** Steam (Windows/Linux via Proton) or Web Chromium (macOS is web-only). When `browserUserDataDir` is omitted in web mode, a fresh temporary browser profile is generated.

---

## Verification & Testing

* **Automated tests:** None exist. Do not look for test runners (Jest, Vitest, Mocha).
* **Pre-completion check:** Run `npm run validate` (builds cheats bundle, checks syntax, runs ESLint, validates schema).
* **Manual live check:** Start with `npm run start`, attach to the running game client, and verify live behavior. Hot reload is not supported; restart the app to test backend and cheat modifications.
* **Ad-hoc checks:**
  * Syntax check: `node --check path/to/file.js`
  * Account schema validation: `node -e "require('./src/ui/config/optionsAccountSchema.json')"`

---

## Architecture & Conventions

### Cheats Engine & Proxies (`src/cheats/`)
* **Runtime context:** `cheats.js` is bundled via Rollup from `src/cheats/` (ES modules) into an IIFE executed in the game's browser context (`window.__idleon_cheats__`).
* **Guaranteed globals:** Globals initialized by `gameReady()` (`gga`, `behavior`, `itemDefs`, `cList`) are guaranteed. Access them directly; avoid redundant guards like `!gga` or defensive optional chaining.
* **Companion data:** `w1.companion.companions` is a comma-separated string (e.g. `"0,1,2"`), not a function or array.
* **Code simplicity:** Inline small 1–2 line logic at call sites rather than creating tiny single-use helpers. Use direct property access when types and shapes are guaranteed by the execution path.
* **Base-first proxy pattern:** All proxies in `src/cheats/proxies/` must call the original method first via `Reflect.apply` to preserve side effects before checking cheat toggles:
  ```javascript
  const PlayerReach = ActorEvents12._customBlock_PlayerReach;
  ActorEvents12._customBlock_PlayerReach = function (...args) {
      const base = Reflect.apply(PlayerReach, this, args);
      if (cheatState.godlike.reach) return 666;
      return base;
  };
  ```

### Haxe Objects & Traversal
* Legends of Idleon is compiled with Haxe, which wraps object properties in an `.h` field.
* **Traversing objects:** Use `traverse(obj, depth, worker)` from `src/cheats/utils/traverse.js`. It automatically unwraps `.h` properties.
* **Manual property access:** Check `.h` when inspecting raw objects directly (e.g. `item.h.ID`).
* **Path discovery:** Use the UI Search tab to inspect live memory access paths, and the Monitor tab (`window.monitorWrap`) to track value changes.

### UI & VanJS Reactivity (`src/ui/`)
* **Child reactivity:** When returning elements from a reactive child function `(() => condition ? a : b)`, return a single container node such as `div(a, b)` or `span(a, b)`. Returning a raw array `[a, b]` causes VanJS to stringify elements into `[object HTMLSpanElement]`.
* **Input focus preservation:** Keep `<input>` elements static and bind their value property to state (`value: state.val`). Wrapping inputs in reactive closures `(() => input({...}))` causes DOM re-creation and loss of focus on every keystroke.
* **Reactivity scope:** Keep reactive functions as tight as possible. Wrap only dynamic leaf elements (e.g. `div(table(thead(...), () => tbody(...)))`) rather than whole tables or parent containers.
* **Stable row identity:** Editable rows (`EditableNumberRow`, `ClampedLevelRow`, `useWriteStatus()`) require stable DOM identity. Re-rendering entire parent sections destroys button state and flash feedback. Use stable containers with `createStaticRowReconciler(...)` and update row values after load.

---

## Git & PR Workflow

* **Commit format:** `<type>(<scope>): <short imperative description>` (`fix`, `feat`, `refactor`, `chore`). Lowercase description, no trailing period. Example: `fix(ui): restore sidebar content after switching tabs`.
* **Pull requests:** Require explicit user confirmation before creation. Omit testing logs and validation details from PR descriptions unless requested. In PowerShell, use single-quoted here-strings or body files to prevent backticks from escaping Markdown.

---

## Documentation Rules (`docs/`)

* **Scope:** `docs/` records architecture, domain language, and decisions. It does not duplicate code behavior.
* **Update triggers:**
  * Added or removed runtime boundaries: update `docs/architecture.md`.
  * Introduced domain terms: add definition to `docs/glossary.md`.
  * Architectural decision changes: add or update entries in `docs/decisions.md`.
* **No restated implementation:** Never add endpoint lists, config tables, or copied source snippets to `docs/`. Keep `README.md` documentation lists in sync with `docs/`.
