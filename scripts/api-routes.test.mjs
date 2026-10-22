import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const TinyRouter = require("../src/modules/server/tinyRouter");
const { createUpdater } = require("../src/modules/updateService");
const { setupApiRoutes } = require("../src/modules/server/apiRoutes");
const { setupGameRoutes } = require("../src/modules/server/routes/game");
const { setupConfigRoutes } = require("../src/modules/server/routes/config");
const { setupSearchRoutes } = require("../src/modules/server/routes/search");
const { setupCheatRoutes } = require("../src/modules/server/routes/cheats");

async function request(router, method, url, body = {}) {
    const response = {
        statusCode: 200,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(value) {
            this.body = JSON.parse(JSON.stringify(value));
            return this;
        },
    };
    const handler = router.routes[method].get(url.split("?")[0]);
    assert.equal(typeof handler, "function", `${method} ${url} must be registered`);
    await handler({ url, headers: { host: "localhost" }, json: async () => body }, response);
    return response;
}

test("API setup retains every endpoint and does not evaluate the game during registration", () => {
    const router = new TinyRouter();
    setupApiRoutes(router, "window.fixture", { Runtime: {} }, {});
    const actual = Object.entries(router.routes).flatMap(([method, routes]) =>
        [...routes.keys()].map((url) => `${method} ${url}`)
    );
    assert.deepEqual(
        actual.sort(),
        [
            "GET /api/app-info",
            "GET /api/cheat-states",
            "GET /api/cheats",
            "GET /api/config",
            "GET /api/devtools-url",
            "GET /api/game/bundles",
            "GET /api/heartbeat",
            "GET /api/search/keys",
            "GET /api/update/check",
            "POST /api/config/save",
            "POST /api/config/update",
            "POST /api/game/computed/read",
            "POST /api/game/computed/read-many",
            "POST /api/game/gga/delete",
            "POST /api/game/gga/read",
            "POST /api/game/gga/read-entries",
            "POST /api/game/gga/read-many",
            "POST /api/game/gga/write",
            "POST /api/game/gga/write-many",
            "POST /api/open-url",
            "POST /api/search",
            "POST /api/toggle",
            "POST /api/update/apply",
        ].sort()
    );
});

