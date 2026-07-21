import van from "../../vendor/van-1.6.0.js";
import vanX from "../../vendor/van-x-0.6.3.js";
import store from "../../state/store.js";
import { detectQueryType } from "../../utils/index.js";
import { FAVORITE_KEYS } from "../../state/constants.js";
import {
    NEW_SCAN_TYPES,
    NEXT_SCAN_TYPES,
    isInputlessScanType,
    requiresSecondaryInput,
    requiresNumericInput,
    needsPreviousSnapshot,
    buildSnapshotFromResults,
    filterResultsByScanType,
} from "./search/scanUtils.js";
import {
    seedEditValue,
    expectedUiType,
    validateEditDraft,
    monitorPathForSearchResult,
    monitorIdFromMonitorPath,
    formatDisplayValue,
    getMonitorHistory,
    resolveMonitorEntry,
    getUiTypeFromRawValue,
    getDraftFromRawValue,
    getResultValue,
} from "./search/valueUtils.js";
import {
    uniqueStrings,
    loadLocalFavoriteKeys,
    saveLocalFavoriteKeys,
    normalizeSavedEntry,
    loadSearchWorkspace,
    buildSearchWorkspace,
    saveSearchWorkspace,
    pickInitialSelectedKeys,
    normalizeFilterText,
    matchesEntryFilter,
} from "./search/workspaceUtils.js";
import { KeysSection, SearchInputSection, ResultsSection, SavedResultsSection } from "./search/sections.js";

const { div } = van.tags;

