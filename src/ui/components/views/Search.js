import van from "../../vendor/van-1.6.0.js";
import vanX from "../../vendor/van-x-0.6.3.js";
import store from "../../state/store.js";
import { FAVORITE_KEYS } from "../../state/constants.js";
import { detectQueryType, copyToClipboard } from "../../utils/index.js";
import { Loader } from "../Loader.js";
import { EmptyState } from "../EmptyState.js";
import { Sparkline, canGraph } from "../Sparkline.js";
import { Icons } from "../../assets/icons.js";
import * as API from "../../services/api.js";
import {
    NEW_SCAN_TYPES,
    NEXT_SCAN_TYPES,
    getScanTypeLabel,
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
    formatMonitorValue,
    getMonitorHistory,
    getMonitorCurrentValue,
    resolveMonitorEntry,
    getUiTypeFromRawValue,
    getDraftFromRawValue,
    getResultValue,
} from "./search/valueUtils.js";

const { div, input, button, span, label, details, summary, select, option } = van.tags;

const SEARCH_WORKSPACE_STORAGE_KEY = "searchWorkspace";
const SEARCH_WORKSPACE_VERSION = 1;
const DEFAULT_SELECTED_KEYS_LIMIT = 8;
const entryFilterTextCache = new WeakMap();

function uniqueStrings(items) {
    return [...new Set((items || []).filter((item) => typeof item === "string" && item))];
}

function sanitizeScanType(scanType, allowed, fallback) {
    return typeof scanType === "string" && allowed.includes(scanType) ? scanType : fallback;
}

function normalizeSavedEntry(entry) {
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

    if (typeof entry.lastLiveFormatted === "string") {
        normalized.lastLiveFormatted = entry.lastLiveFormatted;
    }

    if (typeof entry.lastLiveType === "string") {
        normalized.lastLiveType = entry.lastLiveType;
    }

    if (Array.isArray(entry.lastHistory)) {
        normalized.lastHistory = entry.lastHistory
            .filter((point) => point && typeof point === "object" && typeof point.ts === "number")
            .slice(0, 10)
            .map((point) => ({ value: point.value, ts: point.ts }));
    }

    return normalized;
}

function loadSearchWorkspace() {
    try {
        const raw = localStorage.getItem(SEARCH_WORKSPACE_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object" || parsed.version !== SEARCH_WORKSPACE_VERSION) {
            return null;
        }

        const data = parsed.data;
        if (!data || typeof data !== "object") return null;

        return {
            selectedKeys: uniqueStrings(data.selectedKeys),
            searchQuery: typeof data.searchQuery === "string" ? data.searchQuery : "",
            searchQuery2: typeof data.searchQuery2 === "string" ? data.searchQuery2 : "",
            resultsFilter: typeof data.resultsFilter === "string" ? data.resultsFilter : "",
            savedFilter: typeof data.savedFilter === "string" ? data.savedFilter : "",
            scanTypeNew: sanitizeScanType(data.scanTypeNew, NEW_SCAN_TYPES, "exact_value"),
            scanTypeNext: sanitizeScanType(data.scanTypeNext, NEXT_SCAN_TYPES, "exact_value"),
            allKeysExpanded: data.allKeysExpanded === true,
            allKeysFilter: typeof data.allKeysFilter === "string" ? data.allKeysFilter : "",
            savedResults: Array.isArray(data.savedResults)
                ? data.savedResults.map(normalizeSavedEntry).filter(Boolean)
                : [],
        };
    } catch {
        return null;
    }
}

function buildSearchWorkspace(ui) {
    return {
        selectedKeys: uniqueStrings(ui.selectedKeys),
        searchQuery: String(ui.searchQuery ?? ""),
        searchQuery2: String(ui.searchQuery2 ?? ""),
        resultsFilter: String(ui.resultsFilter ?? ""),
        savedFilter: String(ui.savedFilter ?? ""),
        scanTypeNew: sanitizeScanType(ui.scanTypeNew, NEW_SCAN_TYPES, "exact_value"),
        scanTypeNext: sanitizeScanType(ui.scanTypeNext, NEXT_SCAN_TYPES, "exact_value"),
        allKeysExpanded: ui.allKeysExpanded === true,
        allKeysFilter: String(ui.allKeysFilter ?? ""),
        savedResults: (ui.savedResults || []).map(normalizeSavedEntry).filter(Boolean),
    };
}

function saveSearchWorkspace(workspace) {
    try {
        localStorage.setItem(
            SEARCH_WORKSPACE_STORAGE_KEY,
            JSON.stringify({
                version: SEARCH_WORKSPACE_VERSION,
                data: workspace,
            })
        );
    } catch {
        // Ignore storage quota or JSON serialization failures
    }
}

function pickInitialSelectedKeys(allKeys, persistedKeys, favoriteKeys) {
    const available = new Set(allKeys || []);
    const fromPersisted = uniqueStrings(persistedKeys).filter((key) => available.has(key));
    if (fromPersisted.length > 0) return fromPersisted;

    const fromFavorites = uniqueStrings(favoriteKeys).filter((key) => available.has(key));
    if (fromFavorites.length > 0) return fromFavorites.slice(0, DEFAULT_SELECTED_KEYS_LIMIT);

    return (allKeys || []).slice(0, DEFAULT_SELECTED_KEYS_LIMIT);
}

