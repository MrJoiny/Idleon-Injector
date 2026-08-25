# Configuration

User-facing semantics of the config system. Field-by-field descriptions live as
tooltips in `src/ui/config/configDescriptions.js`; defaults live in `config.js`.

## Layering

- `config.js`: committed defaults. Do not edit - updates overwrite it.
- `config.custom.js`: optional overrides, created by the setup wizard on first
  run. Loaded from the runtime directory (next to the packaged executable, or
  the working directory when running from source). Overrides are validated
  against default types; invalid entries log a warning and fall back to
  defaults.

Any top-level key may be omitted; provided keys override. The three keys:

- `startupCheats`: commands run automatically after injection.
- `cheatConfig`: parameters for configurable cheats.
- `injectorConfig`: attach and server options (target, ports, browser, regexes).

## startupCheats

Array of command strings - the same commands as the CLI and Cheats tab.
Parameterized values are embedded in the string (`"drop Copper 100"`):

```js
exports.startupCheats = ["wide mtx", "unlock quickref", "drop Copper 100"];
```

## cheatConfig

Maps dot-paths to values for configurable cheats. Paths mirror command names:
`wide gembuylimit` reads `cheatConfig.wide.gembuylimit`.

Value shapes:

- Primitives: numbers and booleans, set via CLI parameter or UI input.
- Functions `(t) => ...`: receive the original game value and return the
  replacement, e.g. `(t) => t / 4`. Proportional modifiers without copying game
  tables.
- Functions `(t, args) => ...`: cheats that pass parameters deliver them via
  `args`.

```js
exports.cheatConfig = {
    w1: {
        stampcost: (t) => t / 4,
    },
};
```

## Safety notes

- `cheatConfig.chng_enabled` enables the raw `chng` command: arbitrary game
  attribute writes. Leave it off unless you understand the risk.
- Some cheats cap values (e.g., `maxval.bones`) to prevent save corruption;
  raise those caps carefully.

## Extending

New user-editable field: add the default to `config.js` and a description in
`src/ui/config/configDescriptions.js`.
