# Cheats

Use the CLI or Cheats workspace to find commands and their descriptions. The
[project wiki](https://github.com/MrJoiny/Idleon-Injector/wiki) provides a user-facing command list.
See the [glossary](glossary.md) for the distinction between commands, state, configuration, and proxies.

Commands can alter save-sensitive game data. Check the command description and relevant configuration warnings
before running an unfamiliar command.

## Contributor entry points

- [Command implementations](../src/cheats/cheats/) and [registration](../src/cheats/core/registration.js).
- [Game globals](../src/cheats/core/globals.js) and [traversal utilities](../src/cheats/utils/traverse.js).
- [Game hooks](../src/cheats/proxies/) and [proxy utilities](../src/cheats/utils/proxy.js).

Exact parameters and helper contracts belong in those files. The
[base-first decision](decisions.md#preserve-original-method-side-effects) explains the method-hook constraint.

Follow the [build workflow](build.md) after changes and the
[contribution guidance](../CONTRIBUTING.md) when submitting a command.
