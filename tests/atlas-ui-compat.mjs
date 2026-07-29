import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => readFile(path.join(root, relativePath), "utf8");

const createStorage = (initial = {}) => {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key) => (values.has(key) ? values.get(key) : null),
        setItem: (key, value) => values.set(key, String(value)),
        value: (key) => values.get(key),
    };
};

const loadWorkspaceUtils = async (storage) => {
    globalThis.localStorage = storage;
    const source = await read("src/ui/components/views/search/workspaceUtils.js");
    const encoded = Buffer.from(source).toString("base64");
    return import(`data:text/javascript;base64,${encoded}#${Math.random()}`);
};

test("Search favorites preserve unset, empty, and custom storage states", async () => {
    const unsetStorage = createStorage();
    const unset = await loadWorkspaceUtils(unsetStorage);
    assert.equal(unset.loadLocalFavoriteKeys(), null);

    const emptyStorage = createStorage({ searchFavoriteKeys: "[]" });
    const empty = await loadWorkspaceUtils(emptyStorage);
    assert.deepEqual(empty.loadLocalFavoriteKeys(), []);

    const customStorage = createStorage();
    const custom = await loadWorkspaceUtils(customStorage);
    custom.saveLocalFavoriteKeys(["PlayerDATABASE", "PlayerDATABASE", "SkillLevels"]);
    assert.equal(customStorage.value("searchFavoriteKeys"), '["PlayerDATABASE","SkillLevels"]');
});

test("Search selection fallback prefers persisted keys, then favorites", async () => {
    const utils = await loadWorkspaceUtils(createStorage());
    const all = ["A", "B", "C", "D"];
    assert.deepEqual(utils.pickInitialSelectedKeys(all, ["D"], ["B", "C"]), ["D"]);
    assert.deepEqual(utils.pickInitialSelectedKeys(all, [], ["C", "missing", "B"]), ["C", "B"]);
    assert.deepEqual(utils.pickInitialSelectedKeys(all, [], []), all);
});

test("Atlas keeps immediate notifications and keyboard row selection", async () => {
    const [app, cheatItem] = await Promise.all([
        read("src/ui/components/App.js"),
        read("src/ui/components/CheatItem.js"),
    ]);

    assert.match(app, /import \{ Toast \} from "\.\/Toast\.js";/);
    assert.match(app, /Toast\(\)/);
    assert.match(cheatItem, /tabindex: "0"/);
    assert.match(cheatItem, /event\.key !== "Enter" && event\.key !== " "/);
});

test("Atlas exposes no inert controls or dead compatibility wrappers", async () => {
    const [header, sidebar] = await Promise.all([
        read("src/ui/components/AtlasHeader.js"),
        read("src/ui/components/Sidebar.js"),
    ]);

    assert.match(header, /disabled: \(\) => !store\.app\.updateInfo\?\.updateAvailable/);
    assert.doesNotMatch(sidebar, /atlas-shortcuts-button/);

    for (const relativePath of [
        "src/ui/components/NotificationHistory.js",
        "src/ui/components/views/Cheats.js",
        "src/ui/styles/_notificationHistory.css",
    ]) {
        await assert.rejects(access(path.join(root, relativePath)));
    }
});
