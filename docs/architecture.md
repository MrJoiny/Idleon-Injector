# Architecture map

Use this map to choose where to start reading. Source owns implementation details and contracts.
See the [glossary](glossary.md) for terminology and [decisions](decisions.md) for design rationale.

## Runtime boundaries

| Area               | Responsibility                                            | Start here                                            |
| ------------------ | --------------------------------------------------------- | ----------------------------------------------------- |
| Node process       | Orchestration, platform attachment, local server, and CLI | [main.js](../src/main.js), [modules](../src/modules/) |
| Injected game code | Commands and hooks operating in the game runtime          | [cheats/main.js](../src/cheats/main.js)               |
| Web UI             | User interaction with the injector                        | [App.js](../src/ui/components/App.js)                 |

The Node process connects to the game through CDP. The Web UI communicates with the Node server.
Injected code runs in the game context; Node and UI code have separate environments.

## Find the relevant area

| Task area                           | Source                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Platform attachment and injection   | [game modules](../src/modules/game/)                                                                 |
| Configuration loading               | [configManager.js](../src/modules/config/configManager.js)                                           |
| HTTP and WebSocket contracts        | [apiRoutes.js](../src/modules/server/apiRoutes.js), [wsServer.js](../src/modules/server/wsServer.js) |
| Console interaction                 | [cliInterface.js](../src/modules/cli/cliInterface.js)                                                |
| Command registration and state      | [cheats/core](../src/cheats/core/)                                                                   |
| Commands and game hooks             | [cheats/cheats](../src/cheats/cheats/), [proxies](../src/cheats/proxies/)                            |
| UI workspaces and shared components | [views](../src/ui/components/views/), [components](../src/ui/components/)                            |
| UI state and communication          | [state](../src/ui/state/), [services](../src/ui/services/)                                           |
| Styles                              | [style.css](../src/ui/entry/style.css), [styles](../src/ui/styles/)                                  |
| Bundling and packaging              | [rollup.config.mjs](../rollup.config.mjs), [package.json](../package.json)                           |

See the [Account page guide](account-pages.md) and [cheats guide](cheats.md) for those areas.
