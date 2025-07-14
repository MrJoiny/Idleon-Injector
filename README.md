# Idleon Injector UI

---

## Files Included
- **IdleOnInjecterUI.exe** - The main application that injects cheats and runs the game.
- **cheats.js** - Contains the code for all the available cheat commands.
- **config.json** - Configuration files for setting up startup cheats, custom parameters, or other options. This will change every update.
- **config.custom.example.js** - (rename to `config.custom.js`) Personal configuration files for setting up startup cheats, custom parameters, or other options. Change things in here if you want.

---

## Installation

> **You no longer need to put the injector files into the game directory!**
> 
> The injector now works from any folder and will automatically find and launch the game (Windows/Steam) or guide you for Linux/Proton.

1. Extract the contents of the download (at least the `.exe`, `.js`, and config files) to any folder you like.
2. **Do NOT** run `LegendsOfIdleon.exe`. Instead, run the `IdleOnInjecterUI.exe`.
3. The injector will launch the game with the cheat console enabled. A console window should appear alongside or shortly before the game window.
4. Use this console to type commands, or use the new **web UI** (see below).

---

## New Web UI

- After starting the injector, open your browser and go to [http://localhost:8080](http://localhost:8080)
- Manage cheats, configuration, and startup cheats from a modern web interface
- No more manual config editing required (but you still can if you want)

---

## Platform Support

### Windows
- The injector will automatically find `LegendsOfIdleon.exe` in common Steam locations or use a custom path from config.
- If not found, it will launch the game via the Steam protocol.
- **No need to move the injector to the game directory!**

### Linux (Steam Proton)
- Run the injector binary (`InjectCheatsUI`) in a terminal.
- The injector will attempt to launch Idleon via Steam with the correct debug parameters.
- If auto-launch fails, follow the terminal instructions to launch the game manually with the required parameters:
  ```sh
  PROTON_LOG=1 PROTON_NO_ESYNC=1 WINEDBG=fixme %command% --remote-debugging-port=32123
  ```

---

## Prerequisites & Troubleshooting

- Make sure your Steam client is running.
- You will likely need NodeJS installed for the source version. Download the LTS version from [https://nodejs.org/](https://nodejs.org/).
- Ensure no conflicting Node system variables are set (like `NODE_OPTIONS`).
- If injection fails (game loads but console doesn't respond or finish initializing cheats), close the console, wait about 5-10 seconds for the game process to fully terminate, and try running the injector again. Sometimes it takes a few tries.

---

## For Developers: Building from Source

> The following instructions are only needed if you want to change the Injector itself. Not needed for normal users.

1. Install NodeJS (e.g. via Chocolatey, version 16.5.0 or newer)
2. Install `pkg` globally:
   ```sh
   npm install -g pkg
   ```
3. In the project folder (/src), run:
   ```sh
   npm install
   ```
4. Build:
   ```sh
   npm run build
   npm run build-unix #(linux)
   ```

---

## What's New?

- **No more game directory requirement!**
- **Automatic Windows/Steam and Linux/Proton support**
- **Modern web UI** for all config and cheat management
- Expanded config.js with the injection Regex, which you can freely edit.
---

## Credits

- Forked from iBelg's version 1.1.1 tool
- UI and enhancements by MrJoiny and contributors