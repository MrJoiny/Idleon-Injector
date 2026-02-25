# Configuration and Schema

Layered configuration plus UI schema metadata for rendering and validating settings.

## Config files

Backend loads configuration in `src/modules/config/configManager.js`:

- `config.js`: defaults committed to the repo.
- `config.custom.js`: user overrides (gitignored).

`config.custom.js` is created by the setup wizard on first run.
Config files are loaded from the runtime base directory:

- Packaged builds: directory of the injector executable.
- Source runs (`npm run start`): `process.cwd()`.

Merge rules:

- `injectorConfig` is deep-merged.
- `startupCheats` arrays are unioned.
- `cheatConfig` is deep-merged.
- `defaultConfig` is a deep clone of `config.js`, used for UI diffs and saves.
- **Type Validation**: `config.custom.js` is validated against `config.js` types. Mismatches (e.g., string where function expected) are logged and reverted to defaults.

## Top-level structure

`config.js` exports three keys:

```js
exports.startupCheats = [];

exports.cheatConfig = {
    unban: true,
    maxval: { bones: 1e20 },
    w1: { stampcost: (t) => t / 4 },
};

exports.injectorConfig = {
    logLevel: "info",
    injreg: "\\w+\\.ApplicationMain\\s*?=",
    interceptPattern: "*N.js",
    enableUI: true,
    webPort: 8080,
    onLinuxTimeout: 30000,
    target: "web",
    webUrl: "https://www.legendsofidleon.com/ytGl5oc/",
    browserPath: "",
    browserUserDataDir: "",
};
```

`config.custom.js` can omit any export; only provided keys override defaults.

## Startup cheats

`startupCheats` is an array of command strings run after injection.

Example (`config.custom.js`):

```js
exports.startupCheats = ["wide mtx", "unlock quickref", "wide autoloot"];
```

These map to the same commands shown in the Cheats tab and CLI.

In the Web UI Startup tab, commands marked with `needsParam` display a separate `Value` field for clarity. The saved config format is unchanged: each row is still stored as a single command string (for example, `"drop Copper 100"`).

## Cheat config values

`cheatConfig` controls parameterized cheats and proxy overrides. Values can be:

- Primitives (`true`, `false`, numbers, strings).
- Functions taking the original game value (`t`) and returning a modified value.
- Functions with extra arguments (`(t, args) => ...`) for cheats that pass parameters.

Example overrides:

```js
exports.cheatConfig = {
    w1: {
        stampcost: (t) => t / 4,
        anvil: { productionspeed: (t) => t * 4 },
    },
    w5: {
        gaming: { FertilizerUpgCosts: (t) => 0 },
    },
};
```

### Function editing in the UI

The Config view recognizes simple function patterns and exposes sliders/dropdowns via `FunctionInput`:

- Multiply: `(t) => t * 2`
- Divide: `(t) => t / 2`
- Fixed: `(t) => 0`
- Pass-through: `(t) => t`
- Min/Max: `(t) => Math.min(t, 1)` / `(t) => Math.max(t, 10)`
- Complex: any other form, shown as raw source.

Parsing logic lives in `src/ui/utils/functionParser.js` and feeds `FunctionInput`.
Multiply/divide functions get slider presets (1, 2, 4, 5, 10, 20) with default range 1-20.

## Injector config

`injectorConfig` controls attachment and injection:

- `logLevel`: `debug`, `info`, `warn`, `error`.
- `injreg`: regex that finds the injection point in `N.js`.
- `interceptPattern`: CDP script match (default `*N.js`).
- `enableUI`: toggle the web UI.
- `webPort`: UI port (default 8080).
- `onLinuxTimeout`: Linux attach timeout in ms.
- `target`: `steam` or `web`.
- `webUrl`: Idleon web URL for browser injection.
- `browserPath`: explicit Chromium executable.
- `browserUserDataDir`: custom profile directory (defaults to `idleon-web-profile` in the runtime base directory).
- `gameExePath`: optional Windows override for the Steam exe search.

Example `config.custom.js` targeting Steam:

```js
exports.injectorConfig = {
    target: "steam",
    logLevel: "debug",
};
```

## Runtime updates vs saved config

Two update modes:

- Session-only updates: `POST /api/config/update` updates in-memory config and calls `updateCheatConfig` in the game context.
- Persistent updates: `POST /api/config/save` writes `config.custom.js` with only the diff from defaults.

`apiRoutes.js` uses `prepareConfigForJson` to serialize functions, then `parseConfigFromJson` to restore them. Uses `filterByTemplate` and `getDeepDiff` to persist only valid keys.

## Descriptions and schema

Two files control UI labels and warnings:

- `src/ui/config/configDescriptions.js`: path-to-description map for `cheatConfig` and `injectorConfig` fields.
- `src/ui/config/optionsAccountSchema.json`: labels for `OptionsListAccount` indices.

Schema fields:

- `name`: display label.
- `description`: help text.
- `type`: `number`, `string`, `boolean`, etc.
- `warning`: optional warning string.
- `AI`: marks entries that are auto-generated or inferred.

## Adding new config fields

1. Add the default to `config.js`.
2. Add a tooltip description in `src/ui/config/configDescriptions.js`.
3. If user-editable, ensure `ConfigNode` renders it correctly (number, boolean, or function).
4. Keys not in `config.js` are dropped when saving via the UI (template filtering).
5. Document risks in description or warning fields.

## Safety notes

- `cheatConfig.chng_enabled` exposes the dangerous `chng` command. Keep `false` unless you understand the risk.
- Some cheats use hard caps (like `maxval`) to prevent save corruption. Adjust carefully.