function normalizeFilterText(value) {
    return String(value || "").trim().toLowerCase();
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

function matchesEntryFilter(entry, query) {
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

/**
 * Key checkbox component for the whitelist.
 */
const KeyCheckbox = ({ keyName, selectedKeys, onChange }) => {
    const isChecked = () => selectedKeys.includes(keyName);

    return label(
        { class: () => `key-checkbox ${isChecked() ? "checked" : ""}`, title: keyName },
        input({
            type: "checkbox",
            checked: isChecked,
            onchange: (e) => onChange(keyName, e.target.checked),
        }),
        span({ class: "key-checkbox-label" }, keyName)
    );
};

/**
 * Search result item component.
 */
const ResultItem = ({ result, ui, handlers }) => {
    const copyFeedback = van.state(null);

    const isEditing = () => ui.edit.path === result.path;
    const isInSavedList = () => ui.savedResults.some((entry) => entry.path === result.path);

    const handleCopy = (e) => {
        e.stopPropagation();
        const success = copyToClipboard("bEngine.gameAttributes.h." + result.path);
        copyFeedback.val = success ? "success" : "error";
        store.notify(success ? "Path copied to clipboard" : "Failed to copy", success ? "success" : "error");
        setTimeout(() => (copyFeedback.val = null), 1500);
    };

    const handleAddToList = (e) => {
        e.stopPropagation();
        if (e.currentTarget && typeof e.currentTarget.blur === "function") {
            e.currentTarget.blur();
        }

        if (isInSavedList()) {
            handlers.removeSavedResult(result.path);
            return;
        }

        handlers.addToSavedResults(result);
    };

    const handleStartEdit = (e) => {
        e.stopPropagation();
        handlers.startEdit(result);
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        handlers.cancelEdit();
    };

    const handleSave = (e) => {
        e.stopPropagation();
        handlers.saveEdit();
    };

    return div(
        {
            class: () => "search-result-item " + (copyFeedback.val === "success" ? "copied" : ""),
        },
        span({ class: "result-path" }, result.path),
        span({ class: "result-equals" }, "="),

        () => {
            if (!isEditing()) {
                return span({ class: "result-value type-" + result.type }, result.formattedValue);
            }

            return input({
                class: "result-edit-input",
                value: () => ui.edit.draft,
                oninput: (e) => (ui.edit.draft = e.target.value),
                onclick: (e) => e.stopPropagation(),
                onkeydown: (e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") handlers.saveEdit();
                    if (e.key === "Escape") handlers.cancelEdit();
                },
            });
        },

        div(
            { class: "result-actions" },
            () => {
                if (isEditing()) {
                    return div(
                        { class: "result-action-group" },
                        button(
                            {
                                class: "result-action-btn save-btn",
                                title: "Save",
                                onclick: handleSave,
                            },
                            Icons.Check()
                        ),
                        button(
                            {
                                class: "result-action-btn cancel-btn",
                                title: "Cancel",
                                onclick: handleCancel,
                            },
                            Icons.X()
                        )
                    );
                }

                return div(
                    { class: "result-action-group" },
                    button(
                        {
                            class: "result-action-btn edit-btn",
                            title: "Edit value",
                            onclick: handleStartEdit,
                        },
                        Icons.Edit()
                    ),
                    button(
                        {
                            class: () => "result-action-btn copy-btn " + (copyFeedback.val === "success" ? "copied" : ""),
                            title: "Copy full access path",
                            onclick: handleCopy,
                        },
                        () => (copyFeedback.val === "success" ? Icons.Check() : Icons.Copy())
                    ),
                    button(
                        {
                            class: () => "result-action-btn save-to-list-btn " + (isInSavedList() ? "active" : ""),
                            title: () => (isInSavedList() ? "Remove from saved list" : "Add to saved list"),
                            onclick: handleAddToList,
                        },
                        Icons.List()
                    )
                );
            }
        )
    );
};
/**
 * Reusable search button component.
 */
const SearchButton = ({
    isSearching,
    disabled,
    onClick,
    label = "SEARCH",
    title = "",
    className = "",
    icon = Icons.Search,
}) =>
    button(
        {
            class: () => `search-btn ${className} ${isSearching() ? "loading" : ""}`.trim(),
            onclick: onClick,
            disabled: () => isSearching() || disabled(),
            title,
        },
        () => (isSearching() ? "..." : typeof label === "function" ? label() : label),
        icon()
    );

/**
 * Keys Section (Left Column)
 */
const KeysSection = ({ ui, handlers }) =>
    div(
        { class: "search-keys-section" },
        div(
            { class: "section-header" },
            span({ class: "section-title" }, "SEARCH IN KEYS"),
            div(
                { class: "section-actions" },
                button(
                    {
                        class: () => `btn-small ${handlers.areAllSelected() ? "active" : ""}`,
                        onclick: handlers.toggleAll,
                        title: () => (handlers.areAllSelected() ? "Deselect all keys" : "Select all keys"),
                    },
                    () => (handlers.areAllSelected() ? "NONE" : "ALL")
                ),
                button(
                    {
                        class: "btn-small",
                        onclick: () => handlers.selectKeys(handlers.getValidFavorites()),
                        title: "Select all favorites",
                    },
                    "FAV"
                ),
                button({ class: "btn-small", onclick: handlers.clearSelection, title: "Clear selection" }, "CLEAR")
            )
        ),
        div(
            { class: "keys-content scroll-container" },
            div({ class: "keys-group" }, div({ class: "keys-group-header" }, "* FAVORITES"), () => {
                if (ui.isLoading) {
                    return div({ class: "keys-loading" }, "Loading");
                }
                const validFavorites = handlers.getValidFavorites();
                if (validFavorites.length === 0) {
                    return div({ class: "keys-loading" }, "No keys available");
                }
                return div(
                    { class: "keys-grid" },
                    ...validFavorites.map((key) =>
                        KeyCheckbox({
                            keyName: key,
                            selectedKeys: ui.selectedKeys,
                            onChange: handlers.handleKeyChange,
                        })
                    )
                );
            }),
            details(
                {
                    class: "keys-group expandable",
                    open: ui.allKeysExpanded,
                    ontoggle: (e) => (ui.allKeysExpanded = e.target.open),
                },
                summary({ class: "keys-group-header" }, () => `ALL KEYS (${handlers.getOtherKeys().length} MORE)`),
                div(
                    { class: "keys-expand-content" },
                    div(
                        { class: "keys-filter" },
                        input({
                            type: "text",
                            class: "keys-filter-input",
                            placeholder: "FILTER KEYS",
                            value: () => ui.allKeysFilter,
                            oninput: (e) => (ui.allKeysFilter = e.target.value),
                        })
                    ),
                    () => {
                        const otherKeys = handlers.getOtherKeys();
                        return div(
                            { class: "keys-grid" },
                            ...otherKeys.map((key) =>
                                KeyCheckbox({
                                    keyName: key,
                                    selectedKeys: ui.selectedKeys,
                                    onChange: handlers.handleKeyChange,
                                })
                            )
                        );
                    }
                )
            )
        ),
        div({ class: "keys-footer" }, () => span({ class: "selected-count" }, `${ui.selectedKeys.length} keys selected`))
    );

/**
 * Search Input Section (Top Right)
 */
const SearchInputSection = ({ ui, handlers }) =>
    div(
        { class: "search-input-section" },
        div({ class: "section-header" }, span({ class: "section-title" }, "SEARCH VALUE")),
        div(
            { class: "search-input-content" },
            div(
                { class: "scan-type-row" },
                div(
                    { class: "scan-type-group" },
                    span({ class: "type-label" }, "NEW SCAN TYPE"),
                    select(
                        {
                            class: "scan-type-select",
                            value: () => ui.scanTypeNew,
                            onchange: handlers.handleNewScanTypeChange,
                            disabled: () => ui.scanSessionActive,
                        },
                        ...NEW_SCAN_TYPES.map((scanType) => option({ value: scanType }, getScanTypeLabel(scanType)))
                    )
                ),
                div(
                    { class: "scan-type-group" },
                    span({ class: "type-label" }, "NEXT SCAN TYPE"),
                    select(
                        {
                            class: "scan-type-select",
                            value: () => ui.scanTypeNext,
                            onchange: handlers.handleNextScanTypeChange,
                            disabled: () => !ui.scanSessionActive,
                        },
                        ...NEXT_SCAN_TYPES.map((scanType) => option({ value: scanType }, getScanTypeLabel(scanType)))
                    )
                )
            ),
            () => {
                const activeScanType = ui.scanSessionActive ? ui.scanTypeNext : ui.scanTypeNew;
                const showPrimaryInput = !isInputlessScanType(activeScanType);
                const showSecondaryInput = requiresSecondaryInput(activeScanType);

                return div(
                    { class: "search-input-row" },
                    div(
                        {
                            class: () => `scan-value-inputs ${showSecondaryInput ? "has-secondary" : ""}`.trim(),
                        },
                        showPrimaryInput
                            ? input({
                                  type: "text",
                                  class: "search-query-input",
                                  placeholder: handlers.getPrimaryPlaceholder(activeScanType),
                                  value: () => ui.searchQuery,
                                  oninput: handlers.handleQueryInput,
                                  onkeydown: handlers.handleKeyDown,
                              })
                            : div(
                                  { class: "scan-inputless-note" },
                                  "No input needed for " + getScanTypeLabel(activeScanType).toUpperCase()
                              ),
                        showSecondaryInput
                            ? input({
                                  type: "text",
                                  class: "search-query-input secondary-query-input",
                                  placeholder: "SECOND VALUE",
                                  value: () => ui.searchQuery2,
                                  oninput: handlers.handleQuery2Input,
                                  onkeydown: handlers.handleKeyDown,
                              })
                            : null
                    ),
                    div(
                        { class: "search-btn-group" },
                        SearchButton({
                            isSearching: () => ui.isSearching,
                            disabled: () => (ui.scanSessionActive ? false : ui.selectedKeys.length === 0),
                            onClick: () => (ui.scanSessionActive ? handlers.startNewScan() : handlers.handleSearch("new")),
                            label: () => (ui.scanSessionActive ? "NEW SCAN" : "FIRST"),
                            title: () => (ui.scanSessionActive ? "Reset and prepare a fresh first scan" : "First scan (search all selected keys)"),
                            icon: () => (ui.scanSessionActive ? Icons.Refresh() : Icons.Search()),
                        }),
                        SearchButton({
                            isSearching: () => ui.isSearching,
                            disabled: () => !ui.scanSessionActive || ui.scopePaths.length === 0,
                            onClick: () => handlers.handleSearch("next"),
                            label: "NEXT",
                            className: "secondary next-search-btn",
                            title: () =>
                                ui.scopePaths.length
                                    ? `Next search (search inside ${ui.scopePaths.length} current results)`
                                    : "Next search (run a new search first)",
                            icon: Icons.ChevronRight,
                        })
                    )
                );
            },
            div({ class: "search-type-hint" }, () => {
                const activeScanType = ui.scanSessionActive ? ui.scanTypeNext : ui.scanTypeNew;

                if (isInputlessScanType(activeScanType)) {
                    const suffix =
                        activeScanType === "changed_value" || activeScanType === "unchanged_value"
                            ? "(COMPARES AGAINST PREVIOUS RESULT LIST)"
                            : "(NUMBERS ONLY; COMPARES AGAINST PREVIOUS RESULT LIST)";

                    return span({ class: "type-label" }, "MODE: " + getScanTypeLabel(activeScanType).toUpperCase() + " " + suffix);
                }

                if (activeScanType !== "exact_value") {
                    return span(
                        { class: "type-label" },
                        "MODE: " + getScanTypeLabel(activeScanType).toUpperCase() + " (NUMBERS ONLY; STRINGS ARE IGNORED)"
                    );
                }

                return span(
                    span({ class: "type-label" }, "DETECTED TYPE: "),
                    span({ class: () => `type-value type-${ui.detectedType}` }, () => ui.detectedType.toUpperCase())
                );
            }),

        )
    );

/**
 * Results Section (Bottom Right)
 */
const ResultsSection = ({ ui, handlers }) =>
    div(
        { class: "search-results-section" },
        div(
            { class: "section-header" },
            span({ class: "section-title" }, "RESULTS"),
            button(
                {
                    class: "btn-icon refresh-btn",
                    onclick: () => handlers.handleSearch(ui.lastSearchMode),
                    disabled: () =>
                        ui.isSearching ||
                        !ui.hasSearched ||
                        (ui.lastSearchMode === "next"
                            ? ui.scopePaths.length === 0
                            : ui.selectedKeys.length === 0),
                    title: () => (ui.lastSearchMode === "next" ? "Refresh NEXT search" : "Refresh NEW search"),
                },
                Icons.Refresh()
            ),
            span(
                { class: "results-scope-badge" },
                () => {
                    const filteredCount = handlers.getFilteredResults().length;
                    const totalCount = ui.results.length;
                    if (!ui.resultsFilterApplied) {
                        return `${totalCount} RESULT${totalCount === 1 ? "" : "S"}`;
                    }
                    return `${filteredCount} / ${totalCount} SHOWN`;
                }
            )
        ),
        div(
            { class: "results-content scroll-container" },
            div(
                { class: "list-filter-row" },
                input({
                    type: "text",
                    class: "list-filter-input",
                    placeholder: "FILTER RESULTS (PATH OR VALUE)",
                    value: () => ui.resultsFilter,
                    oninput: handlers.handleResultsFilterInput,
                    disabled: () => ui.isSearching || ui.results.length === 0,
                }),
                () =>
                    ui.resultsFilter
                        ? button(
                              {
                                  class: "btn-small",
                                  onclick: handlers.clearResultsFilter,
                                  title: "Clear results filter",
                              },
                              "CLEAR"
                          )
                        : null
            ),
            () => {
                if (ui.isSearching) {
                    return Loader({ text: "Searching" });
                }

                if (ui.error) {
                    return EmptyState({
                        icon: Icons.SearchX(),
                        title: "SEARCH ERROR",
                        subtitle: ui.error,
                    });
                }

                if (ui.results.length === 0) {
                    if (ui.hasSearched) {
                        return EmptyState({
                            icon: Icons.SearchX(),
                            title: "NO RESULTS",
                            subtitle: "Try a different search value or select more keys",
                        });
                    }
                    return EmptyState({
                        icon: Icons.Search(),
                        title: "SEARCH GGA",
                        subtitle: "Enter a value and click Search to find where it's stored (empty = show all)",
                    });
                }

                const filteredResults = handlers.getFilteredResults();
                const visibleResults = filteredResults.slice(0, ui.displayLimit);
                const hasMore = filteredResults.length > ui.displayLimit;
                const remaining = filteredResults.length - ui.displayLimit;

                return div(
                    { class: "results-list" },
                    filteredResults.length === 0
                        ? EmptyState({
                              icon: Icons.SearchX(),
                              title: "NO FILTER MATCH",
                              subtitle: "Try a different path/value filter",
                          })
                        : null,
                    ...visibleResults.map((result) => ResultItem({ result, ui, handlers })),
                    hasMore
                        ? button(
                              {
                                  class: "load-more-btn",
                                  onclick: () => (ui.displayLimit += 50),
                              },
                              `LOAD MORE (${remaining} REMAINING)`
                          )
                        : null
                );
            }
        )
    );

/**
 * Saved result item component.
 */
const SavedResultItem = ({ entry, ui, handlers }) => {
    const copyFeedback = van.state(null);

    const isEditing = () => ui.savedEdit.path === entry.path;

    const handleCopy = (e) => {
        e.stopPropagation();
        const success = copyToClipboard('bEngine.gameAttributes.h.' + entry.path);
        copyFeedback.val = success ? 'success' : 'error';
        store.notify(success ? 'Path copied to clipboard' : 'Failed to copy', success ? 'success' : 'error');
        setTimeout(() => (copyFeedback.val = null), 1500);
    };

    const monitorPath = () => monitorPathForSearchResult(entry.path);
    const monitorData = () => resolveMonitorEntry(monitorPath(), store.data.monitorValues || {}).entry;
    const isMonitorEnabled = () => entry.monitorEnabled === true;
    const isMonitored = () => isMonitorEnabled() && !!monitorData();
    const liveMonitorHistory = () => (isMonitorEnabled() ? getMonitorHistory(monitorData()) : []);
    const cachedMonitorHistory = () => (Array.isArray(entry.lastHistory) ? entry.lastHistory : []);
    const monitorHistory = () => {
        if (!isMonitorEnabled()) return [];

        const liveHistory = liveMonitorHistory();
        if (liveHistory.length > 0) return liveHistory;

        return cachedMonitorHistory();
    };
    const hasLiveValue = () => liveMonitorHistory().length > 0;
    const liveRawValue = () => getMonitorCurrentValue(monitorData());
    const hasCachedLive = () =>
        Object.prototype.hasOwnProperty.call(entry, "lastLiveRaw") ||
        Object.prototype.hasOwnProperty.call(entry, "lastLiveFormatted");
    const cachedLiveDisplayValue = () => entry.lastLiveFormatted ?? entry.formattedValue;
    const liveDisplayValue = () => {
        if (hasLiveValue()) return formatMonitorValue(liveRawValue());
        return cachedLiveDisplayValue();
    };
    const liveStatusClass = () => {
        if (isMonitorEnabled()) return hasLiveValue() || hasCachedLive() ? "live-active" : "live-pending";
        return hasCachedLive() ? "live-paused" : "live-idle";
    };

    const handleMonitor = (e) => {
        e.stopPropagation();
        handlers.toggleSavedMonitor(entry.path, !isMonitorEnabled());
    };

    const handleStartEdit = (e) => {
        e.stopPropagation();
        handlers.startSavedEdit(entry);
    };

    const handleCancel = (e) => {
        e.stopPropagation();
        handlers.cancelSavedEdit();
    };

    const handleSave = (e) => {
        e.stopPropagation();
        handlers.saveSavedEdit();
    };

    const handleRemove = (e) => {
        e.stopPropagation();
        handlers.removeSavedResult(entry.path);
    };

    return div(
        {
            class: () =>
                "search-result-item saved-result-item " +
                (isMonitorEnabled() ? "monitor-enabled " : "") +
                (isMonitored() ? "monitored " : "") +
                (copyFeedback.val === "success" ? "copied" : ""),
        },
        span({ class: 'result-path' }, entry.path),
        span({ class: 'result-equals' }, '='),

        () => {
            if (!isEditing()) {
                return div(
                    { class: "saved-result-body" },
                    div(
                        { class: "saved-live-wrap" },
                        span(
                            {
                                class: () => "result-value saved-live-value " + liveStatusClass(),
                            },
                            liveDisplayValue
                        )
                    ),
                    div(
                        { class: "saved-history" },
                        () => {
                            const history = monitorHistory();

                            if (!isMonitorEnabled() || history.length === 0) {
                                return null;
                            }

                            if (canGraph(history)) {
                                return div({ class: "saved-history-content" }, Sparkline({ data: history, width: 136, height: 26 }));
                            }

                            return div(
                                { class: "saved-history-list" },
                                ...history.slice(0, 10).map((h) =>
                                    span(
                                        {
                                            class: "saved-history-item",
                                            title: new Date(h.ts).toLocaleTimeString(),
                                        },
                                        formatMonitorValue(h.value)
                                    )
                                )
                            );

                        }
                    )
                );
            }

            return input({
                class: 'result-edit-input',
                value: () => ui.savedEdit.draft,
                oninput: (e) => (ui.savedEdit.draft = e.target.value),
                onclick: (e) => e.stopPropagation(),
                onkeydown: (e) => {
                    e.stopPropagation();
                    if (e.key === 'Enter') handlers.saveSavedEdit();
                    if (e.key === 'Escape') handlers.cancelSavedEdit();
                },
            });
        },

        div(
            { class: 'result-actions' },
            () => {
                if (isEditing()) {
                    return div(
                        { class: "result-action-group" },
                        button(
                            {
                                class: 'result-action-btn save-btn',
                                title: 'Save',
                                onclick: handleSave,
                            },
                            Icons.Check()
                        ),
                        button(
                            {
                                class: 'result-action-btn cancel-btn',
                                title: 'Cancel',
                                onclick: handleCancel,
                            },
                            Icons.X()
                        )
                    );
                }

                return div(
                    { class: "result-action-group" },
                    button(
                        {
                            class: 'result-action-btn edit-btn',
                            title: 'Edit value',
                            onclick: handleStartEdit,
                        },
                        Icons.Edit()
                    ),
                    button(
                        {
                            class: () => "result-action-btn monitor-btn " + (isMonitorEnabled() ? "active" : ""),
                            title: () => (isMonitorEnabled() ? "Stop Watcher" : "Enable Watcher"),
                            onclick: handleMonitor,
                        },
                        Icons.Eye()
                    ),
                    button(
                        {
                            class: () => 'result-action-btn copy-btn ' + (copyFeedback.val === 'success' ? 'copied' : ''),
                            title: 'Copy full access path',
                            onclick: handleCopy,
                        },
                        () => (copyFeedback.val === 'success' ? Icons.Check() : Icons.Copy())
                    ),
                    button(
                        {
                            class: 'result-action-btn remove-btn',
                            title: 'Remove from saved list',
                            onclick: handleRemove,
                        },
                        Icons.X()
                    )
                );
            }
        )
    );
};

/**
 * Saved results section (bottom list).
 */
const SavedResultsSection = ({ ui, handlers }) =>
    div(
        { class: 'saved-results-section' },
        div(
            { class: 'section-header' },
            span({ class: 'section-title' }, 'SAVED LIST'),
            button(
                {
                    class: 'btn-icon refresh-btn',
                    onclick: handlers.refreshSavedResults,
                    disabled: () => ui.isRefreshingSavedResults || ui.savedResults.length === 0,
                    title: 'Refresh saved values',
                },
                Icons.Refresh()
            ),
            span(
                { class: 'results-count' },
                () => {
                    const filteredCount = handlers.getFilteredSavedResults().length;
                    const totalCount = ui.savedResults.length;
                    if (!ui.savedFilterApplied) {
                        return totalCount + ' ITEM' + (totalCount === 1 ? '' : 'S');
                    }
                    return `${filteredCount} / ${totalCount} SHOWN`;
                }
            ),
            div(
                { class: 'section-actions' },
                button(
                    {
                        class: 'btn-small',
                        onclick: handlers.clearSavedResults,
                        disabled: () => ui.savedResults.length === 0,
                        title: 'Clear saved list',
                    },
                    'CLEAR'
                )
            )
        ),
        div(
            { class: 'saved-results-content scroll-container' },
            div(
                { class: "list-filter-row" },
                input({
                    type: "text",
                    class: "list-filter-input",
                    placeholder: "FILTER SAVED (PATH OR VALUE)",
                    value: () => ui.savedFilter,
                    oninput: handlers.handleSavedFilterInput,
                    disabled: () => ui.savedResults.length === 0,
                }),
                () =>
                    ui.savedFilter
                        ? button(
                              {
                                  class: "btn-small",
                                  onclick: handlers.clearSavedFilter,
                                  title: "Clear saved filter",
                              },
                              "CLEAR"
                          )
                        : null
            ),
            () => {
                if (ui.savedResults.length === 0) {
                    return EmptyState({
                        icon: Icons.List(),
                        title: 'NO SAVED RESULTS',
                        subtitle: 'Use the list button on a search result to pin it here',
                    });
                }

                const filteredSavedResults = handlers.getFilteredSavedResults();

                return div(
                    { class: 'saved-results-list' },
                    filteredSavedResults.length === 0
                        ? EmptyState({
                              icon: Icons.List(),
                              title: "NO FILTER MATCH",
                              subtitle: "Try a different path/value filter",
                          })
                        : null,
                    ...filteredSavedResults.map((entry) => SavedResultItem({ entry, ui, handlers }))
                );
            }
        )
    );
export const Search = () => {
    const restoredWorkspace = loadSearchWorkspace() || {};
    const initialSearchQuery = typeof restoredWorkspace.searchQuery === "string" ? restoredWorkspace.searchQuery : "";

    const ui = vanX.reactive({
        allKeys: [],
        selectedKeys: uniqueStrings(restoredWorkspace.selectedKeys),
        searchQuery: initialSearchQuery,
        searchQuery2: typeof restoredWorkspace.searchQuery2 === "string" ? restoredWorkspace.searchQuery2 : "",
        resultsFilter: typeof restoredWorkspace.resultsFilter === "string" ? restoredWorkspace.resultsFilter : "",
        savedFilter: typeof restoredWorkspace.savedFilter === "string" ? restoredWorkspace.savedFilter : "",
        resultsFilterApplied: typeof restoredWorkspace.resultsFilter === "string" ? restoredWorkspace.resultsFilter : "",
        savedFilterApplied: typeof restoredWorkspace.savedFilter === "string" ? restoredWorkspace.savedFilter : "",
        detectedType: detectQueryType(initialSearchQuery),
        scanTypeNew: sanitizeScanType(restoredWorkspace.scanTypeNew, NEW_SCAN_TYPES, "exact_value"),
        scanTypeNext: sanitizeScanType(restoredWorkspace.scanTypeNext, NEXT_SCAN_TYPES, "exact_value"),
        scanSessionActive: false,
        previousSnapshot: {},
        isLoading: false,
        isSearching: false,
        results: [],
        displayLimit: 50,
        error: null,
        allKeysExpanded: restoredWorkspace.allKeysExpanded === true,
        allKeysFilter: typeof restoredWorkspace.allKeysFilter === "string" ? restoredWorkspace.allKeysFilter : "",
        scopePaths: [],
        lastSearchMode: "new",

        // inline edit state
        edit: { path: null, draft: "", type: "" },
        isSettingValue: false,

        hasSearched: false,

        // saved list state
        savedResults: Array.isArray(restoredWorkspace.savedResults)
            ? restoredWorkspace.savedResults.map(normalizeSavedEntry).filter(Boolean)
            : [],
        savedEdit: { path: null, draft: "", type: "" },
        isRefreshingSavedResults: false,
    });

    const getValidFavorites = () => FAVORITE_KEYS.filter((k) => ui.allKeys.includes(k));

    const getOtherKeys = () => {
        const favSet = new Set(FAVORITE_KEYS);
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
    let resultsFilterSeq = 0;
    let savedFilterSeq = 0;
    let workspacePersistTimer = null;
    let initialSavedSyncCompleted = false;
    let initialSavedSyncTimer = null;
    const subscribedMonitorPaths = new Set();
    const pendingMonitorIntentByPath = new Map();
    const PENDING_MONITOR_INTENT_TTL_MS = 5000;
    const filterCache = {
        results: { source: null, query: "", values: [] },
        saved: { source: null, query: "", values: [] },
    };

    const getPendingMonitorIntent = (path) => {
        const pending = pendingMonitorIntentByPath.get(path);
        if (!pending) return null;

        if (Date.now() - pending.ts > PENDING_MONITOR_INTENT_TTL_MS) {
            pendingMonitorIntentByPath.delete(path);
            return null;
        }

        return pending;
    };

    const setPendingMonitorIntent = (path, enabled) => {
        pendingMonitorIntentByPath.set(path, { enabled: enabled === true, ts: Date.now() });
    };

    const normalizeSavedResults = (entries) => {
        return Array.isArray(entries) ? entries.map(normalizeSavedEntry).filter(Boolean) : [];
    };

    const applySharedSavedResults = (sharedEntries, currentEntries) => {
        const currentByPath = new Map((currentEntries || []).map((entry) => [entry.path, entry]));
        const next = [];
        let changed = (sharedEntries || []).length !== (currentEntries || []).length;

        for (const sharedEntry of sharedEntries || []) {
            const current = currentByPath.get(sharedEntry.path);

            const pending = getPendingMonitorIntent(sharedEntry.path);
            if (pending) {
                if (sharedEntry.monitorEnabled === pending.enabled) {
                    pendingMonitorIntentByPath.delete(sharedEntry.path);
                } else if (current) {
                    next.push(current);
                    continue;
                }
            }

            if (current && JSON.stringify(current) === JSON.stringify(sharedEntry)) {
                next.push(current);
            } else {
                next.push(sharedEntry);
                changed = true;
            }
        }

        return { changed, next };
    };

    const reconcileMonitorSubscriptions = () => {
        const desiredPaths = new Set();

        for (const entry of ui.savedResults) {
            if (!entry?.path) continue;

            const pending = getPendingMonitorIntent(entry.path);
            const monitorEnabled = pending ? pending.enabled : entry.monitorEnabled;
            if (monitorEnabled === false) continue;

            desiredPaths.add(entry.path);
        }

        for (const path of desiredPaths) {
            if (subscribedMonitorPaths.has(path)) continue;
            store.subscribeMonitor(monitorPathForSearchResult(path));
            subscribedMonitorPaths.add(path);
        }

        for (const path of [...subscribedMonitorPaths]) {
            if (desiredPaths.has(path)) continue;

            const monitorPath = monitorPathForSearchResult(path);
            const resolvedMonitor = getResolvedMonitorEntry(monitorPath);
            if (resolvedMonitor.id) {
                store.unsubscribeMonitor(resolvedMonitor.id);
            }
            subscribedMonitorPaths.delete(path);
        }
    };

    const startInitialSavedSync = (seedEntries) => {
        const normalizedSeed = normalizeSavedResults(seedEntries);
        if (normalizedSeed.length === 0) {
            initialSavedSyncCompleted = true;
            return;
        }

        const sendSeed = () => {
            store.syncSavedList(normalizedSeed);
        };

        sendSeed();

        let attempts = 0;
        const maxAttempts = 20;
        initialSavedSyncTimer = setInterval(() => {
            if (initialSavedSyncCompleted || store.data.savedListStateReady || attempts >= maxAttempts) {
                clearInterval(initialSavedSyncTimer);
                initialSavedSyncTimer = null;
                return;
            }

            sendSeed();
            attempts += 1;
        }, 500);
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
        if (!store.data.savedListStateReady) {
            return;
        }

        const sharedEntries = normalizeSavedResults(store.data.savedListState);

        if (!initialSavedSyncCompleted && sharedEntries.length === 0 && ui.savedResults.length > 0) {
            store.syncSavedList(ui.savedResults);
            return;
        }

        initialSavedSyncCompleted = true;

        if (initialSavedSyncTimer !== null) {
            clearInterval(initialSavedSyncTimer);
            initialSavedSyncTimer = null;
        }

        if (sharedEntries.length === 0 && ui.savedResults.length === 0) {
            reconcileMonitorSubscriptions();
            return;
        }

        const applied = applySharedSavedResults(sharedEntries, ui.savedResults);
        if (applied.changed) {
            ui.savedResults = applied.next;
        }

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
        clearSelection: () => (ui.selectedKeys = []),

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
                initialHistory.length > 0
                    ? initialHistory
                    : [{ value: getResultValue(result), ts: Date.now() }];

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

            pendingMonitorIntentByPath.delete(result.path);
            store.subscribeMonitor(monitorPath);
            subscribedMonitorPaths.add(result.path);
            store.emitSavedListEvent({ action: "upsert", entry });

            store.notify(`Added ${result.path} to saved list and enabled watcher`, "success");
        },

        toggleSavedMonitor: (path, enabled) => {
            setPendingMonitorIntent(path, enabled);

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
                store.emitSavedListEvent({ action: "set-monitor-enabled", path, enabled: true });
                store.notify("Enabled watcher for " + path);
                return;
            }

            if (resolvedMonitor.id) {
                store.unsubscribeMonitor(resolvedMonitor.id);
            }
            subscribedMonitorPaths.delete(path);
            store.emitSavedListEvent({ action: "set-monitor-enabled", path, enabled: false });
            store.notify("Stopped watcher for " + path);
        },

        removeSavedResult: (path) => {
            pendingMonitorIntentByPath.delete(path);
            const monitorPath = monitorPathForSearchResult(path);
            const resolvedMonitor = getResolvedMonitorEntry(monitorPath);
            if (resolvedMonitor.id) {
                store.unsubscribeMonitor(resolvedMonitor.id);
            }
            subscribedMonitorPaths.delete(path);
            store.emitSavedListEvent({ action: "remove", path });

            ui.savedResults = ui.savedResults.filter((entry) => entry.path !== path);
            if (ui.savedEdit.path === path) handlers.cancelSavedEdit();
            store.notify(`Removed ${path} from saved list`);
        },

        clearSavedResults: () => {
            if (ui.savedResults.length === 0) return;

            for (const entry of ui.savedResults) {
                pendingMonitorIntentByPath.delete(entry.path);
                const monitorPath = monitorPathForSearchResult(entry.path);
                const resolvedMonitor = getResolvedMonitorEntry(monitorPath);
                if (resolvedMonitor.id) {
                    store.unsubscribeMonitor(resolvedMonitor.id);
                }
                subscribedMonitorPaths.delete(entry.path);
            }

            store.emitSavedListEvent({ action: "clear" });

            ui.savedResults = [];
            handlers.cancelSavedEdit();
            store.notify("Saved list cleared");
        },

        refreshSavedResults: async () => {
            if (ui.savedResults.length === 0) return;

            const withinPaths = ui.savedResults.map((entry) => entry.path);

            try {
                ui.isRefreshingSavedResults = true;

                const data = await API.searchGga("", ui.selectedKeys, { withinPaths });
                const nextByPath = new Map((data.results || []).map((entry) => [entry.path, entry]));

                const updatedEntries = [];

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

                    updatedEntries.push(updated);
                    return updated;
                });

                for (const entry of updatedEntries) {
                    store.emitSavedListEvent({ action: "upsert", entry });
                }

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
                const resp = await API.setGgaValue(ui.savedEdit.path, validation.valueToSend);
                updateValueInUi(ui.savedEdit.path, resp);
                const updatedSavedEntry = ui.savedResults.find((entry) => entry.path === ui.savedEdit.path);
                if (updatedSavedEntry) {
                    store.emitSavedListEvent({ action: "upsert", entry: updatedSavedEntry });
                }
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
                const resp = await API.setGgaValue(ui.edit.path, validation.valueToSend);
                updateValueInUi(ui.edit.path, resp);
                const updatedSavedEntry = ui.savedResults.find((entry) => entry.path === ui.edit.path);
                if (updatedSavedEntry) {
                    store.emitSavedListEvent({ action: "upsert", entry: updatedSavedEntry });
                }

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

            if (!inputless && scanType !== "exact_value" && queryTrimmed === "") {
                store.notify("Enter a value for this scan type", "error");
                return;
            }

            if ((scanType === "bigger_than" || scanType === "smaller_than" || scanType === "increased_value_by" || scanType === "decreased_value_by") && (queryTrimmed === "" || Number.isNaN(Number(queryTrimmed)))) {
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
                            ? await API.searchGga(query, ui.selectedKeys, requestOptions)
                            : await API.searchGga(query, ui.selectedKeys)
                        : isNext
                          ? await API.searchGga("", ui.selectedKeys, requestOptions)
                          : await API.searchGga("", ui.selectedKeys);

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
                ui.results = [];
                ui.scopePaths = [];
            } finally {
                ui.isSearching = false;
            }
        },
    };

    (async () => {
        ui.isLoading = true;
        ui.error = null;
        try {
            const allKeys = await API.fetchGgaKeys();
            ui.allKeys = allKeys;
            const validFavorites = getValidFavorites();
            ui.selectedKeys = pickInitialSelectedKeys(allKeys, restoredWorkspace.selectedKeys, validFavorites);
        } catch (err) {
            ui.error = err.message || "Failed to load GGA keys";
        } finally {
            ui.isLoading = false;
        }

        startInitialSavedSync(ui.savedResults);
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
