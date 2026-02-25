# AGENTS.md

Guidance for coding agents working in this repository.
Use this file as the default playbook unless a higher-priority rule file exists.

## Mission and priorities
1. Preserve behavior for both Steam and Web targets.
2. Prefer small, focused edits over broad refactors.
3. Keep backend CommonJS and cheats/UI ESM boundaries intact.
4. Validate with focused checks first, then wider checks before handoff.
5. Edit source-of-truth files unless the task explicitly targets runtime artifacts.

## Repository map (source of truth)
- `src/main.js`: startup orchestration and lifecycle guards.
- `src/modules/`: backend runtime (config, CDP attach/injection, API, CLI, server, utils).
- `src/cheats/`: cheat runtime source bundled into root `cheats.js`.
- `src/ui/`: VanJS + VanX frontend served by backend static routes.
- `config.js`: default config template and type shape.
- `config.custom.js`: user/local overrides (generated or manually edited).
- `eslint.config.mjs`: lint rules, language modes, ignored paths.
- `rollup.config.mjs`: cheat bundling configuration.

## Runtime duplicates and generated artifacts
- Root `cheats.js` is generated; edit `src/cheats/**` and rebuild.
- Root `main.js`, `modules/`, and `ui/` may exist as runtime copies; prefer `src/**` for development changes.
- Never edit `node_modules/**`.
- Do not edit `src/ui/vendor/van-*.js` or `src/ui/vendor/van-x-*.js` unless explicitly required.

## Build, run, lint, and validation commands
### Install
- `npm install`

### Build and run
- `npm run build:cheats` - bundle cheats from `src/cheats/main.js` to `cheats.js`.
- `npm run watch:cheats` - watch and rebuild cheat bundle on changes.
- `npm run start` - run injector from source (`src/main.js`).

### Full validation
- `npm run validate` runs:
  1. `npm run build:cheats`
  2. `node --check cheats.js config.js`
  3. `npx eslint .`
  4. `node -e "require('./src/ui/config/optionsAccountSchema.json')"`

### Lint and syntax checks
- `npx eslint .` - whole project lint.
- `npx eslint src/cheats/` - cheats-only lint.
- `npx eslint src/path/to/file.js` - single-file lint.
- `node --check src/path/to/file.js` - single-file syntax check.

## Single-test guidance (important)
There is no dedicated unit test framework in source directories right now.
For "single test" workflows, run the smallest check that proves your change.

### Recommended targeted checks
- Any JS file change: `npx eslint src/path/to/file.js` then `node --check src/path/to/file.js`.
- Multiple touched files: lint only touched files in one command.
- `config.js` or config parser changes: `node --check config.js` and `npm run start`.
- Schema changes (`src/ui/config/optionsAccountSchema.json`):
  - `node -e "require('./src/ui/config/optionsAccountSchema.json')"`

### Focused manual integration slices
- Cheats change:
  1. `npm run build:cheats`
  2. `npm run start`
  3. Execute affected cheat from CLI or UI and verify state update.
- Backend API change:
  1. `npm run start`
  2. Hit affected route (browser, UI flow, or HTTP client).
  3. Confirm JSON shape and error handling.
- UI change:
  1. `npm run start`
  2. Open `http://localhost:8080`
  3. Exercise changed view and verify WebSocket/API behavior.

## Code style and conventions
### JavaScript baseline
- 4-space indentation.
- Semicolons required.
- Double quotes for strings.
- Prefer `const`; use `let` only when reassignment is required.
- Never use `var`.
- Prefer strict equality (`===`, `!==`).

### ESLint expectations
- `no-undef`: error.
- `no-unused-vars`: warn; `_name` and `_` patterns are intentionally allowed.
- In `config.js`, arg name `t` is intentionally allowed for function-valued config.
- `no-prototype-builtins` is disabled intentionally.

### Module boundaries
- `src/modules/**`, `src/main.js`, and `config.js` are CommonJS.
- `src/cheats/**` and `src/ui/**` are ES modules.
- Do not mix CJS and ESM in the same file.
- Do not do broad CJS/ESM migrations unless explicitly requested.

### Imports
- Keep imports/requires at top of file.
- Group in stable order when practical: platform/library, internal modules, side-effect imports.
- In ESM (`src/cheats`, `src/ui`), use explicit `.js` for relative imports.
- Follow local ordering/spacing where file style differs.

### Types and data-shape discipline
- This codebase is JavaScript, so enforce correctness via runtime validation.
- Validate API payloads early and return useful 4xx messages for bad input.
- Preserve config schema shape unless task explicitly changes schema.
- Keep function-valued config entries as functions (do not coerce to strings).
- Reuse config helpers (`prepareConfigForJson`, `parseConfigFromJson`, diff/filter helpers) when possible.

### Naming conventions
- `camelCase` for variables/functions.
- `PascalCase` for classes and UI component factories.
- `UPPER_SNAKE_CASE` for constants.
- Keep cheat command and config key casing aligned with existing domain naming.

### Error handling and logging
- Wrap async handlers and runtime-eval operations in `try/catch`.
- Return JSON errors with status code and actionable message.
- Include `details` for debugging when available.
- Backend/server code should use `createLogger`; avoid adding noisy `console.log`.
- Prefer graceful recovery for non-fatal runtime failures.

### Async and state patterns
- Prefer `async/await` over nested `.then()` chains.
- Use `Promise.all` for independent concurrent work.
- Preserve one-time guards like `servicesStarted`, `uiServicesStarted`, and `_isPatched`.

## Subsystem-specific guidance
### Cheats (`src/cheats/**`)
- Add command cheats under `src/cheats/cheats/`.
- Register new cheat modules in `src/cheats/cheats/register.js`.
- Prefer proxy helpers in `src/cheats/utils/proxy.js`.
- Use idempotent patch guards (`_isPatched`) where setup can run more than once.
- Rebuild bundle after edits: `npm run build:cheats`.

### UI (`src/ui/**`)
- Keep components as small factory functions returning DOM nodes.
- Keep API calls in `src/ui/services/` and state wiring in `src/ui/state/store.js`.
- Preserve UX conventions (tab layout, keyboard shortcuts, uppercase labels, monitor behavior).

### Backend/API (`src/modules/**`)
- Keep route handlers defensive: parse input, validate, then call runtime.
- Preserve existing response contracts used by UI.
- Keep CDP/runtime evaluate calls resilient; handle `exceptionDetails` explicitly.

## Agent workflow checklist
1. Identify target subsystem (`modules`, `cheats`, `ui`, or config).
2. Edit source-of-truth files only.
3. Run narrow checks on touched files first.
4. Run `npm run validate` when feasible.
5. Report changed files, validations run, and any manual checks still needed.

## Cursor and Copilot rule files
No repository-specific rule files were found at the time of this update:
- `.cursorrules`
- `.cursor/rules/`
- `.github/copilot-instructions.md`

If any of these files are added later, treat them as higher priority than this AGENTS.md and update this document accordingly.
