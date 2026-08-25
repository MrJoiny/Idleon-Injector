# Build and Release

Commands and release flow. Script details live in `package.json`; bundler
behavior is documented in `rollup.config.mjs`.

## Prerequisites

- Node 18 (packaging target for `pkg`).
- Dependencies installed: `npm install`.

## Development loop

```bash
npm run build:cheats   # bundle src/cheats/ -> cheats.js
npm run start          # injector + server, using the existing bundle
```

- `start` does not rebuild cheats; rebuild and restart after changes.
- No hot reload for the injected game context.
- For active cheat work, keep `npm run watch:cheats` running in a second
  terminal.

`cheats.js` is generated and gitignored.

## Validation

```bash
npm run validate
```

Rebuilds cheats, syntax-checks outputs, runs eslint, and requires the account
schema. Run before packaging or releasing. Formatting: `npm run format` /
`npm run format:check`. Cheat-only lint: `npx eslint src/cheats/`.

## Packaging

```bash
npm run build              # Windows exe
npm run build-unix         # Linux binary
npm run build-macos-x64    # macOS Intel
npm run build-macos-arm64  # macOS Apple Silicon
```

Each packaging script builds cheats first, then bundles Node 18 with the app via
`pkg`, shipping `src/ui/**` as assets. New UI assets belong under `src/ui` to be
picked up by the existing asset glob.

## Release checklist

1. `npm run validate`.
2. Build target binaries.
3. Smoke test: UI loads on port 8080, cheats list loads, one cheat executes,
   CLI autocomplete works.

## Troubleshooting

- `ENOENT cheats.js`: bundle not built - run `npm run build:cheats`.
- Syntax errors in `cheats.js` or `config.js` fail validation.
- `pkg` failures: check Node 18 compatibility and installed dependencies.
- UI missing in packaged builds: verify `src/ui/**/*` remains in `pkg.assets`.
