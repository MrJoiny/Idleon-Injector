# Build and Release

Bundling cheats, validating changes, and packaging for each platform.

## Prerequisites

- Run `npm install`.
- Use Node 18 for packaging (`pkg` targets Node 18).
- Build `cheats.js` before running (build once or use the watcher).

## Development loop

```bash
npm install
npm run build:cheats
npm run start
```

- `npm run start` launches the injector and web server using the existing `cheats.js` bundle.
- Start does not rebuild cheats; rebuild and restart after changes.
- No hot reload for the injected game context.

For cheat development, run the watcher to keep `cheats.js` current:

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

`npm run validate` runs these checks:

1. `npm run build:cheats` (ensures bundle is current).
2. `node --check cheats.js config.js` (syntax check).
3. `npx eslint .` (lint).
4. `node -e "require('./src/ui/config/optionsAccountSchema.json')"` (schema validity).

Run this before packaging or releasing.

To lint only cheats: `npx eslint src/cheats/`.

## Packaging binaries

`pkg` bundles Node 18 with the app. Commands in `package.json`:

```bash
npm run build           # Windows: InjectCheatsUI.exe
npm run build-unix      # Linux: InjectCheatsUI-linux
npm run build-macos-x64 # macOS Intel: InjectCheatsUI-macos-x64
npm run build-macos-arm64 # macOS Apple Silicon: InjectCheatsUI-macos-arm64
```

Each script runs `npm run build:cheats` first, then packages with `--compress Gzip`.

`pkg` includes `src/ui/**/*` as assets so the web UI ships with the binary.
New UI assets should go under `src/ui` or be added to `pkg.assets`.

## Release checklist

1. Run `npm run validate`.
2. Rebuild cheats if not using the watcher.
3. Build target binaries.
4. Run `InjectCheatsUI` and verify:
   - UI loads at `http://localhost:8080`.
   - Cheats list and config load.
   - A sample cheat executes.
   - CLI autocomplete works.

## Troubleshooting

- Syntax errors in `cheats.js` or `config.js` will fail `node --check`.
- `ENOENT: cheats.js` means the bundle was not built (run `npm run build:cheats`).
- If `pkg` fails, check Node 18 compatibility and that dependencies are installed.
- If the UI fails to load in packaged builds, check that `src/ui/**/*` is in `pkg.assets`.
