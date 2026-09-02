import van from "../../vendor/van-1.6.0.js";
import vanX from "../../vendor/van-x-0.6.3.js";
import store from "../../state/store.js";
import { FAVORITE_KEYS } from "../../state/constants.js";
import { KeysSection, SearchInputSection, ResultsSection, SearchInspector } from "./search/SearchSections.js";
import { detectQueryType } from "../../utils/index.js";
import {
    NEW_SCAN_TYPES,
    NEXT_SCAN_TYPES,
    isInputlessScanType,
    requiresSecondaryInput,
    requiresNumericInput,
    needsPreviousSnapshot,
    buildSnapshotFromResults,
    filterResultsByScanType,
} from "../../utils/search/scanUtils.js";
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
} from "../../utils/search/valueUtils.js";
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
} from "../../utils/search/workspaceUtils.js";

const { div, button, span } = van.tags;

export const Search = () => {
    const restoredWorkspace = loadSearchWorkspace() || {};
    const localFavoriteKeys = loadLocalFavoriteKeys();
    const inspectorOverlayQuery = window.matchMedia("(max-width: 1279px)");
    const keysOverlayQuery = window.matchMedia("(max-width: 1023px)");
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
        allKeysFilter: "",
        scopePaths: [],
        lastSearchMode: "new",
        edit: { path: null, draft: "", type: "", surface: "row" },
        isSettingValue: false,
        hasSearched: false,
        savedResults: Array.isArray(restoredWorkspace.savedResults)
            ? restoredWorkspace.savedResults.map(normalizeSavedEntry).filter(Boolean)
            : [],
        savedEdit: { path: null, draft: "", type: "" },
        isRefreshingSavedResults: false,
        selectedResultPath: null,
        inspectorTab: "saved",
        inspectorOpen: false,
        keysOpen: false,
        inspectorOverlay: inspectorOverlayQuery.matches,
        keysOverlay: keysOverlayQuery.matches,
    });

    inspectorOverlayQuery.addEventListener("change", (event) => {
        const focusWasInInspector = document.activeElement?.closest("#search-inspector");
        ui.inspectorOverlay = event.matches;
        ui.inspectorOpen = false;
        if (event.matches && focusWasInInspector) {
            setTimeout(() => document.querySelector("#search-tab .search-inspector-toggle")?.focus(), 0);
        }
    });

    keysOverlayQuery.addEventListener("change", (event) => {
        const focusWasInKeys = document.activeElement?.closest("#search-keys-panel");
        ui.keysOverlay = event.matches;
        ui.keysOpen = false;
        if (event.matches && focusWasInKeys) {
            setTimeout(() => document.querySelector("#search-tab .search-keys-toggle")?.focus(), 0);
        }
    });

    const getValidFavorites = () => uniqueStrings(ui.favoriteKeys).filter((key) => ui.allKeys.includes(key));

    const getFilteredKeys = () => {
        const favorites = new Set(getValidFavorites());
        let keys = ui.allKeys.filter((key) => !favorites.has(key));
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
    let inspectorTrigger = null;
    let keysTrigger = null;

    const trapOverlayFocus = (panel, event, isOverlay) => {
        if (event.key !== "Tab" || !isOverlay) return;
        const focusable = [
            ...panel.querySelectorAll(
                'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex="0"]'
            ),
        ].filter((node) => node.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    const closeInspector = () => {
        if (!ui.inspectorOpen) return;
        if (document.activeElement?.closest("#search-inspector")) document.activeElement.blur();
        ui.inspectorOpen = false;
        setTimeout(() => inspectorTrigger?.focus(), 0);
    };

    const closeKeysPane = () => {
        if (!ui.keysOpen) return;
        if (document.activeElement?.closest("#search-keys-panel")) document.activeElement.blur();
        ui.keysOpen = false;
        setTimeout(() => keysTrigger?.focus(), 0);
    };

    const handlers = {
        getValidFavorites,
        getFilteredKeys,
        areAllSelected,
        getFilteredResults,
        getFilteredSavedResults,
        getSelectedResult: () => ui.results.find((result) => result.path === ui.selectedResultPath) || null,
        selectResult: (result, event) => {
            if (ui.edit.path && ui.edit.path !== result.path) handlers.cancelEdit();
            if (ui.savedEdit.path) handlers.cancelSavedEdit();
            ui.selectedResultPath = result.path;
            ui.inspectorTab = "selected";
            ui.inspectorOpen = ui.inspectorOverlay;
            inspectorTrigger = event?.currentTarget || document.activeElement;
        },
        openSavedInspector: (event) => {
            ui.inspectorTab = "saved";
            ui.inspectorOpen = true;
            inspectorTrigger = event?.currentTarget || document.activeElement;
        },
        closeInspector,
        toggleInspector: (event) => {
            if (ui.inspectorOpen) {
                closeInspector();
                return;
            }
            ui.inspectorOpen = true;
            inspectorTrigger = event?.currentTarget || document.activeElement;
        },
        openKeysPane: (event) => {
            ui.keysOpen = true;
            keysTrigger = event?.currentTarget || document.activeElement;
            setTimeout(() => document.querySelector("#search-keys-panel .search-keys-close")?.focus(), 0);
        },
        closeKeysPane,
        handleInspectorKeydown: (event) => {
            if (!ui.inspectorOpen) return;
            if (event.key === "Escape") {
                event.preventDefault();
                closeInspector();
                return;
            }
            trapOverlayFocus(event.currentTarget, event, ui.inspectorOverlay);
        },
        handleKeysPanelKeydown: (event) => {
            if (!ui.keysOpen) return;
            if (event.key === "Escape") {
                event.preventDefault();
                closeKeysPane();
                return;
            }
            trapOverlayFocus(event.currentTarget, event, ui.keysOverlay);
        },

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
            ui.favoriteKeys = ui.favoriteKeys.includes(keyName)
                ? ui.favoriteKeys.filter((key) => key !== keyName)
                : [...ui.favoriteKeys, keyName];
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
            ui.selectedResultPath = null;
            ui.inspectorTab = "saved";
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
            ui.edit.surface = "row";
        },

        startInspectorEdit: (result) => {
            if (ui.isSettingValue) return;
            handlers.cancelSavedEdit();
            ui.edit.path = result.path;
            ui.edit.draft = seedEditValue(result);
            ui.edit.type = expectedUiType(result);
            ui.edit.surface = "inspector";
        },

        cancelEdit: () => {
            ui.edit.path = null;
            ui.edit.draft = "";
            ui.edit.type = "";
            ui.edit.surface = "row";
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
                if (!filteredResults.some((result) => result.path === ui.selectedResultPath)) {
                    ui.selectedResultPath = null;
                    ui.inspectorTab = "saved";
                }
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
            ui.selectedKeys = pickInitialSelectedKeys(allKeys, restoredWorkspace.selectedKeys, getValidFavorites());
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
            button({
                type: "button",
                class: () => `search-keys-backdrop ${ui.keysOpen ? "is-open" : ""}`,
                onclick: handlers.closeKeysPane,
                tabindex: () => (ui.keysOpen ? 0 : -1),
                "aria-label": "Close key navigation",
            }),
            div(
                { class: "search-right-column" },
                div(
                    { class: "search-pane-toolbar" },
                    button(
                        {
                            type: "button",
                            class: "search-keys-toggle",
                            onclick: handlers.openKeysPane,
                            "aria-expanded": () => String(ui.keysOpen),
                            "aria-controls": "search-keys-panel",
                        },
                        "Keys",
                        span({ class: "search-toolbar-count" }, () => ui.selectedKeys.length)
                    ),
                    button(
                        {
                            type: "button",
                            class: "search-inspector-toggle",
                            onclick: handlers.toggleInspector,
                            "aria-expanded": () => String(ui.inspectorOpen),
                            "aria-controls": "search-inspector",
                        },
                        () => (ui.inspectorTab === "saved" ? "Saved" : "Inspector"),
                        span({ class: "search-toolbar-count" }, () =>
                            ui.inspectorTab === "saved" ? ui.savedResults.length : ui.selectedResultPath ? 1 : 0
                        )
                    )
                ),
                SearchInputSection({ ui, handlers }),
                ResultsSection({ ui, handlers })
            ),
            SearchInspector({ ui, handlers })
        )
    );
};
