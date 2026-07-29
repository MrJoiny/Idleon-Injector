import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

const workspaceUtilsSource = await readFile(
    new URL("../src/ui/components/views/search/workspaceUtils.js", import.meta.url),
    "utf8"
);
const { loadLocalFavoriteKeys, pickInitialSelectedKeys, saveLocalFavoriteKeys } = await import(
    `data:text/javascript,${encodeURIComponent(workspaceUtilsSource)}`
);

const createStorage = (initial = {}) => {
    const values = new Map(Object.entries(initial));
    return {
        getItem: (key) => (values.has(key) ? values.get(key) : null),
        setItem: (key, value) => values.set(key, String(value)),
        value: (key) => values.get(key),
    };
};

test("Search favorites preserve unset, empty, and custom storage states", () => {
    const unsetStorage = createStorage();
    globalThis.localStorage = unsetStorage;
    assert.equal(loadLocalFavoriteKeys(), null);

    const emptyStorage = createStorage({ searchFavoriteKeys: "[]" });
    globalThis.localStorage = emptyStorage;
    assert.deepEqual(loadLocalFavoriteKeys(), []);

    const customStorage = createStorage();
    globalThis.localStorage = customStorage;
    saveLocalFavoriteKeys(["PlayerDATABASE", "PlayerDATABASE", "SkillLevels"]);
    assert.equal(customStorage.value("searchFavoriteKeys"), '["PlayerDATABASE","SkillLevels"]');
});

test("Search selection fallback prefers persisted keys, then favorites", () => {
    const all = ["A", "B", "C", "D"];
    assert.deepEqual(pickInitialSelectedKeys(all, ["D"], ["B", "C"]), ["D"]);
    assert.deepEqual(pickInitialSelectedKeys(all, [], ["C", "missing", "B"]), ["C", "B"]);
    assert.deepEqual(pickInitialSelectedKeys(all, [], []), all);
});
