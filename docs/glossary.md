# Domain language

These terms distinguish concepts used throughout the project. Follow the linked source for implementation details.

| Term                | Meaning                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Target              | The Steam or web game client selected for attachment.                                              |
| CDP                 | Chrome DevTools Protocol, the debugging connection used to access the game runtime.                |
| Injection           | Introducing the cheat runtime into the running game.                                               |
| Game context        | The game-side environment where commands and hooks access game objects.                            |
| Cheat command       | A named action in the command registry. It may perform an action or toggle an ongoing effect.      |
| Cheat state         | Whether a stateful cheat is enabled, distinct from its configured values.                          |
| Cheat configuration | Values that customize cheat effects.                                                               |
| Startup cheats      | Commands selected to run when the cheat runtime starts.                                            |
| Proxy               | A hook around a game method or property that can alter its result.                                 |
| GGA                 | The game's attributes map, exposed as `gga`.                                                       |
| cList               | The game's custom lists, including definition and lookup data.                                     |
| Haxe wrapper        | An object representation whose data may be stored under an `.h` property.                          |
| Account options     | The game's indexed `OptionsListAccount` values.                                                    |
| Account page        | An editor for an account feature or world system. The raw Account Options editor is one such page. |
| Monitor             | A subscription to observe a game value over time.                                                  |
| Session update      | A configuration change applied to the running session.                                             |
| Saved configuration | User overrides written to disk for later runs.                                                     |

Source entry points: [game globals](../src/cheats/core/globals.js),
[command registration](../src/cheats/core/registration.js),
[cheat state](../src/cheats/core/state.js),
[account schema](../src/ui/config/optionsAccountSchema.json),
[configuration loading](../src/modules/config/configManager.js).