test("API groups use the configured game bridge for reads and configuration updates", async () => {
    const router = new TinyRouter();
    const calls = [];
    const client = {
        Runtime: {
            evaluate: async (options) => {
                calls.push(options);
                if (options.expression.startsWith("readGamePath(")) return { result: { value: { value: 7 } } };
                if (options.expression === "!!(window.fixture)") return { result: { value: true } };
                return { result: { value: "Config updated in game." } };
            },
        },
    };
    setupApiRoutes(router, "window.fixture", client, { cheatConfig: {}, startupCheats: [], injectorConfig: {} });
    const read = await request(router, "POST", "/api/game/gga/read", { path: "Lv0[0]" });
    assert.deepEqual(read.body, { value: 7 });
    const updated = await request(router, "POST", "/api/config/update", { cheatConfig: { enabled: true } });
    assert.equal(updated.body.message, "Configuration updated successfully");
    assert.equal(calls[0].expression, 'readGamePath("Lv0[0]")');
    assert.equal(calls[1].expression, "!!(window.fixture)");
    assert.match(calls[2].expression, /updateCheatConfig\(/);
    assert.equal(calls[2].allowUnsafeEvalBlockedByCSP, true);
});

test("game routes preserve Haxe array normalization, batch failures, and write validation", async () => {
    const router = new TinyRouter();
    const calls = [];
    const results = [
        { value: { value: { 0: "oak", 1: "copper" } } },
        {
            value: {
                results: [
                    { ok: true, value: { 0: 7 } },
                    { ok: false, error: "missing" },
                ],
            },
        },
        { value: { ok: false, results: [{ ok: true }, { ok: false, error: "read-only" }] } },
    ];
    setupGameRoutes(router, {
        callHelper: async (...args) => {
            calls.push(args);
            return results.shift();
        },
    });
    const read = await request(router, "POST", "/api/game/gga/read", { path: "Inventory" });
    assert.deepEqual(read.body, { value: ["oak", "copper"] });
    const batchRead = await request(router, "POST", "/api/game/gga/read-many", { paths: ["Lv0", "missing"] });
    assert.deepEqual(batchRead.body, {
        results: [
            { ok: true, value: [7] },
            { ok: false, error: "missing" },
        ],
    });
    const invalid = await request(router, "POST", "/api/game/gga/write-many", { writes: [{ path: "Lv0" }] });
    assert.equal(invalid.statusCode, 400);
    assert.equal(calls.length, 2);
    const writes = [
        { path: "Lv0[0]", value: 0 },
        { path: "Lv0[1]", value: -1 },
    ];
    const batchWrite = await request(router, "POST", "/api/game/gga/write-many", { writes });
    assert.deepEqual(batchWrite.body, { ok: false, results: [{ ok: true }, { ok: false, error: "read-only" }] });
    assert.deepEqual(calls, [
        ["readGamePath", ["Inventory"]],
        ["readGamePaths", [["Lv0", "missing"]]],
        ["writeGamePaths", [writes]],
    ]);
});

test("configuration routes share live objects and retain server updates when game context is lost", async () => {
    const router = new TinyRouter();
    const cheatConfig = { nested: { retained: true, amount: 1 } };
    const startupCheats = ["old"];
    const injectorConfig = { target: "steam", retained: true };
    setupConfigRoutes(router, { isAttached: async () => false }, { cheatConfig, startupCheats, injectorConfig });
    const updated = await request(router, "POST", "/api/config/update", {
        cheatConfig: { nested: { amount: 0 } },
        startupCheats: ["new"],
        injectorConfig: { target: "web" },
    });
    assert.equal(updated.statusCode, 200);
    assert.match(updated.body.message, /context lost/);
    assert.deepEqual(cheatConfig, { nested: { retained: true, amount: 0 } });
    assert.deepEqual(startupCheats, ["new"]);
    assert.deepEqual(injectorConfig, { target: "web", retained: true });
    const loaded = await request(router, "GET", "/api/config");
    assert.deepEqual(loaded.body.cheatConfig, cheatConfig);
    assert.deepEqual(loaded.body.startupCheats, startupCheats);
    assert.deepEqual(loaded.body.injectorConfig, injectorConfig);
});

test("search and cheat routes retain helper arguments and suggestion filtering", async () => {
    const router = new TinyRouter();
    const calls = [];
    const bridge = {
        callHelper: async (...args) => {
            calls.push(args);
            if (args[0] === "getAutoCompleteSuggestions") {
                return { value: [{ value: "gga Money" }, { value: "class warrior" }, { value: "cheats" }] };
            }
            return { value: { results: [], totalCount: 0 } };
        },
    };
    setupCheatRoutes(router, bridge);
    setupSearchRoutes(router, bridge);
    const cheats = await request(router, "GET", "/api/cheats");
    assert.deepEqual(cheats.body, [{ value: "class warrior" }]);
    const invalid = await request(router, "POST", "/api/search", { query: 0 });
    assert.equal(invalid.statusCode, 400);
    assert.equal(calls.length, 1);
    await request(router, "POST", "/api/search", { query: "0", withinPaths: ["Lv0"], compare: "equals" });
    assert.deepEqual(calls[1], ["searchGga", ["0", undefined, { withinPaths: ["Lv0"], compare: "equals" }]]);
});

function updateFixture() {
    const events = [];
    const timers = [];
    const client = {};
    const injectorConfig = { target: "web" };
    const prepared = { scriptPath: "fixture-update", updatedFileNames: "fixture.exe" };
    const updateInfo = { updateAvailable: true, latestVersion: "99.0.0" };
    let checks = 0;
    const dependencies = {
        "../../updateService": {
            createUpdater: () =>
                createUpdater({
                    checkRelease: async () => {
                        checks++;
                        return updateInfo;
                    },
                    prepareRelease: async (info) => {
                        assert.equal(info, updateInfo);
                        events.push("prepare");
                        return prepared;
                    },
                    applyPrepared: async (...args) => {
                        events.push("apply");
                        assert.equal(args[0], client);
                        assert.equal(args[1].injectorConfig, injectorConfig);
                        assert.equal(args[2], prepared);
                    },
                }),
        },
        "../../../../package.json": { version: "1.0.0" },
        "../../utils/logger": { createLogger: () => ({ error() {} }) },
    };
    const module = { exports: {} };
    vm.runInNewContext(readFileSync(new URL("../src/modules/server/routes/updates.js", import.meta.url), "utf8"), {
        module,
        require: (name) => {
            assert.ok(name in dependencies);
            return dependencies[name];
        },
        process: { pkg: true, exit: () => assert.fail("fixture must not exit") },
        URL,
        Date,
        setTimeout: (callback, delay) => {
            assert.equal(delay, 250);
            timers.push(callback);
        },
    });
    const router = new TinyRouter();
    module.exports.setupUpdateRoutes(router, client, injectorConfig);
    return {
        router,
        events,
        timers,
        get checks() {
            return checks;
        },
    };
}

test("update routes coalesce checks, cache results, and allow forced refresh", async () => {
    const fixture = updateFixture();
    await Promise.all([
        request(fixture.router, "GET", "/api/update/check"),
        request(fixture.router, "GET", "/api/update/check"),
    ]);
    assert.equal(fixture.checks, 1);
    await request(fixture.router, "GET", "/api/update/check");
    assert.equal(fixture.checks, 1);
    const refreshed = await request(fixture.router, "GET", "/api/update/check?force=1");
    assert.equal(fixture.checks, 2);
    assert.equal(refreshed.body.latestVersion, "99.0.0");
});

test("update apply prepares and responds before the deferred shutdown handoff", async () => {
    const fixture = updateFixture();
    const response = await request(fixture.router, "POST", "/api/update/apply");
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.updatedFileNames, "fixture.exe");
    assert.deepEqual(fixture.events, ["prepare"]);
    assert.equal(fixture.timers.length, 1);
    fixture.timers[0]();
    assert.deepEqual(fixture.events, ["prepare", "apply"]);
});
