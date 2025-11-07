/**
 * API Routes Module
 * 
 * Defines all REST API endpoints for the web UI interface of the Idleon Cheat Injector.
 * Handles cheat execution, configuration management, DevTools integration, and file operations.
 * Provides the bridge between the web interface and the game's cheat system.
 */

const _ = require('lodash');
const fs = require('fs').promises;
const path = require('path');
const { objToString, prepareConfigForJson, parseConfigFromJson } = require('../utils/helpers');

/**
 * Sets up all API routes for the web UI
 * @param {Object} app - Express application instance
 * @param {string} context - JavaScript expression for game context
 * @param {Object} client - Chrome DevTools Protocol client
 * @param {Object} config - Configuration objects
 * @param {Object} config.cheatConfig - Cheat configuration object
 * @param {Array} config.startupCheats - Array of startup cheat names
 * @param {Object} config.injectorConfig - Injector configuration
 * @param {number} config.cdpPort - Chrome DevTools Protocol port
 */
function setupApiRoutes(app, context, client, config) {
  const { Runtime } = client;
  const { cheatConfig, startupCheats, injectorConfig, cdpPort } = config;

  // --- API Endpoint: Get available cheats ---
  app.get('/api/cheats', async (req, res) => {
    try {
      const suggestionsResult = await Runtime.evaluate({ 
        expression: `getAutoCompleteSuggestions.call(${context})`, 
        awaitPromise: true, 
        returnByValue: true 
      });
      if (suggestionsResult.exceptionDetails) {
        console.error("API Error getting autocomplete suggestions:", suggestionsResult.exceptionDetails.text);
        res.status(500).json({ 
          error: 'Failed to get cheats from game', 
          details: suggestionsResult.exceptionDetails.text 
        });
      } else {
        res.json(suggestionsResult.result.value || []);
      }
    } catch (apiError) {
      console.error("API Error in /api/cheats:", apiError);
      res.status(500).json({ error: 'Internal server error while fetching cheats' });
    }
  });

  // --- API Endpoint: Execute cheat command ---
  app.post('/api/toggle', async (req, res) => {
    const { action } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'Missing action parameter' });
    }
    try {
      // Execute the selected cheat command within the game's context.
      const cheatResponse = await Runtime.evaluate({ 
        expression: `cheat.call(${context}, '${action}')`, 
        awaitPromise: true, 
        allowUnsafeEvalBlockedByCSP: true 
      });
      if (cheatResponse.exceptionDetails) {
        console.error(`API Error executing cheat '${action}':`, cheatResponse.exceptionDetails.text);
        res.status(500).json({ 
          error: `Failed to execute cheat '${action}'`, 
          details: cheatResponse.exceptionDetails.text 
        });
      } else {
        console.log(`[Web UI] Executed: ${action} -> ${cheatResponse.result.value}`);
        res.json({ result: cheatResponse.result.value });
      }
    } catch (apiError) {
      console.error(`API Error executing cheat '${action}':`, apiError);
      res.status(500).json({ error: `Internal server error while executing cheat '${action}'` });
    }
  });

  // --- API Endpoint: Get cheats needing confirmation ---
  app.get('/api/needs-confirmation', async (req, res) => {
    try {
      const confirmationResult = await Runtime.evaluate({ 
        expression: `getChoicesNeedingConfirmation.call(${context})`, 
        awaitPromise: true, 
        returnByValue: true 
      });
      if (confirmationResult.exceptionDetails) {
        console.error("API Error getting confirmation choices:", confirmationResult.exceptionDetails.text);
        res.status(500).json({ 
          error: 'Failed to get confirmation list from game', 
          details: confirmationResult.exceptionDetails.text 
        });
      } else {
        res.json(confirmationResult.result.value || []);
      }
    } catch (apiError) {
      console.error("API Error in /api/needs-confirmation:", apiError);
      res.status(500).json({ error: 'Internal server error while fetching confirmation list' });
    }
  });

  // --- API Endpoint: Get DevTools URL ---
  app.get('/api/devtools-url', async (req, res) => {
    try {
      // Use the existing CDP client to get target info
      const response = await client.Target.getTargetInfo();
      if (response && response.targetInfo && response.targetInfo.targetId) {
        const targetId = response.targetInfo.targetId;
        // Construct the DevTools URL
        // Note: Using http, not ws, for the main URL. The ws part is a parameter.
        const devtoolsUrl = `http://localhost:${cdpPort}/devtools/inspector.html?ws=localhost:${cdpPort}/devtools/page/${targetId}`;
        console.log(`[Web UI] Generated DevTools URL: ${devtoolsUrl}`);
        res.json({ url: devtoolsUrl });
      } else {
        console.error("API Error: Could not get target info to generate DevTools URL.");
        res.status(500).json({ error: 'Failed to get target information from CDP client.' });
      }
    } catch (apiError) {
      console.error("API Error getting DevTools URL:", apiError);
      res.status(500).json({ 
        error: 'Internal server error while fetching DevTools URL', 
        details: apiError.message 
      });
    }
  });

  // --- API Endpoint: Get current configuration ---
  app.get('/api/config', (req, res) => {
    try {
      const serializableCheatConfig = prepareConfigForJson(cheatConfig);
      const fullConfigResponse = {
        startupCheats: startupCheats, // Send the raw startupCheats array
        cheatConfig: serializableCheatConfig // Send the processed cheatConfig
      };
      res.json(fullConfigResponse);
    } catch (error) {
      console.error("API Error preparing full config for JSON:", error);
      res.status(500).json({ error: 'Internal server error while preparing configuration' });
    }
  });

  // --- API Endpoint: Update configuration in memory and game ---
  app.post('/api/config/update', async (req, res) => {
    const receivedFullConfig = req.body;
    // console.log('[Web UI] Received full config for update:', receivedFullConfig);

    if (!receivedFullConfig || typeof receivedFullConfig !== 'object' || !receivedFullConfig.cheatConfig) {
      return res.status(400).json({ 
        error: 'Invalid configuration data received. Expected { startupCheats: [...], cheatConfig: {...} }.' 
      });
    }

    try {
      // 1. Extract and parse the cheatConfig part
      const receivedCheatConfig = receivedFullConfig.cheatConfig;
      const parsedCheatConfig = parseConfigFromJson(receivedCheatConfig);
      // console.log('[Web UI] Parsed cheatConfig (with functions):', parsedCheatConfig);

      // 2. Update the server-side cheatConfig object (merge)
      _.merge(cheatConfig, parsedCheatConfig);
      // console.log('[Web UI] Updated server-side cheatConfig:', cheatConfig);

      // 3. Update server-side startupCheats (replace)
      if (Array.isArray(receivedFullConfig.startupCheats)) {
        // Overwrite the existing array content while keeping the reference
        startupCheats.length = 0; // Clear existing items
        startupCheats.push(...receivedFullConfig.startupCheats); // Add new items
        console.log('[Web UI] Updated server-side startupCheats.');
      } else {
        console.warn('[Web UI] Received startupCheats is not an array. Skipping update.');
      }

      // 4. Inject the updated *cheatConfig* into the game context
      const contextExistsResult = await Runtime.evaluate({ expression: `!!(${context})` }); // Re-check context
      if (!contextExistsResult || !contextExistsResult.result || !contextExistsResult.result.value) {
        console.error("API Error: Cheat context not found in iframe. Cannot update config in game.");
        return res.status(200).json({ 
          message: 'Configuration updated on server, but failed to apply in game (context lost).' 
        });
      }

      // Only inject cheatConfig changes
      const configStringForInjection = objToString(parsedCheatConfig);

      const updateExpression = `
        if (typeof updateCheatConfig === 'function') {
          updateCheatConfig(${configStringForInjection});
          'Config updated in game.';
        } else {
          'Error: updateCheatConfig function not found in game context.';
        }
      `;

      const updateResult = await Runtime.evaluate({
        expression: updateExpression,
        awaitPromise: true,
        allowUnsafeEvalBlockedByCSP: true
      });

      let gameUpdateDetails = 'N/A';
      if (updateResult.exceptionDetails) {
        console.error(`API Error updating config in game:`, updateResult.exceptionDetails.text);
        gameUpdateDetails = `Failed to apply in game: ${updateResult.exceptionDetails.text}`;
        return res.status(200).json({ 
          message: 'Configuration updated on server, but failed to apply in game.', 
          details: gameUpdateDetails 
        });
      } else {
        gameUpdateDetails = updateResult.result.value;
        console.log(`[Web UI] In-game config update result: ${gameUpdateDetails}`);
        if (gameUpdateDetails.startsWith('Error:')) {
          return res.status(200).json({ 
            message: 'Configuration updated on server, but failed to apply in game.', 
            details: gameUpdateDetails 
          });
        }
      }

      res.json({ message: 'Configuration updated successfully.', details: gameUpdateDetails });

    } catch (apiError) {
      console.error("API Error in /api/config/update:", apiError);
      res.status(500).json({ 
        error: 'Internal server error while updating configuration', 
        details: apiError.message 
      });
    }
  });

  // --- API Endpoint: Save configuration to file ---
  app.post('/api/config/save', async (req, res) => {
    const receivedFullConfig = req.body;

    if (!receivedFullConfig || typeof receivedFullConfig !== 'object' || 
        !receivedFullConfig.cheatConfig || !Array.isArray(receivedFullConfig.startupCheats)) {
      return res.status(400).json({ 
        error: 'Invalid configuration data received for saving. Expected { startupCheats: [...], cheatConfig: {...} }.' 
      });
    }

    try {
      // 1. Extract parts from UI payload
      const uiCheatConfigRaw = receivedFullConfig.cheatConfig;
      const uiStartupCheats = receivedFullConfig.startupCheats;
      const new_injectorConfig = objToString(injectorConfig).replaceAll("\\", "\\\\");

      // 2. Parse UI cheatConfig to handle functions for saving
      const parsedUiCheatConfig = parseConfigFromJson(uiCheatConfigRaw);

      // 3. Construct file content string
      const fileContentString = `
/****************************************************************************************************
 * This file is generated by the Idleon Cheat Injector UI.
 * Manual edits might be overwritten when saving from the UI.
 ****************************************************************************************************/

exports.startupCheats = ${JSON.stringify(uiStartupCheats, null, '\t')}; // Use startupCheats from UI

exports.cheatConfig = ${objToString(parsedUiCheatConfig)}; // Use parsed cheatConfig from UI

exports.injectorConfig = ${new_injectorConfig}; // Use current injectorConfig
`;
      // 4. Define save path
      const savePath = path.join(process.cwd(), 'config.custom.js');

      // 5. Write to file
      await fs.writeFile(savePath, fileContentString.trim());
      console.log(`[Web UI] Configuration saved to ${savePath}`);

      // 6. Update in-memory variables AFTER successful save
      startupCheats.length = 0; // Clear existing
      startupCheats.push(...uiStartupCheats); // Add new
      _.merge(cheatConfig, parsedUiCheatConfig); // Merge cheatConfig updates

      res.json({ message: 'Configuration successfully saved to config.custom.js' });

    } catch (apiError) {
      console.error("API Error in /api/config/save:", apiError);
      res.status(500).json({ 
        error: 'Internal server error while saving configuration file', 
        details: apiError.message 
      });
    }
  });
}

module.exports = {
  setupApiRoutes
};