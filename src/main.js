const os = require('os');
const {
  loadConfiguration,
  getInjectorConfig,
  getStartupCheats,
  getCheatConfig,
  getCdpPort,
  getWebPort
} = require('./modules/config/configManager');
const { attachToGame } = require('./modules/game/gameAttachment');
const { setupIntercept, createCheatContext } = require('./modules/game/cheatInjection');
const { createWebServer, startServer } = require('./modules/server/webServer');
const { setupApiRoutes } = require('./modules/server/apiRoutes');
const { startCliInterface } = require('./modules/cli/cliInterface');

/**
 * InjectCheatUI - Main application entry point
 * 
 * This application injects cheats into a game by:
 * 1. Attaching to the game process via Chrome DevTools Protocol
 * 2. Intercepting and modifying game resources during load
 * 3. Providing both web UI and CLI interfaces for cheat management
 */

function printHeader() {
  console.log('------------------------------------------------------------------------------------------');
  console.log('InjectCheatUI v1.4.0');
  console.log('------------------------------------------------------------------------------------------');
  console.log('');
}

function printConfiguration(injectorConfig) {
  console.log('Options:');
  console.log(`Regex: ${injectorConfig.injreg}`);
  console.log(`Show idleon window console logs: ${injectorConfig.showConsoleLog}`);
  console.log(`Chrome location: ${injectorConfig.chrome}`);
  console.log(`Detected OS: ${os.platform()}`);
  console.log('');
}

/**
 * Loads and consolidates all configuration settings needed for the application.
 * This centralizes config access and ensures all settings are loaded before use.
 */
function initializeConfiguration() {
  loadConfiguration();

  const injectorConfig = getInjectorConfig();
  const startupCheats = getStartupCheats();
  const cheatConfig = getCheatConfig();
  const cdpPort = getCdpPort();
  const webPort = getWebPort();

  return { injectorConfig, startupCheats, cheatConfig, cdpPort, webPort };
}

printHeader();
const config = initializeConfiguration();
const app = createWebServer({ enableUI: config.injectorConfig.enableUI });
printConfiguration(config.injectorConfig);

/**
 * Verifies the cheat context exists in the game's iframe and initializes the cheat system.
 * The context must be successfully injected before cheats can be activated.
 */
async function initializeCheatContext(Runtime, context) {
  console.log('Initializing cheats ingame...');

  // Verify the injected cheat context is accessible in the game's iframe
  const contextExists = await Runtime.evaluate({ expression: `!!${context}` });
  if (!contextExists.result.value) {
    console.error("Cheat context not found in iframe. Injection might have failed.");
    return false;
  }

  // Execute the setup function from cheats.js within the game's context
  const init = await Runtime.evaluate({
    expression: `setup.call(${context})`,
    awaitPromise: true,
    allowUnsafeEvalBlockedByCSP: true
  });
  console.log("init.result.value", init.result.value);
  return true;
}

async function startWebServer(app, webPort) {
  try {
    await startServer(app, webPort);
  } catch (err) {
    console.error('Failed to start web server:', err);
  }
}

/**
 * Handles the game page load event by initializing cheats and starting user interfaces.
 * This is triggered after the game's DOM is fully loaded and ready for cheat injection.
 */
async function handlePageLoad(Runtime, Page, context, client, config, app) {
  console.log("Page load event fired.");

  const cheatInitialized = await initializeCheatContext(Runtime, context);
  if (!cheatInitialized) return;

  // Start web UI if enabled in configuration
  if (config.injectorConfig.enableUI) {
    setupApiRoutes(app, context, client, {
      cheatConfig: config.cheatConfig,
      startupCheats: config.startupCheats,
      injectorConfig: config.injectorConfig,
      cdpPort: config.cdpPort
    });

    await startWebServer(app, config.webPort);
  }

  // Always start CLI interface for user interaction
  await startCliInterface(context, client, {
    injectorConfig: config.injectorConfig,
    cdpPort: config.cdpPort
  });
}

function handleError(error) {
  console.error("An error occurred:", error);

  if (error?.message?.includes('No inspectable targets')) {
    console.log("\n>>> Specific Error Detected: Is Steam running?!");
  } else {
    console.log("\n>>> An unexpected error occurred.");
  }

  console.log("\nPress Enter to exit...");
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  readline.question('', () => {
    readline.close();
    process.exit(1);
  });
}

async function main() {
  try {
    const hook = await attachToGame();
    const client = await setupIntercept(hook, config.injectorConfig, config.startupCheats, config.cheatConfig, config.cdpPort);
    console.log("Interceptor setup finished.");

    const { Runtime, Page } = client;

    console.log("Attaching Page.loadEventFired listener...");
    Page.loadEventFired(async () => {
      try {
        const context = createCheatContext();
        await handlePageLoad(Runtime, Page, context, client, config, app);
      } catch (loadEventError) {
        console.error("Error during Page.loadEventFired handler:", loadEventError);
      }
    });

    console.log("Page load event listener attached.");
  } catch (error) {
    handleError(error);
  }
}

main();