/**
 * API Routes Module
 *
 * Defines all REST API endpoints for the web UI interface of the Idleon Cheat Injector.
 * Handles cheat execution, configuration management, DevTools integration, and file operations.
 * Provides the bridge between the web interface and the game's cheat system.
 */

const { deepMerge } = require("../utils/objectUtils");
const fs = require("fs").promises;
const {
    objToString,
    prepareConfigForJson,
    parseConfigFromJson,
    getDeepDiff,
    filterByTemplate,
} = require("../utils/helpers");
const { getRuntimePath } = require("../utils/runtimePaths");
const { exec } = require("child_process");
const { broadcastCheatStates } = require("./wsServer");
const { createLogger } = require("../utils/logger");

const log = createLogger("API");

function setupApiRoutes(app, context, client, config) {
    const { Runtime } = client;
    const { cheatConfig, defaultConfig, startupCheats, injectorConfig, cdpPort } = config;

    app.get("/api/heartbeat", (req, res) => {
        res.json({ status: "online", timestamp: Date.now() });
    });

    app.get("/api/cheats", async (req, res) => {
        try {
            const suggestionsResult = await Runtime.evaluate({
                expression: `getAutoCompleteSuggestions()`,
                awaitPromise: true,
                returnByValue: true,
            });
            if (suggestionsResult.exceptionDetails) {
                log.error("Error getting autocomplete suggestions:", suggestionsResult.exceptionDetails.text);
                res.status(500).json({
                    error: "Failed to get cheats from game",
                    details: suggestionsResult.exceptionDetails.text,
                });
            } else {
                const allCheats = suggestionsResult.result.value || [];

                const EXCLUDED_PREFIXES = [
                    "gga",
                    "ggk",
                    "cheats",
                    "list",
                    "search",
                    "chng",
                    "egga",
                    "eggk",
                    "chromedebug",
                ];
                const filteredCheats = allCheats.filter((c) => {
                    const cmd = c.value?.toLowerCase();
                    return !EXCLUDED_PREFIXES.some((prefix) => cmd === prefix || cmd?.startsWith(prefix + " "));
                });

                res.json(filteredCheats);
            }
        } catch (apiError) {
            log.error("Error in /api/cheats:", apiError);
            res.status(500).json({ error: "Internal server error while fetching cheats" });
        }
    });

    app.post("/api/toggle", async (req, res) => {
        const { action } = await req.json();
        if (!action) {
            return res.status(400).json({ error: "Missing action parameter" });
        }
        try {
            const cheatResponse = await Runtime.evaluate({
                expression: `cheat.call(${context}, '${action}')`,
                awaitPromise: true,
                allowUnsafeEvalBlockedByCSP: true,
            });
            if (cheatResponse.exceptionDetails) {
                log.error(`Error executing cheat '${action}':`, cheatResponse.exceptionDetails.text);
                res.status(500).json({
                    error: `Failed to execute cheat '${action}'`,
                    details: cheatResponse.exceptionDetails.text,
                });
            } else {
                log.debug(`Executed: ${action} -> ${cheatResponse.result.value}`);
                res.json({ result: cheatResponse.result.value });
                broadcastCheatStates();
            }
        } catch (apiError) {
            log.error(`Error executing cheat '${action}':`, apiError);
            res.status(500).json({ error: `Internal server error while executing cheat '${action}'` });
        }
    });

    app.get("/api/devtools-url", async (req, res) => {
        try {
            const response = await client.Target.getTargetInfo();
            if (response && response.targetInfo && response.targetInfo.targetId) {
                const targetId = response.targetInfo.targetId;
                const devtoolsUrl = `http://localhost:${cdpPort}/devtools/inspector.html?ws=localhost:${cdpPort}/devtools/page/${targetId}`;
                log.debug(`Generated DevTools URL: ${devtoolsUrl}`);
                res.json({ url: devtoolsUrl });
            } else {
                log.error("Could not get target info to generate DevTools URL");
                res.status(500).json({ error: "Failed to get target information from CDP client" });
            }
        } catch (apiError) {
            log.error("Error getting DevTools URL:", apiError);
            res.status(500).json({
                error: "Internal server error while fetching DevTools URL",
                details: apiError.message,
            });
        }
    });

    app.get("/api/config", (req, res) => {
        try {
            const serializableCheatConfig = prepareConfigForJson(cheatConfig);

            let serializableDefaultConfig = {};
            if (defaultConfig) {
                serializableDefaultConfig = prepareConfigForJson(defaultConfig);
            }

            res.json({
                startupCheats: startupCheats,
                cheatConfig: serializableCheatConfig,
                injectorConfig: injectorConfig,
                defaultConfig: serializableDefaultConfig,
            });
        } catch (error) {
            log.error("Error preparing full config for JSON:", error);
            res.status(500).json({ error: "Internal server error while preparing configuration" });
        }
    });

    app.post("/api/config/update", async (req, res) => {
        const receivedFullConfig = await req.json();

        if (!receivedFullConfig || typeof receivedFullConfig !== "object") {
            return res.status(400).json({ error: "Invalid configuration data received" });
        }

        try {
            if (receivedFullConfig.cheatConfig) {
                const parsedCheatConfig = parseConfigFromJson(receivedFullConfig.cheatConfig);
                deepMerge(cheatConfig, parsedCheatConfig);
            }

            if (Array.isArray(receivedFullConfig.startupCheats)) {
                startupCheats.length = 0;
                startupCheats.push(...receivedFullConfig.startupCheats);
            }

            if (receivedFullConfig.injectorConfig) {
                deepMerge(injectorConfig, receivedFullConfig.injectorConfig);
            }

            const parsedCheatConfig = receivedFullConfig.cheatConfig
                ? parseConfigFromJson(receivedFullConfig.cheatConfig)
                : cheatConfig;

            const contextExistsResult = await Runtime.evaluate({ expression: `!!(${context})` });
            if (!contextExistsResult?.result?.value) {
                return res.status(200).json({
                    message: "Configuration updated on server, but failed to apply in game (context lost)",
                });
            }

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
                allowUnsafeEvalBlockedByCSP: true,
            });

            if (updateResult.exceptionDetails) {
                return res.status(200).json({
                    message: "Configuration updated on server, but failed to apply in game",
                    details: updateResult.exceptionDetails.text,
                });
            }

            const gameUpdateDetails = updateResult.result.value;
            if (String(gameUpdateDetails).startsWith("Error:")) {
                return res.status(200).json({
                    message: "Configuration updated on server, but failed to apply in game",
                    details: gameUpdateDetails,
                });
            }

            res.json({ message: "Configuration updated successfully", details: gameUpdateDetails });
        } catch (apiError) {
            log.error("Error in /api/config/update:", apiError);
            res.status(500).json({
                error: "Internal server error while updating configuration",
                details: apiError.message,
            });
        }
    });

    app.get("/api/cheat-states", async (req, res) => {
        try {
            const statesResult = await Runtime.evaluate({
                expression: `cheatStateList()`,
                awaitPromise: true,
                returnByValue: true,
            });

            if (statesResult.exceptionDetails) {
                res.status(500).json({
                    error: "Failed to get cheat states from game",
                    details: statesResult.exceptionDetails.text,
                });
            } else {
                res.json({ data: statesResult.result.value || {} });
            }
        } catch (apiError) {
            log.error("Error in /api/cheat-states:", apiError);
            res.status(500).json({
                error: "Internal server error while fetching cheat states",
                details: apiError.message,
            });
        }
    });

    app.get("/api/options-account", async (req, res) => {
        try {
            const optionsResult = await Runtime.evaluate({
                expression: `getOptionsListAccount()`,
                awaitPromise: true,
                returnByValue: true,
            });

            if (optionsResult.exceptionDetails) {
                res.status(500).json({
                    error: "Failed to get OptionsListAccount from game",
                    details: optionsResult.exceptionDetails.text,
                });
            } else {
                let data = optionsResult.result.value;

                if (data && typeof data === "object" && !Array.isArray(data)) {
                    data = Object.assign([], data);
                }

                if (data === null) {
                    res.status(500).json({ error: "OptionsListAccount not found in game context" });
                } else {
                    res.json({ data: data });
                }
            }
        } catch (apiError) {
            log.error("Error in /api/options-account:", apiError);
            res.status(500).json({
                error: "Internal server error while fetching OptionsListAccount",
                details: apiError.message,
            });
        }
    });

    app.post("/api/options-account/index", async (req, res) => {
        const { index, value } = await req.json();

        if (index === undefined || value === undefined) {
            return res.status(400).json({ error: "Missing required parameters: index and value" });
        }

        if (typeof index !== "number" || index < 0) {
            return res.status(400).json({ error: "Invalid index. Must be a non-negative number" });
        }

        try {
            let serializedValue;
            if (typeof value === "object" && value !== null && !Array.isArray(value)) serializedValue = objToString(value);
            else serializedValue = JSON.stringify(value);

            const updateExpression = `setOptionsListAccountIndex(${index}, ${serializedValue})`;

            const updateResult = await Runtime.evaluate({
                expression: updateExpression,
                awaitPromise: true,
                allowUnsafeEvalBlockedByCSP: true,
            });

            if (updateResult.exceptionDetails) {
                res.status(500).json({
                    error: `Failed to update OptionsListAccount[${index}] in game`,
                    details: updateResult.exceptionDetails.text,
                });
            } else {
                const result = updateResult.result.value;
                if (result !== undefined) res.json({ message: `Index ${index} updated successfully`, value: value });
                else res.status(500).json({ error: `Failed to update OptionsListAccount[${index}] in game context` });
            }
        } catch (apiError) {
            log.error("Error in /api/options-account/index POST:", apiError);
            res.status(500).json({
                error: "Internal server error while updating OptionsListAccount index",
                details: apiError.message,
            });
        }
    });

    app.post("/api/config/save", async (req, res) => {
        const receivedFullConfig = await req.json();

        if (
            !receivedFullConfig ||
            typeof receivedFullConfig !== "object" ||
            !receivedFullConfig.cheatConfig ||
            !Array.isArray(receivedFullConfig.startupCheats)
        ) {
            return res.status(400).json({
                error: "Invalid configuration data received for saving. Expected { startupCheats: [...], cheatConfig: {...} }",
            });
        }

        try {
            const uiCheatConfigRaw = receivedFullConfig.cheatConfig || cheatConfig;
            const uiStartupCheats = receivedFullConfig.startupCheats || startupCheats;
            const uiInjectorConfig = receivedFullConfig.injectorConfig || injectorConfig;

            let parsedUiCheatConfig = parseConfigFromJson(uiCheatConfigRaw);

            if (defaultConfig?.cheatConfig) {
                parsedUiCheatConfig = filterByTemplate(parsedUiCheatConfig, defaultConfig.cheatConfig) || {};
            }

            let filteredInjectorConfig = uiInjectorConfig;
            if (defaultConfig?.injectorConfig) {
                filteredInjectorConfig = filterByTemplate(uiInjectorConfig, defaultConfig.injectorConfig) || {};
            }

            const cheatConfigDiff = getDeepDiff(parsedUiCheatConfig, defaultConfig?.cheatConfig) || {};
            const injectorConfigDiff = getDeepDiff(filteredInjectorConfig, defaultConfig?.injectorConfig) || {};
            const startupCheatsDiff =
                JSON.stringify(uiStartupCheats) !== JSON.stringify(defaultConfig?.startupCheats) ? uiStartupCheats : [];

            const new_injectorConfig = objToString(injectorConfigDiff).replaceAll("\\", "\\\\");

            const fileContentString = `
/****************************************************************************************************
 * This file is generated by the Idleon Cheat Injector UI.
 * Only user overrides are saved here - defaults are inherited from config.js.
 * Manual edits might be overwritten when saving from the UI.
 ****************************************************************************************************/

exports.startupCheats = ${JSON.stringify(startupCheatsDiff, null, "\t")};

exports.cheatConfig = ${objToString(cheatConfigDiff)};

exports.injectorConfig = ${new_injectorConfig};
`;
            const savePath = getRuntimePath("config.custom.js");

            await fs.writeFile(savePath, fileContentString.trim());
            log.info(`Configuration saved to ${savePath}`);

            if (uiStartupCheats) {
                startupCheats.length = 0;
                startupCheats.push(...uiStartupCheats);
            }
            if (parsedUiCheatConfig) deepMerge(cheatConfig, parsedUiCheatConfig);
            if (filteredInjectorConfig) deepMerge(injectorConfig, filteredInjectorConfig);

            res.json({ message: "Configuration successfully saved to config.custom.js" });
        } catch (apiError) {
            log.error("Error in /api/config/save:", apiError);
            res.status(500).json({
                error: "Internal server error while saving configuration file",
                details: apiError.message,
            });
        }
    });

    app.get("/api/search/keys", async (req, res) => {
        try {
            const keysResult = await Runtime.evaluate({
                expression: `getGgaKeys()`,
                awaitPromise: true,
                returnByValue: true,
            });

            if (keysResult.exceptionDetails) {
                res.status(500).json({
                    error: "Failed to get GGA keys from game",
                    details: keysResult.exceptionDetails.text,
                });
            } else {
                res.json({ keys: keysResult.result.value || [] });
            }
        } catch (apiError) {
            log.error("Error in /api/search/keys:", apiError);
            res.status(500).json({ error: "Internal server error while fetching GGA keys" });
        }
    });

    // Fixed: empty string query handled here (no dependency on injected search.js)
    app.post("/api/search", async (req, res) => {
        const { query, keys, withinPaths } = await req.json();

        const qStr = typeof query === "string" ? query : "";
        const isEmptyQuery = qStr.trim() === "";

        const hasKeys = Array.isArray(keys) && keys.length > 0;
        const hasWithinPaths = Array.isArray(withinPaths) && withinPaths.length > 0;

        if (typeof query !== "string" || (!hasKeys && !hasWithinPaths)) {
            return res.status(400).json({
                error: "Missing required parameters: query (string) and either keys (array) or withinPaths (array)",
            });
        }

        try {
            const keysJson = JSON.stringify(hasKeys ? keys : []);
            const withinPathsJson = hasWithinPaths ? JSON.stringify(withinPaths) : "null";

            if (isEmptyQuery) {
                const expr = `
(() => {
  const keys = ${keysJson};
  const withinPaths = ${withinPathsJson};

  const ggaRoot =
    (typeof bEngine !== "undefined" && bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h)
      ? bEngine.gameAttributes.h
      : null;

  if (!ggaRoot) return { results: [], totalCount: 0 };

  const results = [];
  const seen = new Set();

  const isPrimitive = (v) =>
    v === null || v === undefined || typeof v === "number" || typeof v === "string" || typeof v === "boolean";

  const formatValue = (v) => {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "string") {
      const s = v.length > 100 ? (v.slice(0, 100) + "...") : v;
      return JSON.stringify(s);
    }
    if (typeof v === "object") return "[object]";
    return String(v);
  };

  const splitPath = (p) => {
    if (typeof p !== "string" || !p) return [];
    const parts = [];
    let buf = "";
    let i = 0;
    const flush = () => {
      const t = buf.trim();
      if (t) parts.push(t);
      buf = "";
    };
    while (i < p.length) {
      const ch = p[i];
      if (ch === ".") { flush(); i += 1; continue; }
      if (ch === "[") {
        flush();
        const end = p.indexOf("]", i);
        if (end === -1) { buf += ch; i += 1; continue; }
        let inside = p.slice(i + 1, end).trim();
        if ((inside.startsWith('"') && inside.endsWith('"')) || (inside.startsWith("'") && inside.endsWith("'"))) {
          inside = inside.slice(1, -1);
        }
        if (inside) parts.push(inside);
        i = end + 1;
        continue;
      }
      buf += ch; i += 1;
    }
    flush();
    return parts;
  };

  const getValueAtPath = (root, p) => {
    const parts = splitPath(p);
    let cur = root;
    for (const k of parts) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[k];
    }
    return cur;
  };

  const pushResult = (path, val) => {
    if (!isPrimitive(val)) return;
    if (seen.has(path)) return;
    seen.add(path);
    results.push({
      path,
      value: val,
      formattedValue: formatValue(val),
      type: (val === null ? "object" : typeof val)
    });
  };

  if (Array.isArray(withinPaths) && withinPaths.length) {
    for (const p of withinPaths) {
      if (typeof p !== "string" || !p) continue;
      pushResult(p, getValueAtPath(ggaRoot, p));
    }
    return { results, totalCount: results.length };
  }

  const safeIdent = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  const joinKey = (base, key) => {
    const ks = String(key);
    if (/^\\d+$/.test(ks)) return base + "[" + ks + "]";
    if (safeIdent.test(ks)) return base ? (base + "." + ks) : ks;
    return base + "[" + JSON.stringify(ks) + "]";
  };

  const stack = [];
  for (const k of keys) {
    if (typeof k !== "string" || !k) continue;
    if (!(k in ggaRoot)) continue;
    stack.push({ path: k, val: ggaRoot[k] });
  }

  while (stack.length) {
    const { path, val } = stack.pop();

    if (isPrimitive(val)) {
      pushResult(path, val);
      continue;
    }

    if (typeof val === "object" && val !== null) {
      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          stack.push({ path: path + "[" + i + "]", val: val[i] });
        }
      } else {
        const ks = Object.keys(val);
        for (let i = 0; i < ks.length; i++) {
          const childKey = ks[i];
          stack.push({ path: joinKey(path, childKey), val: val[childKey] });
        }
      }
    }
  }

  return { results, totalCount: results.length };
})()
                `;

                const r = await Runtime.evaluate({
                    expression: expr,
                    awaitPromise: true,
                    returnByValue: true,
                    allowUnsafeEvalBlockedByCSP: true,
                });

                if (r.exceptionDetails) {
                    const detail = r.exceptionDetails.text || r.exceptionDetails.exception?.description || "Unknown";
                    log.error("Error searching GGA (match-all):", detail);
                    return res.status(500).json({ error: "Failed to search GGA (match-all)", details: detail });
                }

                return res.json(r.result.value || { results: [], totalCount: 0 });
            }

            const escapedQuery = String(qStr).replace(/\\/g, "\\\\").replace(/'/g, "\\'");

            const searchResult = await Runtime.evaluate({
                expression: `searchGga('${escapedQuery}', ${keysJson}, ${withinPathsJson})`,
                awaitPromise: true,
                returnByValue: true,
                allowUnsafeEvalBlockedByCSP: true,
            });

            if (searchResult.exceptionDetails) {
                log.error("Error searching GGA:", searchResult.exceptionDetails.text);
                return res.status(500).json({
                    error: "Failed to search GGA",
                    details: searchResult.exceptionDetails.text,
                });
            }

            return res.json(searchResult.result.value || { results: [], totalCount: 0 });
        } catch (apiError) {
            log.error("Error in /api/search:", apiError);
            return res.status(500).json({ error: "Internal server error while searching GGA" });
        }
    });

    // /api/search/set (unchanged)
    app.post("/api/search/set", async (req, res) => {
        const { path, value } = await req.json();

        if (typeof path !== "string" || path.trim() === "" || typeof value !== "string") {
            return res.status(400).json({
                error: "Missing required parameters: path (string) and value (string)",
            });
        }

        try {
            const pathJson = JSON.stringify(path);
            const valueJson = JSON.stringify(value);

            const setExpression = `
(() => {
  const path = ${pathJson};
  const raw = ${valueJson};

  try {
    if (typeof setGgaValue === "function") return setGgaValue(path, raw);
  } catch (e) {}

  const gga = (typeof bEngine !== "undefined" && bEngine && bEngine.gameAttributes && bEngine.gameAttributes.h)
    ? bEngine.gameAttributes.h
    : null;

  if (!gga) return { success: false, path, error: "GGA not available" };

  const splitPath = (p) => {
    if (typeof p !== "string" || !p) return [];
    const parts = [];
    let buf = "";
    let i = 0;
    const flush = () => {
      const t = buf.trim();
      if (t) parts.push(t);
      buf = "";
    };
    while (i < p.length) {
      const ch = p[i];
      if (ch === ".") { flush(); i += 1; continue; }
      if (ch === "[") {
        flush();
        const end = p.indexOf("]", i);
        if (end === -1) { buf += ch; i += 1; continue; }
        let inside = p.slice(i + 1, end).trim();
        if ((inside.startsWith('"') && inside.endsWith('"')) || (inside.startsWith("'") && inside.endsWith("'"))) {
          inside = inside.slice(1, -1);
        }
        if (inside) parts.push(inside);
        i = end + 1;
        continue;
      }
      buf += ch;
      i += 1;
    }
    flush();
    return parts;
  };

  const getValueAtPath = (root, p) => {
    const parts = splitPath(p);
    let cur = root;
    for (const k of parts) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[k];
    }
    return cur;
  };

  const getParentAndKey = (root, p) => {
    const parts = splitPath(p);
    if (parts.length === 0) return null;
    const key = parts[parts.length - 1];
    let parent = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (parent === null || parent === undefined) return null;
      parent = parent[parts[i]];
    }
    if (parent === null || parent === undefined) return null;
    return { parent, key };
  };

  const formatValue = (v) => {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "string") {
      const maxLen = 100;
      const s = v.length > maxLen ? v.substring(0, maxLen) + "..." : v;
      return JSON.stringify(s);
    }
    if (typeof v === "object") return "[object]";
    return String(v);
  };

  const cur = getValueAtPath(gga, path);

  if (typeof cur === "object" && cur !== null) {
    return { success: false, path, error: "This value is an object/array and cannot be edited here" };
  }

  const expectedType = (cur === null) ? "null" : typeof cur;

  const trimmed = (typeof raw === "string") ? raw.trim() : "";
  let parsed;

  if (expectedType === "number") {
    const n = Number(trimmed);
    if (trimmed === "" || Number.isNaN(n)) return { success: false, path, error: "Value must be a valid number" };
    parsed = n;
  } else if (expectedType === "boolean") {
    const low = trimmed.toLowerCase();
    if (low === "true") parsed = true;
    else if (low === "false") parsed = false;
    else return { success: false, path, error: 'Value must be "true" or "false"' };
  } else if (expectedType === "null") {
    if (trimmed.toLowerCase() !== "null") return { success: false, path, error: 'Value must be "null"' };
    parsed = null;
  } else if (expectedType === "undefined") {
    if (trimmed.toLowerCase() !== "undefined") return { success: false, path, error: 'Value must be "undefined"' };
    parsed = undefined;
  } else if (expectedType === "string") {
    let s = raw;
    if (typeof s === "string" && s.length >= 2) {
      const a = s[0], b = s[s.length - 1];
      if ((a === '"' && b === '"') || (a === "'" && b === "'")) s = s.slice(1, -1);
    }
    parsed = String(s);
  } else {
    return { success: false, path, error: "Unsupported type" };
  }

  const target = getParentAndKey(gga, path);
  if (!target) return { success: false, path, error: "Path not found" };

  try {
    target.parent[target.key] = parsed;
  } catch (e) {
    return { success: false, path, error: "Failed to set value at path" };
  }

  return {
    success: true,
    path,
    type: (parsed === null) ? "object" : typeof parsed,
    formattedValue: formatValue(parsed),
  };
})()
            `;

            const setResult = await Runtime.evaluate({
                expression: setExpression,
                awaitPromise: true,
                returnByValue: true,
                allowUnsafeEvalBlockedByCSP: true,
            });

            if (setResult.exceptionDetails) {
                return res.status(500).json({
                    error: "Failed to set GGA value",
                    details: setResult.exceptionDetails.text,
                });
            }

            const data = setResult.result.value || { success: false, error: "No response from game context" };

            if (data && data.success === false) {
                return res.status(400).json({ error: data.error || "Failed to set value" });
            }

            return res.json(data);
        } catch (apiError) {
            log.error("Error in /api/search/set:", apiError);
            return res.status(500).json({ error: "Internal server error while setting GGA value" });
        }
    });

    app.post("/api/open-url", async (req, res) => {
        const { url } = await req.json();
        if (!url) {
            return res.status(400).json({ error: "Missing url parameter" });
        }

        const command =
            process.platform === "win32"
                ? `start "" "${url}"`
                : process.platform === "darwin"
                  ? `open "${url}"`
                  : `xdg-open "${url}"`;

        exec(command, (error) => {
            if (error) {
                log.error(`Failed to open URL: ${url}`, error);
                return res.status(500).json({ error: "Failed to open URL", details: error.message });
            }
            res.json({ message: "URL opened successfully" });
        });
    });
}

module.exports = {
    setupApiRoutes,
};
