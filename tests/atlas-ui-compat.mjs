import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, URL } from "node:url";

const workspaceUtilsSource = await readFile(
    new URL("../src/ui/components/views/search/workspaceUtils.js", import.meta.url),
    "utf8"
);
const { loadLocalFavoriteKeys, pickInitialSelectedKeys, saveLocalFavoriteKeys } = await import(
    `data:text/javascript,${encodeURIComponent(workspaceUtilsSource)}`
);
const themeSource = await readFile(new URL("../src/ui/state/theme.js", import.meta.url), "utf8");
const { applyTheme, loadThemePreference, normalizeTheme, saveThemePreference } = await import(
    `data:text/javascript,${encodeURIComponent(themeSource)}`
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

test("Theme preferences default to dark and persist valid selections", () => {
    const storage = createStorage();
    const root = { dataset: {} };

    assert.equal(loadThemePreference(storage), "dark");
    assert.equal(normalizeTheme("unknown"), "dark");
    assert.equal(applyTheme("light", root), "light");
    assert.equal(root.dataset.theme, "light");

    assert.equal(saveThemePreference("system", storage, root), "system");
    assert.equal(storage.value("uiTheme"), "system");
    assert.equal(root.dataset.theme, "system");
});

const collectSourceFiles = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
        entries.map((entry) => {
            const entryPath = path.join(directory, entry.name);
            return entry.isDirectory() ? collectSourceFiles(entryPath) : [entryPath];
        })
    );
    return files.flat();
};

test("UI source keeps the Chromium 87 compatibility floor", async () => {
    const uiRoot = fileURLToPath(new URL("../src/ui", import.meta.url));
    const sourceFiles = (await collectSourceFiles(uiRoot)).filter(
        (file) => !file.includes(`${path.sep}vendor${path.sep}`) && [".css", ".js"].includes(path.extname(file))
    );
    const unsupportedPatterns = [
        [/:is\(/, "CSS :is()"],
        [/\.findLast(?:Index)?\(/, "Array findLast/findLastIndex"],
        [/\.at\(/, "Array/String at()"],
        [/\bstructuredClone\(/, "structuredClone()"],
        [/\bObject\.hasOwn\(/, "Object.hasOwn()"],
    ];

    for (const file of sourceFiles) {
        const source = await readFile(file, "utf8");
        for (const [pattern, label] of unsupportedPatterns) {
            assert.doesNotMatch(source, pattern, `${label} is not supported by Chromium 87: ${file}`);
        }
    }
});
