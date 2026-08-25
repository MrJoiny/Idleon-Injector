# CLI Reference

Interactive prompt for cheat commands, started alongside the web server after
the first successful injection. Any registered cheat appears here; see the
[Cheat guide](cheats.md) to add one.

## Autocomplete

- Type to filter; matching checks command text and description,
  case-insensitively, with all space-separated tokens required to match.
- Parameterized commands show a `[+param]` hint (e.g., `buy [+param] (...)`).
- Enter selects; input that matches nothing executes as-is.

## History

- Ctrl+Up / Ctrl+Down walks through previous commands (forward past the newest
  clears the input).
- Consecutive duplicates are not stored.

## Parameterized commands

Commands registered with `needsParam` lock the prompt after the first Enter so
you can append parameters; the second Enter executes:

```text
Action: buy
<Enter>        -> prompt locks to "buy"
Action: buy bun_c
<Enter>        -> executes
```

## Built-in: chromedebug

Opens Chrome DevTools for the attached game in your desktop browser (using the
platform-appropriate open command).

## Tips

- Filter with keywords from the command name or its description.
- For frequent cheats, add them to `startupCheats` in `config.custom.js`.
- If autocomplete never loads, injection failed - check backend logs.
