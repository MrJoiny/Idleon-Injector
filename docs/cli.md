# CLI Reference

Interactive prompt that executes cheat commands. Lives in `src/modules/cli/cliInterface.js` and runs alongside the web server.

## How the CLI works

1. The injector evaluates `getAutoCompleteSuggestions.call(context)` in the game context.
2. Suggestions map to Enquirer autocomplete choices, with `message` including the description.
3. The prompt loops until exit; selecting a command runs `cheat.call(context, '<action>')`.
4. The CLI starts after first successful injection and shares the CDP Runtime client with the UI.

Any cheat registered in `src/cheats/` appears in both CLI and UI.

## Autocomplete behavior

- Filtering checks both command value and description.
- Case-insensitive with multi-word matching (space-separated tokens must all match).
- Parameterized commands show a `[+param]` hint (e.g., `buy [+param] (Purchase items)`).
- First match selected by default when input is empty.
- Custom commands not in the list are appended and executed as-is.

## Command History

History of executed commands during the session:

- **Ctrl+Up**: Navigate backwards through previous commands.
- **Ctrl+Down**: Navigate forwards (clears input at end).
- Consecutive duplicates not stored.
- Autocomplete updates as you scroll through history.

## Parameterized cheats

Commands with parameters set `needsParam` in registration. The CLI asks for a second Enter to confirm.

Example flow (command with a parameter):

```text
Action: buy
<press Enter>  -> the prompt locks to "buy" so you can append parameters
Action: buy bun_c
<press Enter>  -> command executes
```

The final string passes as a single action; enter multi-word parameters exactly as needed.

## Built-in command

`chromedebug` is a CLI-only command that opens DevTools for the current CDP target:

- Uses the same CDP port as the injector (default `32123`).
- Windows uses `start`, macOS uses `open`, Linux uses `xdg-open`.
- Builds the DevTools URL from `Target.getTargetInfo()` and includes `experiment=true`.

## Output and errors

- Successful commands log the result string from the cheat.
- Errors print with context so the prompt continues.
- Auto-recovers from prompt errors by retrying after a short delay.
- If autocomplete fails to load, the CLI stops (usually injection issues).

## Tips

- Use keywords from command name or description for faster filtering.
- Add frequent cheats to `startupCheats` in `config.custom.js` for auto-execution.
- Use `chromedebug` to inspect the live game context when debugging.
- If autocomplete fails, verify injection succeeded and the UI is reachable.
