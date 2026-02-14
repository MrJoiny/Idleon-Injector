const os = require("os");
const fs = require("fs");
const { getRuntimePath } = require("./modules/utils/runtimePaths");
const {
    loadConfiguration,
    getInjectorConfig,
    getStartupCheats,
    getCheatConfig,
    getDefaultConfig,
    getCdpPort,
    getWebPort,
} = require("./modules/config/configManager");
const { runSetupWizard } = require("./modules/config/setupWizard");
const { attachToTarget } = require("./modules/game/gameAttachment");

const { setupIntercept, createCheatContext } = require("./modules/game/cheatInjection");
const { createWebServer, startServer } = require("./modules/server/webServer");
const { setupApiRoutes } = require("./modules/server/apiRoutes");
const { startCliInterface } = require("./modules/cli/cliInterface");
const { checkForUpdates } = require("./modules/updateChecker");
const { createLogger } = require("./modules/utils/logger");
const { version } = require("../package.json");

const log = createLogger("Main");

/**
 * InjectCheatUI - Main application entry point
 *
 * This application injects cheats into a game by:
 * 1. Attaching to the game process via Chrome DevTools Protocol
 * 2. Intercepting and modifying game resources during load
 * 3. Providing both web UI and CLI interfaces for cheat management
 */

let servicesStarted = false;
let uiServicesStarted = false;

async function printHeader() {
    log.info("=============================");
    log.info(`InjectCheatUI v${version}`);
    log.info("=============================");
    log.info("FREE & PUBLIC SOURCE SOFTWARE");
    log.info("GitHub: https://github.com/MrJoiny/Idleon-Injector");
    log.info("");

    const update = await checkForUpdates(version);
    if (update && update.updateAvailable) {
        log.warn(`UPDATE AVAILABLE: v${update.latestVersion} - ${update.url}`);
        log.info("");
    }
}

function printConfiguration(injectorConfig) {
    const target = (injectorConfig.target || "steam").toLowerCase();

    log.debug(`Injection regex: ${injectorConfig.injreg}`);
    log.debug(`Log level: ${injectorConfig.logLevel}`);
    log.info(`Target platform: ${target}${target === "web" ? ` (${injectorConfig.webUrl})` : ""}`);
    log.info(`Web UI port: ${injectorConfig.webPort || 8080}`);
    log.debug(`OS Platform: ${os.platform()}`);
    if (target === "web" && injectorConfig.browserPath) {
        log.debug(`Browser: ${injectorConfig.browserPath}`);
    }
}

function initializeConfiguration() {
    loadConfiguration();

    const injectorConfig = getInjectorConfig();
    const startupCheats = getStartupCheats();
    const cheatConfig = getCheatConfig();
    const defaultConfig = getDefaultConfig();
    const cdpPort = getCdpPort();
    const webPort = getWebPort();

    return { injectorConfig, startupCheats, cheatConfig, defaultConfig, cdpPort, webPort };
}

async function initializeCheatContext(Runtime, context) {
    log.debug("Initializing cheat context");

    const contextExists = await Runtime.evaluate({ expression: `!!${context}` });
    if (!contextExists.result.value) {
        log.error("Cheat context not found - injection may have failed");
        return false;
    }

    const init = await Runtime.evaluate({
        expression: `setup.call(${context})`,
        awaitPromise: true,
        allowUnsafeEvalBlockedByCSP: true,
    });
    if (init.exceptionDetails) {
        log.error("Cheat setup failed:", init.exceptionDetails.exception?.description || init.exceptionDetails.text);
    }
    log.debug("Cheat context initialized:", init.result.value);
    return true;
}

async function startWebServer(app, webPort, wsConfig = null) {
    try {
        await startServer(app, webPort, wsConfig);
    } catch (err) {
        log.error("Failed to start web server:", err);
    }
}

async function handlePageLoad(gameContext, config, app) {
    const { Runtime, context, client } = gameContext;
    log.debug("Page loaded, setting up cheats");

    if (config.injectorConfig.enableUI && !uiServicesStarted) {
        uiServicesStarted = true;

        setupApiRoutes(app, context, client, {
            cheatConfig: config.cheatConfig,
            defaultConfig: config.defaultConfig,
            startupCheats: config.startupCheats,
            injectorConfig: config.injectorConfig,
            cdpPort: config.cdpPort,
        });

        await startWebServer(app, config.webPort, {
            runtime: Runtime,
            context: context,
        });
    }

    const cheatInitialized = await initializeCheatContext(Runtime, context);
    if (!cheatInitialized) return;

    if (!servicesStarted) {
        servicesStarted = true;
        log.info("Cheats ready!");

        await startCliInterface(context, client, {
            injectorConfig: config.injectorConfig,
            cdpPort: config.cdpPort,
        });
    }
}

function handleError(error) {
    log.error("Fatal error:", error);

    if (error?.message?.includes("No inspectable targets")) {
        log.info("Hint: Is Steam running? Make sure the game is not already open");
    }

    log.info("Press Enter to exit");
    const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    readline.question("", () => {
        readline.close();
        process.exit(1);
    });
}

async function main() {
    try {
        const customConfigPath = getRuntimePath("config.custom.js");

        if (!fs.existsSync(customConfigPath)) {
            await runSetupWizard(customConfigPath);
        }

        const config = initializeConfiguration();

        await printHeader();
        printConfiguration(config.injectorConfig);

        const app = createWebServer({ enableUI: config.injectorConfig.enableUI });

        const target = (config.injectorConfig.target || "steam").toLowerCase();
        if (os.platform() === "darwin" && target !== "web") {
            throw new Error("macOS only supports the 'web' target. Set injectorConfig.target to 'web'");
        }

        const hook = await attachToTarget();

        const client = await setupIntercept(
            hook,
            config.injectorConfig,
            config.startupCheats,
            config.cheatConfig,
            config.cdpPort
        );
        log.debug("Network interceptor ready");

        const { Runtime, Page } = client;

        log.debug("Registering page load handler");
        Page.loadEventFired(async () => {
            try {
                const context = createCheatContext();
                await handlePageLoad({ Runtime, Page, context, client }, config, app);
            } catch (loadEventError) {
                log.error("Page load handler failed:", loadEventError);
            }
        });

        log.debug("Reloading page to trigger injection");
        await Page.reload({ ignoreCache: true });
    } catch (error) {
        handleError(error);
    }
}

main();
