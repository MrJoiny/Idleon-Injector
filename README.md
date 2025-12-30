# Idleon Injector UI

---

## Files Included
- **InjectCheatsUI.exe** - The main application that injects cheats and runs the game.
- **cheats.js** - Contains the code for all the available cheat commands.
- **config.js** - Configuration files for setting up startup cheats, custom parameters, or other options. This will change every update.
- **config.custom.example.js** - (rename to `config.custom.js`) Personal configuration files for setting up startup cheats, custom parameters, or other options. Change things in here if you want.

---

## Installation

> **You no longer need to put the injector files into the game directory!**
> 
> The injector now works from any folder and will automatically find and launch the game (Windows/Steam) or guide you for Linux/Proton.

1. Extract the contents of the download (at least the `.exe`, `.js`, and config files) to any folder you like.
2. **Do NOT** run `LegendsOfIdleon.exe`. Instead, run the `InjectCheatsUI.exe`.
3. The injector will launch the game with the cheat console enabled. A console window should appear alongside or shortly before the game window.
4. Use this console to type commands, or use the new **web UI** (see below).

---

## New Web UI

The injector now features a powerful, state-of-the-art Web UI for a more intuitive experience.

- **Access**: After starting the injector, open your browser and go to [http://localhost:8080](http://localhost:8080)
- **Features**:
    - **Cheats**: Browse and execute all available cheats with ease.
    - **Account**: Fine-tune specific account parameters and game attributes.
    - **Config**: Manage global injector settings and setup startup cheats.
    - **DevTools**: Advanced tools for game manipulation.
    - **Active Cheats**: A real-time list in the sidebar shows exactly what's running. Click any active cheat to instantly deactivate it.
- **Why use it?**: The Web UI is the recommended way to manage your experience, eliminating the need for manual configuration file editing.

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
3. In the project folder run:
   ```sh
   npm install
   ```
4. Build:
   ```sh
   npm run build
   npm run build-unix #(linux)
   ```

---

## Credits

- iBelg
- Creater0822
- valleymon
- sciomachist
- and everyone that contributed to this project

<br/>

[![Contributors](https://contrib.rocks/image?repo=MrJoiny/Idleon-Injector)](https://github.com/MrJoiny/Idleon-Injector/graphs/contributors)
