# Build and release

## Development

Install dependencies, build the cheat bundle, then start the injector:

```sh
npm install
npm run build:cheats
npm run start
```

After changing injected code, rebuild and restart. For repeated edits, run `npm run watch:cheats` in another
terminal; restart the injector to use the rebuilt bundle. Edit the source, not generated `cheats.js`.

## Before submitting

Follow the checks in [CONTRIBUTING.md](../CONTRIBUTING.md).
Inspect [package.json](../package.json) for the current scripts and
[rollup.config.mjs](../rollup.config.mjs) for bundling details.

## Packaging

Install dependencies before packaging. The packaging targets use Node 18.

| Platform            | Command                     |
| ------------------- | --------------------------- |
| Windows             | `npm run build`             |
| Linux               | `npm run build-unix`        |
| macOS Intel         | `npm run build-macos-x64`   |
| macOS Apple Silicon | `npm run build-macos-arm64` |

Before a release, run the contribution checks, build the intended binaries, and try the packaged application
on the target platform. Check attachment, UI loading, and a command whose effect you understand.

If startup reports a missing `cheats.js`, rebuild the bundle. For packaging failures, check the terminal
error against the packaging configuration in `package.json`.
