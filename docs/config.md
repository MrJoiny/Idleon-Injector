# Configuration

Keep personal overrides in `config.custom.js`; leave the committed defaults in
[config.js](../config.js) unchanged. The first-run setup wizard creates the override file.

For option help, use the Config editor. The maintained descriptions live in
[configDescriptions.js](../src/ui/config/configDescriptions.js).

## Applying and saving

Apply cheat configuration to RAM when experimenting in the current session. Save to disk when you want
the configuration available on later runs. Treat applying and saving as separate choices.
Restart after changing injector settings.

Use Startup Cheats for commands you want to run on startup. Check command descriptions before making
an action automatic.

## Safety

The Web UI permits command execution and game-state editing. Keep access local unless you deliberately need
remote access on a trusted network. Remote access has no login; configure the listening address and allowed
origins carefully, then restart.

Account values and cheat settings can affect save data. Read field warnings before editing.
Keep the dangerous `chng` command disabled unless you understand the consequences.

## Source entry points

- [Defaults](../config.js) and [configuration loading](../src/modules/config/configManager.js).
- [Config workspace](../src/ui/components/views/Config.js).
- [Account option labels and warnings](../src/ui/config/optionsAccountSchema.json).

See [platform setup](platforms.md) for target selection and the [glossary](glossary.md) for configuration terms.
