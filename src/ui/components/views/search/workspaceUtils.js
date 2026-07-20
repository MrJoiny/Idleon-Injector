const SEARCH_WORKSPACE_STORAGE_KEY = "searchWorkspace";
const SEARCH_WORKSPACE_VERSION = 2;
const SEARCH_FAVORITE_KEYS_STORAGE_KEY = "searchFavoriteKeys";
const DEFAULT_SELECTED_KEYS_LIMIT = 8;
const entryFilterTextCache = new WeakMap();

/** Dedupe an array down to non-empty unique strings. */
export function uniqueStrings(items) {
    return [...new Set((items || []).filter((item) => typeof item === "string" && item))];
}

/**
 * Load stored favorite keys.
 * @returns {string[]|null} `null` when never stored (caller applies curated
 *   defaults); an array — possibly empty — once the user has set favorites.
 */
export function loadLocalFavoriteKeys() {
    try {
        const raw = localStorage.getItem(SEARCH_FAVORITE_KEYS_STORAGE_KEY);
        if (raw === null) return null;
        return uniqueStrings(JSON.parse(raw));
    } catch (err) {
        console.error("[SearchWorkspace] Failed to load favorite keys:", err);
        return null;
    }
}

/** Persist favorite keys (an empty array is a deliberate, preserved state). */
export function saveLocalFavoriteKeys(keys) {
    try {
        localStorage.setItem(SEARCH_FAVORITE_KEYS_STORAGE_KEY, JSON.stringify(uniqueStrings(keys)));
    } catch (err) {
        console.error("[SearchWorkspace] Failed to save favorite keys:", err);
    }
}

export function normalizeSavedEntry(entry) {
    if (!entry || typeof entry !== "object" || typeof entry.path !== "string" || !entry.path) {
        return null;
    }

    const normalized = {
        path: entry.path,
        formattedValue: typeof entry.formattedValue === "string" ? entry.formattedValue : "",
        type: typeof entry.type === "string" ? entry.type : "undefined",
        monitorEnabled: entry.monitorEnabled !== false,
    };

    if (Object.prototype.hasOwnProperty.call(entry, "value")) {
        normalized.value = entry.value;
    }

    // Migrate legacy entries that cached the last live value in lastLive* fields.
    if (Object.prototype.hasOwnProperty.call(entry, "lastLiveRaw")) {
        normalized.value = entry.lastLiveRaw;
        if (typeof entry.lastLiveFormatted === "string") normalized.formattedValue = entry.lastLiveFormatted;
        if (typeof entry.lastLiveType === "string") normalized.type = entry.lastLiveType;
    }

    if (Array.isArray(entry.lastHistory)) {
        normalized.lastHistory = entry.lastHistory
            .filter((point) => point && typeof point === "object" && typeof point.ts === "number")
            .slice(0, 10)
            .map((point) => ({ value: point.value, ts: point.ts }));
    }

    return normalized;
}

export function loadSearchWorkspace() {
    try {
        const raw = localStorage.getItem(SEARCH_WORKSPACE_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (
            !parsed ||
            typeof parsed !== "object" ||
            (parsed.version !== SEARCH_WORKSPACE_VERSION && parsed.version !== 1)
        ) {
            return null;
        }

        const data = parsed.data;
        if (!data || typeof data !== "object") return null;

        return {
            selectedKeys: uniqueStrings(data.selectedKeys),
            savedResults: Array.isArray(data.savedResults)
                ? data.savedResults.map(normalizeSavedEntry).filter(Boolean)
                : [],
        };
    } catch (err) {
        console.error("[SearchWorkspace] Failed to load workspace:", err);
        return null;
    }
}

export function buildSearchWorkspace(ui) {
    return {
        selectedKeys: uniqueStrings(ui.selectedKeys),
        savedResults: (ui.savedResults || []).map(normalizeSavedEntry).filter(Boolean),
    };
}

export function saveSearchWorkspace(workspace) {
    try {
        localStorage.setItem(
            SEARCH_WORKSPACE_STORAGE_KEY,
            JSON.stringify({
                version: SEARCH_WORKSPACE_VERSION,
                data: workspace,
            })
        );
    } catch (err) {
        console.error("[SearchWorkspace] Failed to save workspace:", err);
    }
}

export function pickInitialSelectedKeys(allKeys, persistedKeys, favoriteKeys) {
    const available = new Set(allKeys || []);
    const fromPersisted = uniqueStrings(persistedKeys).filter((key) => available.has(key));
    if (fromPersisted.length > 0) return fromPersisted;

    const fromFavorites = uniqueStrings(favoriteKeys).filter((key) => available.has(key));
    if (fromFavorites.length > 0) return fromFavorites.slice(0, DEFAULT_SELECTED_KEYS_LIMIT);

    return (allKeys || []).slice(0, DEFAULT_SELECTED_KEYS_LIMIT);
}

export function normalizeFilterText(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function formatValueForFilter(entry) {
    if (!entry || typeof entry !== "object") return "";

    if (typeof entry.formattedValue === "string" && entry.formattedValue) {
        return entry.formattedValue;
    }

    if (entry.type === "undefined") return "undefined";
    if (Object.prototype.hasOwnProperty.call(entry, "value")) {
        return String(entry.value);
    }

    return "";
}

export function matchesEntryFilter(entry, query) {
    const normalized = normalizeFilterText(query);
    if (!normalized) return true;

    if (!entry || typeof entry !== "object") return false;

    let searchable = entryFilterTextCache.get(entry);
    if (!searchable) {
        const path = String(entry.path || "").toLowerCase();
        const value = String(formatValueForFilter(entry)).toLowerCase();
        searchable = `${path}\n${value}`;
        entryFilterTextCache.set(entry, searchable);
    }

    return searchable.includes(normalized);
}
