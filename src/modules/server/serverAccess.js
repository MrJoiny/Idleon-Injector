/**
 * Build the shared HTTP/WebSocket request policy. Host validation also prevents
 * a browser from reaching loopback through an attacker-controlled DNS name.
 * Origin-less native clients remain supported; opaque origins are Steam-only.
 * @param {object} config - Injector configuration.
 * @param {number} port - Actual listening port.
 * @returns {(req: import("http").IncomingMessage) => boolean} Request predicate.
 */
function createRequestPolicy(config, port) {
    const target = (config.target || "steam").toLowerCase();
    const uiOrigins = new Set([`http://localhost:${port}`, `http://127.0.0.1:${port}`, `http://[::1]:${port}`]);
    const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
    if (!localHosts.has(config.webHost || "127.0.0.1")) {
        for (const origin of config.webAllowedOrigins || []) {
            const url = new URL(origin);
            if (!["http:", "https:"].includes(url.protocol) || url.origin !== origin) {
                throw new Error(`Invalid webAllowedOrigins entry: ${origin}`);
            }
            uiOrigins.add(origin);
        }
    }
    const hosts = new Set([...uiOrigins].map((origin) => new URL(origin).host));
    const origins = new Set(uiOrigins);
    if (target === "web") {
        origins.add(new URL(config.webUrl).origin);
    } else {
        origins.add("null");
        origins.add("file://");
    }

    return (req) => {
        if (!hosts.has(req.headers.host)) return false;
        const origin = req.headers.origin;
        if (origin !== undefined) return origins.has(origin);
        if (req.headers["sec-fetch-site"] !== "cross-site") return true;

        // Embedded UI navigations and GETs may omit Origin while the game
        // ancestor makes Sec-Fetch-Site cross-site. Verify their referrer instead.
        if (req.method !== "GET" && req.method !== "HEAD") return false;
        // File documents never send a referrer. Permit Steam's initial UI shell
        // navigation only; its API requests and WebSocket still need authorization.
        if (
            target === "steam" &&
            req.method === "GET" &&
            (req.url === "/" || req.url === "/index.html") &&
            req.headers.referer === undefined &&
            req.headers["sec-fetch-mode"] === "navigate" &&
            req.headers["sec-fetch-dest"] === "iframe"
        ) {
            return true;
        }
        try {
            return origins.has(new URL(req.headers.referer).origin);
        } catch {
            return false;
        }
    };
}

module.exports = { createRequestPolicy };
