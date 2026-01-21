# CLI Reference

The CLI is an interactive prompt that executes the same cheat commands as the UI. It lives in `src/modules/cli/cliInterface.js` and runs alongside the web server.

## How the CLI works

1. The injector evaluates `getAutoCompleteSuggestions.call(context)` in the game context.
2. Suggestions are mapped into Enquirer autocomplete choices, with `message` including the cheat description.
3. The prompt loops until exit, and selecting a command runs `cheat.call(context, '<action>')`.
4. The CLI starts after the first successful injection and uses the same CDP Runtime client as the UI.

Because the CLI uses the same cheat dispatcher as the UI, any cheat registered in `src/cheats/` appears in both places.

## Autocomplete behavior

- Filtering checks both the command value and its description.
- Input is case-insensitive and supports multi-word matching (space-separated tokens must all match).
- The first match is selected by default when input is empty.
- If you type a custom command not in the list, it is appended and executed as-is.

## Parameterized cheats

Commands that require parameters set `needsParam` in the cheat registration. The CLI handles this by asking for a second Enter to confirm.

Example flow (command with a parameter):

```text
Action: buy
<press Enter>  -> the prompt locks to "buy" so you can append parameters
Action: buy bun_c
<press Enter>  -> command executes
```

The final string is passed as a single action, so multi-word parameters should be entered exactly as needed.

## Built-in command

`chromedebug` is a special CLI-only command. It opens DevTools for the current CDP target:

- Uses the same CDP port as the injector (default `32123`).
- On Windows it uses `start`, on macOS `open`, and on Linux `xdg-open`.
- Builds the DevTools URL from `Target.getTargetInfo()` and includes `experiment=true`.

## Output and errors

- Successful commands log the result string returned by the cheat.
- Errors are printed with context so the prompt can continue running.
- The CLI auto-recovers from prompt errors by retrying after a short delay.
- If autocomplete fails to load, the CLI stops early (usually due to injection issues).

## Tips

- Use keywords from either the command name or description for faster filtering.
- Add your most-used cheats to `startupCheats` in `config.custom.js` for automatic execution.
- Use `chromedebug` to inspect the live game context when debugging commands.
- If autocomplete fails, verify injection succeeded and the web UI is reachable.
