/**
 * Web Server Module
 * 
 * Creates and manages the Express web server for the Idleon Cheat Injector UI.
 * Handles static file serving, middleware configuration, and server startup.
 * Provides the foundation for the web-based cheat management interface.
 */

const express = require('express');
const path = require('path');

/**
 * Creates and configures the Express web server
 * @param {Object} config - Configuration object
 * @param {boolean} config.enableUI - Whether to enable the web UI
 * @returns {Object} Express app instance
 */
function createWebServer(config) {
  const app = express();
  
  // Middleware to parse JSON request bodies
  app.use(express.json());

  if (config.enableUI) {
    // Serve static files (CSS, JS) from the 'ui' directory
    app.use(express.static(path.join(__dirname, '../../ui')));

    // Explicitly serve index.html for the root path
    app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../../ui', 'index.html'));
    });
    console.log('Web UI enabled. Static files and root route configured.');
  } else {
    console.log('Web UI disabled in config.');
  }

  return app;
}

/**
 * Starts the web server on the specified port
 * @param {Object} app - Express app instance
 * @param {number} port - Port to listen on
 * @returns {Promise<Object>} Server instance
 */
function startServer(app, port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`\n--------------------------------------------------`);
      console.log(`Web UI available at: http://localhost:${port}`);
      console.log(`--------------------------------------------------\n`);
      resolve(server);
    }).on('error', (err) => {
      console.error('Failed to start web server:', err);
      reject(err);
    });
  });
}

module.exports = {
  createWebServer,
  startServer
};