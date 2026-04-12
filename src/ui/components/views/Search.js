import van from "../../vendor/van-1.6.0.js";
import vanX from "../../vendor/van-x-0.6.3.js";
import store from "../../state/store.js";
import { detectQueryType } from "../../utils/index.js";
import {
    NEW_SCAN_TYPES,
    NEXT_SCAN_TYPES,
    isInputlessScanType,
    requiresSecondaryInput,
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
    formatMonitorValue,
    getMonitorHistory,
    resolveMonitorEntry,
    getUiTypeFromRawValue,
    getDraftFromRawValue,
    getResultValue,
} from "./search/valueUtils.js";
import {
    uniqueStrings,
    normalizeFavoriteKeys,
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
    const localFavoriteKeys = loadLocalFavoriteKeys();
    const initialSearchQuery = "";

    const ui = vanX.reactive({
        allKeys: [],
        favoriteKeys: normalizeFavoriteKeys(localFavoriteKeys),
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
        monitorToggleNonce: 0,
    });

    const getValidFavorites = () => normalizeFavoriteKeys(ui.favoriteKeys).filter((k) => ui.allKeys.includes(k));

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

    const getMonitorUnsubscribeId = (monitorPath, resolvedMonitor) => {
        return resolvedMonitor?.id || monitorIdFromMonitorPath(monitorPath);
    };

    let resultsFilterTimer = null;
    let savedFilterTimer = null;
    let resultsFilterSeq = 0;
    let savedFilterSeq = 0;
    let workspacePersistTimer = null;
    const subscribedMonitorPaths = new Set();
    const monitorToggleLocksByPath = new Map();
    const MONITOR_TOGGLE_LOCK_MS = 280;
    const filterCache = {
        results: { source: null, query: "", values: [] },
        saved: { source: null, query: "", values: [] },
    };

    const isMonitorToggleLocked = (path) => {
        ui.monitorToggleNonce;

        const lockUntil = monitorToggleLocksByPath.get(path);
        if (!lockUntil) return false;

        if (Date.now() >= lockUntil) {
            monitorToggleLocksByPath.delete(path);
            return false;
        }

        return true;
    };

    const lockMonitorToggle = (path) => {
        const lockUntil = Date.now() + MONITOR_TOGGLE_LOCK_MS;
        monitorToggleLocksByPath.set(path, lockUntil);
        ui.monitorToggleNonce += 1;

        setTimeout(() => {
            const current = monitorToggleLocksByPath.get(path);
            if (current !== lockUntil) return;

            monitorToggleLocksByPath.delete(path);
            ui.monitorToggleNonce += 1;
        }, MONITOR_TOGGLE_LOCK_MS + 20);
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

            const monitorPath = monitorPathForSearchResult(path);
            const resolvedMonitor = getResolvedMonitorEntry(monitorPath);
            store.unsubscribeMonitor(getMonitorUnsubscribeId(monitorPath, resolvedMonitor));
            subscribedMonitorPaths.delete(path);
        }
    };

    const restoreSavedMonitorsWithRetry = () => {
        if (ui.savedResults.length === 0) return;

        let attempts = 0;
        const maxAttempts = 10;

        const trySubscribe = () => {
            reconcileMonitorSubscriptions();
            attempts += 1;

            if (attempts < maxAttempts) {
                setTimeout(trySubscribe, 1500);
            }
        };

        trySubscribe();
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

            const nextEntry = {
                ...entry,
                formattedValue: payload.formattedValue ?? entry.formattedValue,
                type: payload.type ?? entry.type,
                ...(hasPayloadValue ? { value: payload.value } : {}),
            };

            nextEntry.lastLiveRaw = hasPayloadValue ? payload.value : nextEntry.lastLiveRaw;
            nextEntry.lastLiveFormatted =
                payload.formattedValue ?? nextEntry.lastLiveFormatted ?? nextEntry.formattedValue;
            nextEntry.lastLiveType = payload.type ?? nextEntry.lastLiveType ?? nextEntry.type;

            return nextEntry;
        });
    };

    van.derive(() => {
        const snapshot = buildSearchWorkspace(ui);

        if (workspacePersistTimer !== null) {
            clearTimeout(workspacePersistTimer);
        }

        workspacePersistTimer = setTimeout(() => {
            workspacePersistTimer = null;
            saveSearchWorkspace(snapshot);
        }, 180);
    });

    van.derive(() => {
        saveLocalFavoriteKeys(ui.favoriteKeys);
    });

    van.derive(() => {
        ui.savedResults;
        store.data.monitorValues;
        reconcileMonitorSubscriptions();
    });

    const getFilteredResults = () => {
        const source = ui.results;
        const query = normalizeFilterText(ui.resultsFilterApplied);
        const cache = filterCache.results;

        if (cache.source === source && cache.query === query) {
            return cache.values;
        }

        const values = query ? source.filter((entry) => matchesEntryFilter(entry, query)) : source;
        cache.source = source;
        cache.query = query;
        cache.values = values;
        return values;
    };

    const getFilteredSavedResults = () => {
        const source = ui.savedResults;
        const query = normalizeFilterText(ui.savedFilterApplied);
        const cache = filterCache.saved;

        if (cache.source === source && cache.query === query) {
            return cache.values;
        }

        const values = query ? source.filter((entry) => matchesEntryFilter(entry, query)) : source;
        cache.source = source;
        cache.query = query;
        cache.values = values;
        return values;
    };

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

        isMonitorToggleLocked,

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
            const seq = ++resultsFilterSeq;

            ui.resultsFilter = value;
            if (resultsFilterTimer !== null) clearTimeout(resultsFilterTimer);

            resultsFilterTimer = setTimeout(() => {
                if (seq !== resultsFilterSeq) return;
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

            resultsFilterSeq += 1;
            ui.resultsFilter = "";
            ui.resultsFilterApplied = "";
            ui.displayLimit = 50;
        },

        handleSavedFilterInput: (e) => {
            const value = e.target.value;
            const seq = ++savedFilterSeq;

            ui.savedFilter = value;
            if (savedFilterTimer !== null) clearTimeout(savedFilterTimer);

            savedFilterTimer = setTimeout(() => {
                if (seq !== savedFilterSeq) return;
                savedFilterTimer = null;
                ui.savedFilterApplied = value;
            }, 120);
        },

        clearSavedFilter: () => {
            if (savedFilterTimer !== null) {
                clearTimeout(savedFilterTimer);
                savedFilterTimer = null;
            }

            savedFilterSeq += 1;
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

        getPrimaryPlaceholder: (scanType) => {
            switch (scanType) {
                case "bigger_than":
                    return "BIGGER THAN";
                case "smaller_than":
                    return "SMALLER THAN";
                case "value_between":
                    return "MIN VALUE";
                case "increased_value_by":
                    return "INCREASED BY";
                case "decreased_value_by":
                    return "DECREASED BY";
                default:
                    return "VALUE";
            }
        },

        handleKeyDown: (e) => {
            if (e.key === "Enter") handlers.handleSearch(ui.scanSessionActive ? "next" : "new");
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
                lastLiveRaw: getResultValue(result),
                lastLiveFormatted: result.formattedValue,
                lastLiveType: result.type,
                lastHistory: seededHistory,
                monitorEnabled: true,
            };

            ui.savedResults = [...ui.savedResults, entry];

            store.subscribeMonitor(monitorPath);
            subscribedMonitorPaths.add(result.path);

            store.notify(`Added ${result.path} to saved list and enabled watcher`, "success");
        },

        toggleSavedMonitor: (path, enabled) => {
            lockMonitorToggle(path);

            const monitorPath = monitorPathForSearchResult(path);
            const resolvedMonitor = getResolvedMonitorEntry(monitorPath);
            const currentHistory = getMonitorHistory(resolvedMonitor.entry);
            const hasCurrentLive = currentHistory.length > 0;
            const currentLiveRaw = hasCurrentLive ? currentHistory[0].value : undefined;

            ui.savedResults = ui.savedResults.map((entry) => {
                if (entry.path !== path) return entry;

                const nextEntry = {
                    ...entry,
                    monitorEnabled: enabled,
                };

                if (!enabled && hasCurrentLive) {
                    nextEntry.lastLiveRaw = currentLiveRaw;
                    nextEntry.lastLiveFormatted = formatMonitorValue(currentLiveRaw);
                    nextEntry.lastLiveType = getUiTypeFromRawValue(currentLiveRaw, entry.type);
                }

                if (!enabled && currentHistory.length > 0) {
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

            store.unsubscribeMonitor(getMonitorUnsubscribeId(monitorPath, resolvedMonitor));
            subscribedMonitorPaths.delete(path);
            store.notify("Stopped watcher for " + path);
        },

        removeSavedResult: (path) => {
            const monitorPath = monitorPathForSearchResult(path);
            const resolvedMonitor = getResolvedMonitorEntry(monitorPath);
            store.unsubscribeMonitor(getMonitorUnsubscribeId(monitorPath, resolvedMonitor));
            subscribedMonitorPaths.delete(path);

            ui.savedResults = ui.savedResults.filter((entry) => entry.path !== path);
            if (ui.savedEdit.path === path) handlers.cancelSavedEdit();
            store.notify(`Removed ${path} from saved list`);
        },

        clearSavedResults: () => {
            if (ui.savedResults.length === 0) return;

            for (const entry of ui.savedResults) {
                const monitorPath = monitorPathForSearchResult(entry.path);
                const resolvedMonitor = getResolvedMonitorEntry(monitorPath);
                store.unsubscribeMonitor(getMonitorUnsubscribeId(monitorPath, resolvedMonitor));
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

                    const nextValue = getResultValue(next);
                    const nextType = next.type ?? entry.type;
                    const nextFormatted = next.formattedValue ?? entry.formattedValue;

                    const updated = {
                        ...entry,
                        formattedValue: nextFormatted,
                        value: nextValue,
                        type: nextType,
                        lastLiveRaw: nextValue,
                        lastLiveFormatted: nextFormatted,
                        lastLiveType: nextType,
                    };

                    return updated;
                });

                store.notify("Saved list refreshed", "success");
            } catch (e) {
                store.notify(e?.message || "Failed to refresh saved list", "error");
            } finally {
                ui.isRefreshingSavedResults = false;
            }
        },

        startSavedEdit: (entry) => {
            handlers.cancelEdit();
            ui.savedEdit.path = entry.path;

            const monitorPath = monitorPathForSearchResult(entry.path);
            const resolvedMonitor = getResolvedMonitorEntry(monitorPath);
            const liveHistory = getMonitorHistory(resolvedMonitor.entry);

            if (entry.monitorEnabled && liveHistory.length > 0) {
                const liveRaw = liveHistory[0].value;
                ui.savedEdit.draft = getDraftFromRawValue(liveRaw, seedEditValue(entry));
                ui.savedEdit.type = getUiTypeFromRawValue(liveRaw, expectedUiType(entry));
                return;
            }

            const hasCachedLive = Object.prototype.hasOwnProperty.call(entry, "lastLiveRaw");
            if (hasCachedLive) {
                const raw = entry.lastLiveRaw;
                ui.savedEdit.draft = getDraftFromRawValue(raw, seedEditValue(entry));
                ui.savedEdit.type = getUiTypeFromRawValue(raw, entry.lastLiveType ?? expectedUiType(entry));
                return;
            }

            const cachedHistory = Array.isArray(entry.lastHistory) ? entry.lastHistory : [];
            if (cachedHistory.length > 0) {
                const raw = cachedHistory[0].value;
                ui.savedEdit.draft = getDraftFromRawValue(raw, seedEditValue(entry));
                ui.savedEdit.type = getUiTypeFromRawValue(raw, entry.lastLiveType ?? expectedUiType(entry));
                return;
            }

            const hasStoredValue = Object.prototype.hasOwnProperty.call(entry, "value") || entry.type === "undefined";
            if (hasStoredValue) {
                const raw = entry.type === "undefined" ? undefined : entry.value;
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

        saveSavedEdit: async () => {
            if (!ui.savedEdit.path) return;

            const type = ui.savedEdit.type;
            const raw = ui.savedEdit.draft;
            const validation = validateEditDraft(type, raw);

            if (!validation.ok) {
                store.notify(validation.error, "error");
                return;
            }

            try {
                ui.isSettingValue = true;
                const resp = await store.setGgaValue(ui.savedEdit.path, validation.valueToSend);
                updateValueInUi(ui.savedEdit.path, resp);
                store.notify(`Updated ${ui.savedEdit.path}`, "success");
                handlers.cancelSavedEdit();
            } catch (e) {
                store.notify(e?.message || "Failed to update value", "error");
            } finally {
                ui.isSettingValue = false;
            }
        },

        startEdit: (result) => {
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

        saveEdit: async () => {
            if (!ui.edit.path) return;

            const type = ui.edit.type;
            const raw = ui.edit.draft;
            const validation = validateEditDraft(type, raw);

            if (!validation.ok) {
                store.notify(validation.error, "error");
                return;
            }

            try {
                ui.isSettingValue = true;
                const resp = await store.setGgaValue(ui.edit.path, validation.valueToSend);
                updateValueInUi(ui.edit.path, resp);

                store.notify(`Updated ${ui.edit.path}`, "success");
                handlers.cancelEdit();
            } catch (e) {
                store.notify(e?.message || "Failed to update value", "error");
            } finally {
                ui.isSettingValue = false;
            }
        },

        handleSearch: async (mode = "new") => {
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

            if (!isNext && scanType === "exact_value" && queryTrimmed === "") {
                store.notify("Enter a value for EXACT VALUE, or choose UNKNOWN INITIAL VALUE", "error");
                return;
            }

            if (!inputless && scanType !== "exact_value" && queryTrimmed === "") {
                store.notify("Enter a value for this scan type", "error");
                return;
            }

            if (
                (scanType === "bigger_than" ||
                    scanType === "smaller_than" ||
                    scanType === "increased_value_by" ||
                    scanType === "decreased_value_by") &&
                (queryTrimmed === "" || Number.isNaN(Number(queryTrimmed)))
            ) {
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

            const requestOptions = isNext ? { withinPaths: [...ui.scopePaths] } : null;

            try {
                const baseData =
                    scanType === "exact_value"
                        ? isNext
                            ? await store.searchGga(query, ui.selectedKeys, requestOptions)
                            : await store.searchGga(query, ui.selectedKeys)
                        : isNext
                          ? await store.searchGga("", ui.selectedKeys, requestOptions)
                          : await store.searchGga("", ui.selectedKeys);

                const filteredResults =
                    scanType === "exact_value"
                        ? baseData.results || []
                        : filterResultsByScanType(baseData.results || [], {
                              scanType,
                              query: inputless ? "" : query,
                              query2: hasSecondaryInput ? query2 : "",
                              previousSnapshot: ui.previousSnapshot,
                          });

                ui.results = filteredResults;
                ui.scopePaths = filteredResults.map((r) => r.path);
                ui.previousSnapshot = buildSnapshotFromResults(filteredResults);
                ui.scanSessionActive = true;
            } catch (err) {
                ui.error = err.message || "Search failed";
                if (!isNext) {
                    ui.results = [];
                    ui.scopePaths = [];
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

        restoreSavedMonitorsWithRetry();
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
