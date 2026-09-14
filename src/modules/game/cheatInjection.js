/**
 * Cheat Injection Module
 *
 * Handles Chrome DevTools Protocol interception and script modification for injecting
 * cheat functionality into the game. Intercepts specific script requests, modifies their
 * content to include cheat hooks, and manages the injection of cheat code into the game context.
 */

const CDP = require("chrome-remote-interface");
const fs = require("fs").promises;
const { getRuntimePath } = require("../utils/runtimePaths");
const { objToString } = require("../utils/helpers");
const { createLogger } = require("../utils/logger");

const log = createLogger("Injection");

/**
 * Set up CDP interception and inject cheats into the game
 * @param {string} hook - WebSocket URL for CDP connection
 * @param {Object} config - Configuration object containing injection settings
 * @param {Array} startupCheats - Array of cheat names to run on startup
 * @param {Object} cheatConfig - Configuration for individual cheats
 * @param {number} cdpPort - CDP port number
 * @returns {Promise<Object>} CDP client instance
 */
async function setupIntercept(hook, config, startupCheats, cheatConfig, cdpPort) {
    const options = {
        tab: hook,
        port: cdpPort,
    };
    const client = await CDP(options);

    const { DOM, Page, Network, Runtime, Fetch } = client;
    log.info("Setting up cheat injection");

    const cheatsPath = getRuntimePath("cheats.js");
    let cheats = await fs.readFile(cheatsPath, "utf8");
    cheats =
        `let startupCheats = ${JSON.stringify(startupCheats)};\n` +
        `let cheatConfig = ${objToString(cheatConfig)};\n` +
        `let webPort = ${config.webPort};\n` +
        `${cheats}`;

    // Disable cache to ensure network interception works reliably
    await Network.setCacheDisabled({ cacheDisabled: true });

    await Page.setBypassCSP({ enabled: true });
    Runtime.consoleAPICalled((entry) => {
        log.debug(entry.args.map((arg) => arg.value).join(" "));
    });

    await Promise.all([Runtime.enable(), Page.enable(), Network.enable(), DOM.enable()]);

    Fetch.requestPaused(
        async ({
            requestId,
            request,
            responseStatusCode,
            responseStatusText,
            responseHeaders,
            responseErrorReason,
        }) => {
            try {
                log.debug(`Intercepted script: ${request.url}`);

                if (responseErrorReason || responseStatusCode === undefined) {
                    await Fetch.continueRequest({ requestId });
                    return;
                }

                const response = await Fetch.getResponseBody({ requestId });
                const originalBody = response.base64Encoded
                    ? Buffer.from(response.body, "base64").toString("utf8")
                    : response.body;

                // Find the main application variable assignment to hook cheats into
                const InjRegG = new RegExp(config.injreg, "g");
                const VarName = new RegExp("^\\w+");
                const AppMain = InjRegG.exec(originalBody);

                if (!AppMain) {
                    log.error("Injection regex did not match - check injreg pattern");
                    await Fetch.continueRequest({ requestId });
                    return;
                }

                const AppVar = Array(AppMain.length).fill("");
                for (let i = 0; i < AppMain.length; i++) AppVar[i] = VarName.exec(AppMain[i])[0];

                // Inject cheats directly into the current context to persist across page reloads
                log.debug("Evaluating cheat code");
                await Runtime.evaluate({
                    expression: cheats,
                    awaitPromise: true,
                    allowUnsafeEvalBlockedByCSP: true,
                });

                // Assign the game variable to a global window property for cheat access
                const replacementRegex = new RegExp(config.injreg);
                const newBody = originalBody.replace(replacementRegex, `window.__idleon_cheats__=${AppVar[0]};$&`);

                log.debug("Patching game script");

                // Fetch.getResponseBody returns the response body separately from its transfer
                // encoding, so remove headers that no longer match the replacement body.
                const blockedHeaders = new Set(["content-length", "content-encoding", "transfer-encoding"]);
                const newHeaders = (responseHeaders || []).filter(
                    ({ name }) => !blockedHeaders.has(name.toLowerCase())
                );

                if (!newHeaders.some(({ name }) => name.toLowerCase() === "content-type")) {
                    newHeaders.push({ name: "Content-Type", value: "text/javascript" });
                }

                newHeaders.push({
                    name: "Content-Length",
                    value: String(Buffer.byteLength(newBody, "utf8")),
                });

                await Fetch.fulfillRequest({
                    requestId,
                    responseCode: responseStatusCode,
                    responsePhrase: responseStatusText || undefined,
                    responseHeaders: newHeaders,
                    body: Buffer.from(newBody, "utf8").toString("base64"),
                });

                log.info("Cheats injected successfully!");
            } catch (error) {
                log.error("Injection failed:", error);

                // Attempt to continue with original content to prevent game from hanging
                try {
                    await Fetch.continueRequest({ requestId });
                } catch (continueError) {
                    log.error("Failed to recover from injection error:", continueError);
                }
            }
        }
    );

    await Fetch.enable({
        patterns: [
            {
                urlPattern: config.interceptPattern,
                resourceType: "Script",
                requestStage: "Response",
            },
        ],
    });

    log.debug("Request interceptor attached");
    return client;
}

/**
 * Create the JavaScript context expression for accessing the game's cheat interface
 * @returns {string} JavaScript expression for accessing the cheat context
 */
function createCheatContext() {
    return "(window.__idleon_cheats__ || window.document.querySelector('iframe')?.contentWindow?.__idleon_cheats__)";
}

module.exports = {
    setupIntercept,
    createCheatContext,
};
