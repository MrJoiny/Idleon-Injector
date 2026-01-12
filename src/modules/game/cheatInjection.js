/**
 * Cheat Injection Module
 *
 * Handles Chrome DevTools Protocol interception and script modification for injecting
 * cheat functionality into the game. Intercepts specific script requests, modifies their
 * content to include cheat hooks, and manages the injection of cheat code into the game context.
 */

const CDP = require("chrome-remote-interface");
const fs = require("fs").promises;

const { objToString } = require("../utils/helpers");

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

    const { DOM, Page, Network, Runtime } = client;
    console.log("Injecting cheats...");

    let cheats = await fs.readFile("cheats.js", "utf8");
    cheats =
        `let startupCheats = ${JSON.stringify(startupCheats)};\n` +
        `let cheatConfig = ${objToString(cheatConfig)};\n` +
        `let webPort = ${config.webPort};\n` +
        `${cheats}`;

    await Network.setRequestInterception({
        patterns: [
            {
                urlPattern: config.interceptPattern,
                resourceType: "Script",
                interceptionStage: "HeadersReceived",
            },
        ],
    });

    // Disable cache to ensure network interception works reliably
    await Network.setCacheDisabled({ cacheDisabled: true });

    await Page.setBypassCSP({ enabled: true });
    if (config.showConsoleLog) {
        Runtime.consoleAPICalled((entry) => {
            console.log(entry.args.map((arg) => arg.value).join(" "));
        });
    }

    await Promise.all([Runtime.enable(), Page.enable(), Network.enable(), DOM.enable()]);

    Network.requestIntercepted(async ({ interceptionId, request }) => {
        try {
            console.log(`Intercepted: ${request.url}`);
            const response = await Network.getResponseBodyForInterception({ interceptionId });
            const originalBody = Buffer.from(response.body, "base64").toString("utf8");

            // Find the main application variable assignment to hook cheats into
            const InjRegG = new RegExp(config.injreg, "g");
            const VarName = new RegExp("^\\w+");

            const AppMain = InjRegG.exec(originalBody);
            if (!AppMain) {
                console.error(`Injection regex '${config.injreg}' did not match the script content. Cannot inject.`);
                Network.continueInterceptedRequest({ interceptionId });
                return;
            }
            const AppVar = Array(AppMain.length).fill("");
            for (let i = 0; i < AppMain.length; i++) AppVar[i] = VarName.exec(AppMain[i])[0];

            // Inject cheats directly into the current context to persist across page reloads
            console.log("Loaded cheats...");
            await Runtime.evaluate({
                expression: cheats,
                awaitPromise: true,
                allowUnsafeEvalBlockedByCSP: true,
            });

            let manipulatorResult = await Runtime.evaluate({ expression: "getZJSManipulator()", awaitPromise: true });
            let newBody;

            if (manipulatorResult.result && manipulatorResult.result.type === "string") {
                let manipulator = new Function("return " + manipulatorResult.result.value)();
                newBody = manipulator(originalBody);
            } else {
                console.warn(
                    "getZJSManipulator() did not return a valid function string. Applying basic injection only."
                );
                newBody = originalBody;
            }

            // Assign the game variable to a global window property for cheat access
            const replacementRegex = new RegExp(config.injreg);
            newBody = newBody.replace(replacementRegex, `window.__idleon_cheats__=${AppVar[0]};$&`);

            console.log("Updated game code...");

            const newHeaders = [
                `Date: ${new Date().toUTCString()}`,
                `Connection: closed`,
                `Content-Length: ${newBody.length}`,
                `Content-Type: text/javascript`,
            ];
            const newResponse = Buffer.from(
                "HTTP/1.1 200 OK\r\n" + newHeaders.join("\r\n") + "\r\n\r\n" + newBody
            ).toString("base64");

            await Network.continueInterceptedRequest({
                // Make sure to await this
                interceptionId,
                rawResponse: newResponse,
            });
            console.log("Sent to game...");
            console.log("Cheat injected!");
        } catch (error) {
            console.error("Error during request interception:", error);
            // Attempt to continue with original content to prevent game from hanging
            try {
                await Network.continueInterceptedRequest({ interceptionId });
            } catch (continueError) {
                console.error("Error trying to continue request after interception error:", continueError);
            }
        }
    });

    console.log("Interception listener setup complete.");
    return client;
}

/**
 * Create the JavaScript context expression for accessing the game's cheat interface
 * @returns {string} JavaScript expression for the cheat context
 */
function createCheatContext() {
    return "(window.__idleon_cheats__ || window.document.querySelector('iframe')?.contentWindow?.__idleon_cheats__)";
}

module.exports = {
    setupIntercept,
    createCheatContext,
};
