import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { test } from "node:test";
const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/modules/config/configManager.js", import.meta.url), "utf8");
function fixture() {
    const files = new Map();
    let fail = false;
    files.set(
        "config.custom.js",
        'exports.startupCheats=["wide autoloot"];exports.cheatConfig={test:5};exports.injectorConfig={target:"steam",gameExePath:"D:/game.exe",devtoolsBrowserPath:"C:/Opera/opera.exe"};exports.wardrobeLoadouts={};'
    );
    function load() {
        const module = { exports: {} };
        vm.runInNewContext(source, {
            module,
            exports: module.exports,
            require: (id) => {
                if (id === "fs")
                    return {
                        promises: {
                            writeFile: async (p, text) => {
                                if (fail) throw new Error("disk full");
                                files.set(p, text);
                            },
                            rename: async (from, to) => {
                                files.set(to, files.get(from));
                                files.delete(from);
                            },
                            unlink: async (p) => files.delete(p),
                        },
                    };
                if (id === "../utils/runtimePaths") return { getRuntimePath: (p) => p };
                if (id === "../utils/logger") return { createLogger: () => ({ debug() {}, info() {}, error() {} }) };
                if (id === "config.js")
                    return { injectorConfig: { target: "steam" }, cheatConfig: { test: 1 }, startupCheats: [] };
                if (id === "config.custom.js") {
                    const exports = {};
                    vm.runInNewContext(files.get(id), { exports });
                    return exports;
                }
                if (id.startsWith("../utils/")) return require("../src/modules/utils/" + id.split("/").pop());
                return require(id);
            },
        });
        module.exports.loadConfiguration();
        return module.exports;
    }
    return { load, files, setFailure: (value) => (fail = value) };
}
test("saved loadouts survive restart and ordinary settings saves without losing launcher overrides", async () => {
    const f = fixture(),
        manager = f.load();
    const loadout = { id: "saved-test", version: 1, name: 'My "build"', equipment: ["Keep"] };
    await manager.saveConfiguration({ wardrobeChange: { id: loadout.id, loadout } });
    assert.deepEqual(Array.from(manager.getStartupCheats()), ["wide autoloot"]);
    await manager.saveConfiguration({
        startupCheats: ["wide autoloot"],
        cheatConfig: { test: 7 },
        injectorConfig: { target: "steam" },
    });
    const fresh = f.load();
    assert.equal(fresh.getWardrobeLoadouts()[loadout.id].name, loadout.name);
    assert.equal(fresh.getInjectorConfig().gameExePath, "D:/game.exe");
    assert.equal(fresh.getInjectorConfig().devtoolsBrowserPath, "C:/Opera/opera.exe");
    assert.equal(fresh.getCheatConfig().test, 7);
});
test("concurrent additions retain both loadouts; failed writes preserve disk and loaded state", async () => {
    const f = fixture(),
        manager = f.load();
    await Promise.all(
        ["saved-one", "saved-two"].map((id) =>
            manager.saveConfiguration({ wardrobeChange: { id, loadout: { id, version: 1, name: id } } })
        )
    );
    assert.equal(Object.keys(manager.getWardrobeLoadouts()).length, 2);
    const before = f.files.get("config.custom.js");
    f.setFailure(true);
    await assert.rejects(
        manager.saveConfiguration({ wardrobeChange: { id: "saved-one", loadout: null } }),
        /disk full/
    );
    assert.equal(f.files.get("config.custom.js"), before);
    assert.equal(Object.keys(manager.getWardrobeLoadouts()).length, 2);
    f.setFailure(false);
    await manager.saveConfiguration({ wardrobeChange: { id: "saved-one", loadout: null } });
    assert.deepEqual(Object.keys(manager.getWardrobeLoadouts()), ["saved-two"]);
});
