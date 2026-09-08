# Platform setup

Choose Steam or Web during first-run setup. Use the Config editor or your personal override file to change
the target later, then restart the injector.

| Platform | Target                       |
| -------- | ---------------------------- |
| Windows  | Steam or Web                 |
| Linux    | Steam through Proton, or Web |
| macOS    | Web                          |

## Steam

Install Idleon and keep Steam running. If the Windows game location is not detected, set its executable path in your personal override file. On Linux, follow the terminal's manual launch instructions when automatic launch fails.

## Web

Install a Chromium-based browser and configure the Idleon web URL. If browser detection fails, set the browser
executable path explicitly. A dedicated profile keeps this session separate from ordinary browsing.

## Troubleshooting

- If the game does not start, check the selected target and its installation.
- If browser detection fails, check the configured executable path or clear it to retry detection.
- If attachment times out, inspect the terminal output and confirm the game or browser launched successfully.
- If the game opens but commands are unavailable, inspect injection errors before changing game data.

Platform attachment code lives in [game modules](../src/modules/game/).
See [configuration](config.md) for settings and access safety.
