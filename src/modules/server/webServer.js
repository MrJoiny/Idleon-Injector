/**
 * Web Server Module
 *
 * Creates and manages the built-in Node.js HTTP server for the Idleon Cheat Injector UI.
 * Handles static file serving, middleware configuration, and server startup.
 * Provides the foundation for the web-based cheat management interface.
 */

const http = require("http");
const path = require("path");
const fs = require("fs").promises;
const TinyRouter = require("./tinyRouter");
const { initWebSocket } = require("./wsServer");
const { createLogger } = require("../utils/logger");

const log = createLogger("WebServer");

const MIME_TYPES = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
};

/**
 * Serves static files from the specified directory
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} staticDir - Directory to serve files from
 * @returns {Promise<boolean>} Whether the file was served
 */
async function serveStatic(req, res, staticDir) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let pathname = url.pathname;
    let filePath = path.join(staticDir, pathname === "/" ? "index.html" : pathname);

    try {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
            filePath = path.join(filePath, "index.html");
        }

        const content = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
        res.end(content);
        return true;
    } catch (err) {
        return false;
    }
}

/**
 * Creates and configures the TinyRouter
 * @param {Object} config - Configuration object
 * @param {boolean} config.enableUI - Whether to enable the web UI
 * @returns {Object} TinyRouter instance
 */
function createWebServer(config) {
    const router = new TinyRouter();
    router.enableUI = config.enableUI;

    log.debug(`Web UI ${config.enableUI ? "enabled" : "disabled"}`);

    return router;
}

/**
 * Starts the web server on the specified port
 * @param {Object} router - TinyRouter instance
 * @param {number} port - Port to listen on
 * @param {Object} [wsConfig] - Optional WebSocket configuration
 * @param {Object} [wsConfig.runtime] - CDP Runtime client for WebSocket
 * @param {string} [wsConfig.context] - Game context expression for WebSocket
 * @returns {Promise<Object>} Server instance
 */
function startServer(router, port, wsConfig = null) {
    const staticDir = path.join(__dirname, "../../ui");

    const server = http.createServer(async (req, res) => {
        try {
            const handledByRouter = await router.handle(req, res);
            if (handledByRouter) return;

            if (router.enableUI) {
                const handledByStatic = await serveStatic(req, res, staticDir);
                if (handledByStatic) return;
            }

            res.statusCode = 404;
            res.end("Not Found");
        } catch (err) {
            log.error("Server error:", err);
            res.statusCode = 500;
            res.end("Internal Server Error");
        }
    });

    return new Promise((resolve, reject) => {
        server
            .listen(port, () => {
                log.info(`Web UI: http://localhost:${port}`);

                // Initialize WebSocket server if config provided
                if (wsConfig && wsConfig.runtime && wsConfig.context) {
                    initWebSocket(server, wsConfig.runtime, wsConfig.context);
                }

                resolve(server);
            })
            .on("error", (err) => {
                log.error("Web server failed to start:", err);
                reject(err);
            });
    });
}

module.exports = {
    createWebServer,
    startServer,
};
