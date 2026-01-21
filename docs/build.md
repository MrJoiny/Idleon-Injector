# Build and Release

This guide covers bundling cheats, validating changes, and packaging the injector for each platform.

## Prerequisites

- Install dependencies with `npm install`.
- Use Node 18 when packaging (the `pkg` targets are Node 18).
- Ensure `cheats.js` exists before running the app (build it once or use the watcher).

## Development loop

```bash
npm install
npm run build:cheats
npm run start
```

- `npm run start` launches the injector and web server using the existing `cheats.js` bundle.
- The start script does not rebuild cheats; rebuild and restart after cheat changes.
- There is no hot reload for the injected game context.

For cheat development, run the watcher so `cheats.js` stays current:

```bash
npm run watch:cheats
```

Keep the watcher running in one terminal and run `npm run start` in another.

## Bundling cheats

`rollup.config.mjs` builds the browser bundle:

- Input: `src/cheats/main.js`.
- Output: `cheats.js` (IIFE format).
- `strict: false` to avoid issues in the game context.
- Injects a banner with version info and date.
- Prints bundle stats (chunks, size, modules) after build.
- Bundles all cheat modules with `moduleSideEffects: true` for safety.
- The cheat bundle is required for both dev and packaged builds.

Build once:

```bash
npm run build:cheats
```

Note: `cheats.js` is gitignored and generated during builds.

## Validation

`npm run validate` performs the standard checks:

1. `npm run build:cheats` (ensures bundle is up to date).
2. `node --check cheats.js config.js` (syntax validation).
3. `npx eslint .` (lint).
4. `node -e "require('./src/ui/config/optionsAccountSchema.json')"` (schema JSON validity).

Run this before packaging or releasing.

If you only need to lint cheats, use `npx eslint src/cheats/`.

## Packaging binaries

`pkg` bundles Node 18 with the app. Commands in `package.json`:

```bash
npm run build           # Windows: InjectCheatsUI.exe
npm run build-unix      # Linux: InjectCheatsUI-linux
npm run build-macos-x64 # macOS Intel: InjectCheatsUI-macos-x64
npm run build-macos-arm64 # macOS Apple Silicon: InjectCheatsUI-macos-arm64
```

Each build script runs `npm run build:cheats` first and then packages with `--compress Gzip`.

`pkg` includes `src/ui/**/*` as assets so the web UI is packaged with the binary.
If you add new UI assets, keep them under `src/ui` or update the `pkg.assets` list.

## Release checklist

1. Run `npm run validate`.
2. Rebuild cheats (`npm run build:cheats`) if you are not using the watcher.
3. Build the target binaries.
4. Run `InjectCheatsUI` and verify:
   - UI loads at `http://localhost:8080`.
   - Cheats list and config load successfully.
   - A sample cheat executes correctly.
   - CLI autocomplete is populated and can execute commands.

## Troubleshooting

- Syntax errors in `cheats.js` or `config.js` will fail `node --check`.
- `ENOENT: cheats.js` means the cheat bundle was not built (run `npm run build:cheats`).
- If `pkg` fails, verify Node 18 compatibility and that dependencies are installed.
- When the UI fails to load in packaged builds, check that `src/ui/**/*` is listed under `pkg.assets` in `package.json`.
