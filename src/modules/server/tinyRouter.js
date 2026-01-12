/**
 * Tiny Router Module
 *
 * A minimal, zero-dependency replacement for Express routing.
 * Provides a familiar API (get, post) and helper methods for JSON handling.
 */

class TinyRouter {
    constructor() {
        this.routes = {
            GET: new Map(),
            POST: new Map(),
        };
    }

    /**
     * Registers a GET route
     * @param {string} path - Request path
     * @param {Function} handler - Request handler function
     */
    get(path, handler) {
        this.routes.GET.set(path, handler);
    }

    /**
     * Registers a POST route
     * @param {string} path - Request path
     * @param {Function} handler - Request handler function
     */
    post(path, handler) {
        this.routes.POST.set(path, handler);
    }

    /**
     * Main request handler for http.createServer
     * @param {IncomingMessage} req
     * @param {ServerResponse} res
     */
    async handle(req, res) {
        const { method, url } = req;
        const parsedUrl = new URL(url, `http://${req.headers.host}`);
        const pathname = parsedUrl.pathname;

        // Polyfill res.status and res.json
        res.status = (code) => {
            res.statusCode = code;
            return res;
        };

        res.json = (data) => {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(data));
        };

        req.json = () => {
            return new Promise((resolve, reject) => {
                let body = "";
                req.on("data", (chunk) => {
                    body += chunk.toString();
                });
                req.on("end", () => {
                    try {
                        resolve(body ? JSON.parse(body) : {});
                    } catch (e) {
                        reject(new Error("Invalid JSON body"));
                    }
                });
                req.on("error", (err) => reject(err));
            });
        };

        const handler = this.routes[method]?.get(pathname);

        if (handler) {
            try {
                await handler(req, res);
            } catch (error) {
                console.error(`Router error [${method} ${pathname}]:`, error);
                res.status(500).json({ error: "Internal server error", details: error.message });
            }
            return true; // Handled
        }

        return false; // Not handled (let static server try)
    }
}

module.exports = TinyRouter;
