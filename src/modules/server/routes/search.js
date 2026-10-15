const { createLogger } = require("../../utils/logger");

const log = createLogger("API");

function setupSearchRoutes(app, gameBridge) {
    app.get("/api/search/keys", async (req, res) => {
        try {
            const keysResult = await gameBridge.callHelper("getGgaKeys");

            if (keysResult.error) {
                log.error("Error getting GGA keys:", keysResult.error.text);
                res.status(500).json({
                    error: "Failed to get GGA keys from game",
                    details: keysResult.error.text,
                });
            } else {
                res.json({ keys: keysResult.value || [] });
            }
        } catch (apiError) {
            log.error("Error in /api/search/keys:", apiError);
            res.status(500).json({ error: "Internal server error while fetching GGA keys" });
        }
    });

    app.post("/api/search", async (req, res) => {
        try {
            const { query, keys, withinPaths, compare } = await req.json();

            if (query === undefined || query === null) {
                return res.status(400).json({
                    error: "Missing required parameter: query",
                });
            }

            if (typeof query !== "string") {
                return res.status(400).json({
                    error: "Invalid query type: query must be a string",
                });
            }

            const hasWithinPaths = Array.isArray(withinPaths) && withinPaths.length > 0;
            if (!hasWithinPaths && (!Array.isArray(keys) || keys.length === 0)) {
                return res
                    .status(400)
                    .json({ error: "Missing required parameters: keys (array) or withinPaths (array)" });
            }

            const searchResult = await gameBridge.callHelper("searchGga", [
                query,
                keys,
                { withinPaths: withinPaths || null, compare: compare || null },
            ]);

            if (searchResult.error) {
                log.error("Error searching GGA:", searchResult.error.text);
                res.status(500).json({
                    error: "Failed to search GGA",
                    details: searchResult.error.text,
                });
            } else {
                const data = searchResult.value || { results: [], totalCount: 0 };
                res.json(data);
            }
        } catch (apiError) {
            log.error("Error in /api/search:", apiError);
            res.status(500).json({ error: "Internal server error while searching GGA" });
        }
    });
}

module.exports = { setupSearchRoutes };
