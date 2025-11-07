/**
 * Cheat Injection Module
 * 
 * Handles Chrome DevTools Protocol interception and script modification for injecting
 * cheat functionality into the game. Intercepts specific script requests, modifies their
 * content to include cheat hooks, and manages the injection of cheat code into the game context.
 */

const CDP = require('chrome-remote-interface');
const fs = require('fs').promises;
const atob = require('atob');
const btoa = require('btoa');

// Import utility functions
const { objToString } = require('../utils/helpers');

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
    port: cdpPort
  };

  const client = await CDP(options);

  const { DOM, Page, Network, Runtime } = client;
  console.log('Injecting cheats...');

  let cheats = await fs.readFile('cheats.js', 'utf8');
  cheats = `let startupCheats = ${JSON.stringify(startupCheats)};\nlet cheatConfig = ${objToString(cheatConfig)};\n${cheats}`;

  // Intercept specific script requests to modify their content before execution.
  // This targets the main game script based on the configured URL pattern
  await Network.setRequestInterception(
    {
      patterns: [
        {
          urlPattern: config.interceptPattern,
          resourceType: 'Script',
          interceptionStage: 'HeadersReceived',
        },
      ],
    }
  );
  // Disable Content Security Policy to allow injecting and executing modified/external scripts.
  await Page.setBypassCSP({ enabled: true });
  // Optionally forward console messages from the game window to this script's console.
  if (config.showConsoleLog) {
    Runtime.consoleAPICalled((entry) => {
      console.log(entry.args.map(arg => arg.value).join(" "));
    });
  }

  await Promise.all([Runtime.enable(), Page.enable(), Network.enable(), DOM.enable()]);

  const eval = await Runtime.evaluate({ expression: cheats });
  console.log('Loaded cheats...');

  // Define the handler for intercepted requests. This runs for each matched script.
  Network.requestIntercepted(async ({ interceptionId, request }) => {
    // Wrap in try-catch to prevent unhandled errors in the interception callback from crashing the injector.
    try {
      console.log(`Intercepted: ${request.url}`);
      const response = await Network.getResponseBodyForInterception({ interceptionId });
      const originalBody = atob(response.body);

      // Regex to find the main application variable assignment in the game's code.
      // This is crucial for hooking the cheats into the game's context.
      const InjRegG = new RegExp(config.injreg, "g");
      const VarName = new RegExp("^\\w+"); // Extracts the variable name itself.

      const AppMain = InjRegG.exec(originalBody);
      if (!AppMain) {
        console.error(`Injection regex '${config.injreg}' did not match the script content. Cannot inject.`);
        // Allow the original script to load if injection point isn't found.
        Network.continueInterceptedRequest({ interceptionId });
        return;
      }
      // Extract the variable name found by the regex.
      const AppVar = Array(AppMain.length).fill("");
      for (let i = 0; i < AppMain.length; i++) AppVar[i] = VarName.exec(AppMain[i])[0];

      let manipulatorResult = await Runtime.evaluate({ expression: 'getZJSManipulator()', awaitPromise: true });
      let newBody;

      if (manipulatorResult.result && manipulatorResult.result.type === 'string') {
        // Execute the manipulator function fetched from the target context.
        let manipulator = new Function("return " + manipulatorResult.result.value)();
        newBody = manipulator(originalBody);
      } else {
        // If no manipulator is defined or it's invalid, use the original script body.
        console.warn('getZJSManipulator() did not return a valid function string. Applying basic injection only.');
        newBody = originalBody;
      }

      // Core injection: Assign the found game variable to a global window property (`__idleon_cheats__`)
      // This makes the game's main object accessible to the cheat script.
      // Use a non-global regex for replacement to ensure only the first match is replaced.
      const replacementRegex = new RegExp(config.injreg);
      newBody = newBody.replace(replacementRegex, `window.__idleon_cheats__=${AppVar[0]};$&`);

      console.log('Updated game code...');

      const newHeaders = [
        `Date: ${(new Date()).toUTCString()}`,
        `Connection: closed`,
        `Content-Length: ${newBody.length}`,
        `Content-Type: text/javascript`,
      ];
      const newResponse = btoa(
        "HTTP/1.1 200 OK\r\n" +
        newHeaders.join('\r\n') +
        "\r\n\r\n" +
        newBody
      );

      await Network.continueInterceptedRequest({ // Make sure to await this
        interceptionId,
        rawResponse: newResponse,
      });
      console.log('Sent to game...');
      console.log('Cheat injected!');
    } catch (error) {
      console.error("Error during request interception:", error);
      // Attempt to continue the request with the original content if modification fails,
      // to prevent the game from potentially hanging.
      try {
        await Network.continueInterceptedRequest({ interceptionId });
      } catch (continueError) {
        console.error("Error trying to continue request after interception error:", continueError);
      }
    }
  });

  console.log("Interception listener setup complete.");
  return client; // Return the CDP client for further interaction.
}

/**
 * Create the JavaScript context expression for accessing the game's cheat interface
 * @returns {string} JavaScript expression for the cheat context
 */
function createCheatContext() {
  return `window.document.querySelector('iframe').contentWindow.__idleon_cheats__`;
}

module.exports = {
  setupIntercept,
  createCheatContext
};