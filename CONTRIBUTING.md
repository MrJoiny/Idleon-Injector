# Contributing

Questions go to Discord: [https://discord.gg/ySH2Rfk7SN](https://discord.gg/ySH2Rfk7SN)

## Small changes (< 20 lines)

Submit a PR directly. The description must explain what the change does and what it fixes. No issue needed.

## Larger changes

Open an issue first. Discuss the goal, the plan, and the steps with the maintainer before writing code. PRs without a prior issue discussion will be closed.

## New commands and cheats

If you add a new command or cheat, state which in-game functions get called and why. The codebase hooks into obfuscated Haxe internals, so this context is required for review.

## Code quality

Contributions to `src/cheats/` and `src/modules/` must match the existing code style, quality, and readability. AI-generated slop that does not meet these standards will be closed without review.

Before submitting:

```bash
npm run format
npm run validate
```

Both must pass.