export const Search = () => {
    const restoredWorkspace = loadSearchWorkspace() || {};
    // loadLocalFavoriteKeys returns null only when the user has never set
    // favorites; fall back to the curated defaults in that case, but honor a
    // deliberately emptied list.
    const localFavoriteKeys = loadLocalFavoriteKeys();
    const initialSearchQuery = "";

    const ui = vanX.reactive({
        allKeys: [],
        favoriteKeys: uniqueStrings(localFavoriteKeys ?? FAVORITE_KEYS),
        selectedKeys: uniqueStrings(restoredWorkspace.selectedKeys),
        searchQuery: initialSearchQuery,
        searchQuery2: "",
        resultsFilter: "",
        savedFilter: "",
        resultsFilterApplied: "",
        savedFilterApplied: "",
        detectedType: detectQueryType(initialSearchQuery),
        scanTypeNew: "exact_value",
        scanTypeNext: "exact_value",
        scanSessionActive: false,
        previousSnapshot: {},
        isLoading: false,
        isSearching: false,
        results: [],
        displayLimit: 50,
        error: null,
        allKeysExpanded: false,
        allKeysFilter: "",
        scopePaths: [],
        lastSearchMode: "new",
        edit: { path: null, draft: "", type: "" },
        isSettingValue: false,
        hasSearched: false,
        savedResults: Array.isArray(restoredWorkspace.savedResults)
            ? restoredWorkspace.savedResults.map(normalizeSavedEntry).filter(Boolean)
            : [],
        savedEdit: { path: null, draft: "", type: "" },
        isRefreshingSavedResults: false,
    });

    const getValidFavorites = () => uniqueStrings(ui.favoriteKeys).filter((k) => ui.allKeys.includes(k));

    const getOtherKeys = () => {
        const favSet = new Set(getValidFavorites());
        let keys = ui.allKeys.filter((k) => !favSet.has(k));
        if (ui.allKeysFilter) {
            const filter = ui.allKeysFilter.toLowerCase();
            keys = keys.filter((k) => k.toLowerCase().includes(filter));
        }
        return keys;
    };

    const areAllSelected = () => ui.allKeys.length > 0 && ui.selectedKeys.length === ui.allKeys.length;

    const updateSelection = (keys, select) => {
        if (select) {
            const newKeys = new Set(ui.selectedKeys);
            keys.forEach((k) => newKeys.add(k));
            ui.selectedKeys = [...newKeys];
        } else {
            const removeSet = new Set(keys);
            ui.selectedKeys = ui.selectedKeys.filter((k) => !removeSet.has(k));
        }
    };

    const getResolvedMonitorEntry = (path) => {
        return resolveMonitorEntry(path, store.data.monitorValues || {});
    };

    let resultsFilterTimer = null;
    let savedFilterTimer = null;
    const subscribedMonitorPaths = new Set();
    const filterCache = {
        results: { source: null, query: "", values: [] },
        saved: { source: null, query: "", values: [] },
    };

    const reconcileMonitorSubscriptions = () => {
        const desiredPaths = new Set();

        for (const entry of ui.savedResults) {
            if (!entry?.path) continue;

            if (entry.monitorEnabled === false) continue;

            desiredPaths.add(entry.path);
        }

        for (const path of desiredPaths) {
            const monitorPath = monitorPathForSearchResult(path);
            const resolvedMonitor = getResolvedMonitorEntry(monitorPath);

            if (subscribedMonitorPaths.has(path) && !resolvedMonitor.entry) {
                subscribedMonitorPaths.delete(path);
            }

            if (subscribedMonitorPaths.has(path)) continue;
            store.subscribeMonitor(monitorPath);
            subscribedMonitorPaths.add(path);
        }

        for (const path of [...subscribedMonitorPaths]) {
            if (desiredPaths.has(path)) continue;

            store.unsubscribeMonitor(monitorIdFromMonitorPath(monitorPathForSearchResult(path)));
            subscribedMonitorPaths.delete(path);
        }
    };

    const updateValueInUi = (path, payload) => {
        const hasPayloadValue = payload && Object.prototype.hasOwnProperty.call(payload, "value");

        ui.results = ui.results.map((r) =>
            r.path === path
                ? {
                      ...r,
                      formattedValue: payload.formattedValue ?? r.formattedValue,
                      type: payload.type ?? r.type,
                      ...(hasPayloadValue ? { value: payload.value } : {}),
                  }
                : r
        );

        ui.savedResults = ui.savedResults.map((entry) => {
            if (entry.path !== path) return entry;

            return {
                ...entry,
                formattedValue: payload.formattedValue ?? entry.formattedValue,
                type: payload.type ?? entry.type,
                ...(hasPayloadValue ? { value: payload.value } : {}),
            };
        });
    };

    // Shared write flow for both the results and saved-list editors. The target
    // path is captured before the await so a row opened/removed mid-write can't
    // redirect the update; isSettingValue rejects overlapping writes.
    const commitEdit = async (editState, cancel) => {
        const path = editState.path;
        if (!path || ui.isSettingValue) return;

        const validation = validateEditDraft(editState.type, editState.draft);
        if (!validation.ok) {
            store.notify(validation.error, "error");
            return;
        }

        try {
            ui.isSettingValue = true;
            const resp = await store.setGgaValue(path, validation.valueToSend);
            updateValueInUi(path, resp);
            store.notify(`Updated ${path}`, "success");
            cancel();
        } catch (e) {
            store.notify(e?.message || "Failed to update value", "error");
        } finally {
            ui.isSettingValue = false;
        }
    };

    // Persist synchronously: selectedKeys/savedResults only change on discrete
    // user actions, so an immediate reload after a change can't lose it.
    van.derive(() => {
        saveSearchWorkspace(buildSearchWorkspace(ui));
    });

    van.derive(() => {
        saveLocalFavoriteKeys(ui.favoriteKeys);
    });

    van.derive(() => {
        ui.savedResults;
        store.data.monitorValues;
        reconcileMonitorSubscriptions();
    });

    const getFilteredList = (source, appliedFilter, cache) => {
        const query = normalizeFilterText(appliedFilter);
        if (cache.source === source && cache.query === query) {
            return cache.values;
        }

        const values = query ? source.filter((entry) => matchesEntryFilter(entry, query)) : source;
        cache.source = source;
        cache.query = query;
        cache.values = values;
        return values;
    };

    const getFilteredResults = () => getFilteredList(ui.results, ui.resultsFilterApplied, filterCache.results);
    const getFilteredSavedResults = () => getFilteredList(ui.savedResults, ui.savedFilterApplied, filterCache.saved);

    const handlers = {
        getValidFavorites,
        getOtherKeys,
        areAllSelected,
        getFilteredResults,
        getFilteredSavedResults,

        handleKeyChange: (keyName, isChecked) => updateSelection([keyName], isChecked),

        toggleAll: () => {
            if (areAllSelected()) ui.selectedKeys = [];
            else ui.selectedKeys = [...ui.allKeys];
        },

        selectKeys: (keys) => updateSelection(keys, true),
        clearSelection: () => {
            ui.selectedKeys = [];
        },

        isFavoriteKey: (keyName) => ui.favoriteKeys.includes(keyName),

        toggleFavoriteKey: (keyName) => {
            const hasKey = ui.favoriteKeys.includes(keyName);
            if (hasKey) {
                ui.favoriteKeys = ui.favoriteKeys.filter((key) => key !== keyName);
                return;
            }

            ui.favoriteKeys = [...ui.favoriteKeys, keyName];
        },

        handleResultsFilterInput: (e) => {
            const value = e.target.value;

            ui.resultsFilter = value;
            if (resultsFilterTimer !== null) clearTimeout(resultsFilterTimer);

            resultsFilterTimer = setTimeout(() => {
                resultsFilterTimer = null;
                ui.resultsFilterApplied = value;
                ui.displayLimit = 50;
            }, 120);
        },

        clearResultsFilter: () => {
            if (resultsFilterTimer !== null) {
                clearTimeout(resultsFilterTimer);
                resultsFilterTimer = null;
            }

            ui.resultsFilter = "";
            ui.resultsFilterApplied = "";
            ui.displayLimit = 50;
        },

        handleSavedFilterInput: (e) => {
            const value = e.target.value;

            ui.savedFilter = value;
            if (savedFilterTimer !== null) clearTimeout(savedFilterTimer);

            savedFilterTimer = setTimeout(() => {
                savedFilterTimer = null;
                ui.savedFilterApplied = value;
            }, 120);
        },

        clearSavedFilter: () => {
            if (savedFilterTimer !== null) {
                clearTimeout(savedFilterTimer);
                savedFilterTimer = null;
            }

            ui.savedFilter = "";
            ui.savedFilterApplied = "";
        },

        startNewScan: () => {
            ui.scanSessionActive = false;
            ui.lastSearchMode = "new";
            ui.scopePaths = [];
            ui.previousSnapshot = {};
            ui.results = [];
            ui.displayLimit = 50;
            ui.error = null;
            ui.hasSearched = false;
            handlers.cancelEdit();
            handlers.cancelSavedEdit();
            store.notify("Scan reset. Ready for first scan.", "success");
        },

        handleNewScanTypeChange: (e) => {
            ui.scanTypeNew = e.target.value;
        },

        handleNextScanTypeChange: (e) => {
            ui.scanTypeNext = e.target.value;
        },

        handleQueryInput: (e) => {
            ui.searchQuery = e.target.value;
            ui.detectedType = detectQueryType(e.target.value);
        },

        handleQuery2Input: (e) => {
            ui.searchQuery2 = e.target.value;
        },

        handleKeyDown: (e) => {
            if (e.key === "Enter" && !ui.isSearching) {
                handlers.handleSearch(ui.scanSessionActive ? "next" : "new");
            }
        },

        addToSavedResults: (result) => {
            if (!result?.path) return;

            if (ui.savedResults.some((entry) => entry.path === result.path)) {
                store.notify("Already in saved list");
                return;
            }

            const monitorPath = monitorPathForSearchResult(result.path);
            const resolvedMonitor = getResolvedMonitorEntry(monitorPath);
            const initialHistory = getMonitorHistory(resolvedMonitor.entry).slice(0, 10);
            const seededHistory =
                initialHistory.length > 0 ? initialHistory : [{ value: getResultValue(result), ts: Date.now() }];

            const entry = {
                path: result.path,
                formattedValue: result.formattedValue,
                value: getResultValue(result),
                type: result.type,
                lastHistory: seededHistory,
                monitorEnabled: true,
            };

            ui.savedResults = [...ui.savedResults, entry];

            store.subscribeMonitor(monitorPath);
            subscribedMonitorPaths.add(result.path);

            store.notify(`Added ${result.path} to saved list and enabled watcher`, "success");
        },

        toggleSavedMonitor: (path, enabled) => {
            const monitorPath = monitorPathForSearchResult(path);
            const currentHistory = getMonitorHistory(getResolvedMonitorEntry(monitorPath).entry);
            const hasCurrentLive = currentHistory.length > 0;
            const currentLiveRaw = hasCurrentLive ? currentHistory[0].value : undefined;

            ui.savedResults = ui.savedResults.map((entry) => {
                if (entry.path !== path) return entry;

                const nextEntry = {
                    ...entry,
                    monitorEnabled: enabled,
                };

                if (!enabled && hasCurrentLive) {
                    // Snapshot the last live value so the row keeps showing it.
                    nextEntry.value = currentLiveRaw;
                    nextEntry.formattedValue = formatDisplayValue(currentLiveRaw);
                    nextEntry.type = getUiTypeFromRawValue(currentLiveRaw, entry.type);
                    nextEntry.lastHistory = currentHistory.slice(0, 10);
                }

                return nextEntry;
            });

            if (enabled) {
                store.subscribeMonitor(monitorPath);
                subscribedMonitorPaths.add(path);
                store.notify("Enabled watcher for " + path);
                return;
            }

            store.unsubscribeMonitor(monitorIdFromMonitorPath(monitorPath));
            subscribedMonitorPaths.delete(path);
            store.notify("Stopped watcher for " + path);
        },

        removeSavedResult: (path) => {
            store.unsubscribeMonitor(monitorIdFromMonitorPath(monitorPathForSearchResult(path)));
            subscribedMonitorPaths.delete(path);

            ui.savedResults = ui.savedResults.filter((entry) => entry.path !== path);
            if (ui.savedEdit.path === path) handlers.cancelSavedEdit();
            store.notify(`Removed ${path} from saved list`);
        },

        clearSavedResults: () => {
            if (ui.savedResults.length === 0) return;

            for (const entry of ui.savedResults) {
                store.unsubscribeMonitor(monitorIdFromMonitorPath(monitorPathForSearchResult(entry.path)));
                subscribedMonitorPaths.delete(entry.path);
            }

            ui.savedResults = [];
            handlers.cancelSavedEdit();
            store.notify("Saved list cleared");
        },

        refreshSavedResults: async () => {
            if (ui.savedResults.length === 0) return;

            const withinPaths = ui.savedResults.map((entry) => entry.path);

            try {
                ui.isRefreshingSavedResults = true;

                const data = await store.searchGga("", ui.selectedKeys, { withinPaths });
                const nextByPath = new Map((data.results || []).map((entry) => [entry.path, entry]));

                ui.savedResults = ui.savedResults.map((entry) => {
                    const next = nextByPath.get(entry.path);
                    if (!next) return entry;

                    return {
                        ...entry,
                        formattedValue: next.formattedValue ?? entry.formattedValue,
                        value: getResultValue(next),
                        type: next.type ?? entry.type,
                    };
                });

                store.notify("Saved list refreshed", "success");
            } catch (e) {
                store.notify(e?.message || "Failed to refresh saved list", "error");
            } finally {
                ui.isRefreshingSavedResults = false;
            }
        },

        startSavedEdit: (entry) => {
            if (ui.isSettingValue) return; // don't switch rows mid-write
            handlers.cancelEdit();
            ui.savedEdit.path = entry.path;

            // Prefer the freshest raw value: live monitor > cached history > stored entry value.
            const monitorPath = monitorPathForSearchResult(entry.path);
            const liveHistory = entry.monitorEnabled
                ? getMonitorHistory(getResolvedMonitorEntry(monitorPath).entry)
                : [];
            const cachedHistory = Array.isArray(entry.lastHistory) ? entry.lastHistory : [];
            const newest = liveHistory[0] ?? cachedHistory[0];

            const hasStoredValue = Object.prototype.hasOwnProperty.call(entry, "value") || entry.type === "undefined";
            if (newest || hasStoredValue) {
                const raw = newest ? newest.value : entry.type === "undefined" ? undefined : entry.value;
                ui.savedEdit.draft = getDraftFromRawValue(raw, seedEditValue(entry));
                ui.savedEdit.type = getUiTypeFromRawValue(raw, expectedUiType(entry));
                return;
            }

            ui.savedEdit.draft = seedEditValue(entry);
            ui.savedEdit.type = expectedUiType(entry);
        },

        cancelSavedEdit: () => {
            ui.savedEdit.path = null;
            ui.savedEdit.draft = "";
            ui.savedEdit.type = "";
        },

        saveSavedEdit: () => commitEdit(ui.savedEdit, handlers.cancelSavedEdit),

        startEdit: (result) => {
            if (ui.isSettingValue) return; // don't switch rows mid-write
            handlers.cancelSavedEdit();
            ui.edit.path = result.path;
            ui.edit.draft = seedEditValue(result);
            ui.edit.type = expectedUiType(result);
        },

        cancelEdit: () => {
            ui.edit.path = null;
            ui.edit.draft = "";
            ui.edit.type = "";
        },

        saveEdit: () => commitEdit(ui.edit, handlers.cancelEdit),

        handleSearch: async (mode = "new") => {
            if (ui.isSearching) return;

            handlers.cancelEdit();
            handlers.cancelSavedEdit();

            const isNext = mode === "next";
            const scanType = isNext ? ui.scanTypeNext : ui.scanTypeNew;
            const allowedScanTypes = isNext ? NEXT_SCAN_TYPES : NEW_SCAN_TYPES;

            if (!allowedScanTypes.includes(scanType)) {
                store.notify(
                    isNext
                        ? "This scan type is only available for NEW scans"
                        : "This scan type is only available for NEXT scans",
                    "error"
                );
                return;
            }

            if (isNext) {
                if (!ui.scopePaths || ui.scopePaths.length === 0) {
                    store.notify("Run a NEW search first to build a list for NEXT search", "error");
                    return;
                }
            } else if (ui.selectedKeys.length === 0) {
                store.notify("Select at least one key to search in", "error");
                return;
            }

            const query = String(ui.searchQuery ?? "");
            const queryTrimmed = query.trim();
            const query2 = String(ui.searchQuery2 ?? "");
            const query2Trimmed = query2.trim();
            const inputless = isInputlessScanType(scanType);
            const hasSecondaryInput = requiresSecondaryInput(scanType);

            if (scanType === "exact_value" && queryTrimmed === "") {
                store.notify("Enter a value for FIND VALUE, or choose UNKNOWN INITIAL VALUE", "error");
                return;
            }

            if (!inputless && scanType !== "exact_value" && queryTrimmed === "") {
                store.notify("Enter a value for this scan type", "error");
                return;
            }

            if (requiresNumericInput(scanType) && (queryTrimmed === "" || Number.isNaN(Number(queryTrimmed)))) {
                store.notify("This scan type requires a numeric value", "error");
                return;
            }

            if (hasSecondaryInput) {
                if (queryTrimmed === "" || query2Trimmed === "") {
                    store.notify("Enter both values for VALUE BETWEEN", "error");
                    return;
                }

                if (Number.isNaN(Number(queryTrimmed)) || Number.isNaN(Number(query2Trimmed))) {
                    store.notify("VALUE BETWEEN requires numeric bounds", "error");
                    return;
                }
            }

            if (isNext && needsPreviousSnapshot(scanType) && Object.keys(ui.previousSnapshot || {}).length === 0) {
                store.notify("This NEXT scan type needs a previous result baseline", "error");
                return;
            }

            ui.hasSearched = true;
            ui.isSearching = true;
            ui.error = null;
            ui.displayLimit = 50;
            ui.lastSearchMode = mode;

            // Translate the scan type into the game search query/compare protocol.
            // Absolute predicates (exact/bigger/smaller/between) match game-side so
            // the result cap keeps matching values; comparison types need the
            // previous snapshot and are filtered client-side.
            const qNum = Number(queryTrimmed);
            const q2Num = Number(query2Trimmed);

            let effectiveQuery = "";
            let compare = null;
            if (scanType === "exact_value") {
                effectiveQuery = query;
            } else if (scanType === "bigger_than") {
                compare = { op: "gt", value: qNum };
            } else if (scanType === "smaller_than") {
                compare = { op: "lt", value: qNum };
            } else if (scanType === "value_between") {
                effectiveQuery = `${Math.min(qNum, q2Num)}-${Math.max(qNum, q2Num)}`;
            }

            const options = {};
            if (isNext) options.withinPaths = [...ui.scopePaths];
            if (compare) options.compare = compare;
            const requestOptions = Object.keys(options).length > 0 ? options : null;

            const clientFiltered = needsPreviousSnapshot(scanType);

            try {
                const baseData = await store.searchGga(effectiveQuery, ui.selectedKeys, requestOptions);

                const filteredResults = clientFiltered
                    ? filterResultsByScanType(baseData.results || [], {
                          scanType,
                          query: inputless ? "" : query,
                          previousSnapshot: ui.previousSnapshot,
                      })
                    : baseData.results || [];

                ui.results = filteredResults;
                ui.scopePaths = filteredResults.map((r) => r.path);
                ui.previousSnapshot = buildSnapshotFromResults(filteredResults);
                ui.scanSessionActive = true;

                if (baseData.truncated) {
                    store.notify("Result cap reached — scan is partial. Narrow your keys or query.", "error");
                }
            } catch (err) {
                ui.error = err.message || "Search failed";
                if (!isNext) {
                    ui.results = [];
                    ui.scopePaths = [];
                    ui.previousSnapshot = {};
                    ui.scanSessionActive = false;
                }
            } finally {
                ui.isSearching = false;
            }
        },
    };

    (async () => {
        ui.isLoading = true;
        ui.error = null;
        try {
            const allKeys = await store.fetchGgaKeys();
            ui.allKeys = allKeys;
            const validFavorites = getValidFavorites();
            ui.selectedKeys = pickInitialSelectedKeys(allKeys, restoredWorkspace.selectedKeys, validFavorites);
        } catch (err) {
            ui.error = err.message || "Failed to load GGA keys";
        } finally {
            ui.isLoading = false;
        }
    })();

    return div(
        { id: "search-tab", class: "tab-pane" },
        div(
            { class: "search-layout" },
            KeysSection({ ui, handlers }),
            div(
                { class: "search-right-column" },
                SearchInputSection({ ui, handlers }),
                ResultsSection({ ui, handlers }),
                SavedResultsSection({ ui, handlers })
            )
        )
    );
};
