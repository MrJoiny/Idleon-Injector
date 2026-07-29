import van from "../../../vendor/van-1.6.0.js";
import store from "../../../state/store.js";
import { copyToClipboard } from "../../../utils/index.js";
import { Loader } from "../../Loader.js";
import { EmptyState } from "../../EmptyState.js";
import { Sparkline, canGraph } from "../../Sparkline.js";
import { Icons } from "../../../assets/icons.js";
import {
    NEW_SCAN_TYPES,
    NEXT_SCAN_TYPES,
    getScanTypeLabel,
    getScanTypePlaceholder,
    isInputlessScanType,
    requiresSecondaryInput,
} from "./scanUtils.js";
import {
    monitorPathForSearchResult,
    formatDisplayValue,
    getMonitorHistory,
    resolveMonitorEntry,
} from "./valueUtils.js";
import { createStaticRowReconciler } from "../account/accountShared.js";

const { div, input, button, span, label, select, option, aside } = van.tags;

const KeyCheckbox = ({ keyName, selectedKeys, onChange, isFavorite, onToggleFavorite }) => {
    const isChecked = () => selectedKeys.includes(keyName);
    const favorite = () => isFavorite(keyName);

    return div(
        { class: () => `key-checkbox ${isChecked() ? "checked" : ""}`, title: keyName },
        label(
            { class: "key-checkbox-select" },
            input({
                type: "checkbox",
                checked: isChecked,
                onchange: (e) => onChange(keyName, e.target.checked),
            }),
            span({ class: "key-checkbox-label" }, keyName)
        ),
        button(
            {
                type: "button",
                class: () => `key-favorite-btn ${favorite() ? "active" : ""}`,
                title: () => (favorite() ? "Remove from favorites" : "Add to favorites"),
                "aria-label": () =>
                    `${favorite() ? "Remove" : "Add"} ${keyName} ${favorite() ? "from" : "to"} favorites`,
                "aria-pressed": () => String(favorite()),
                onclick: () => onToggleFavorite(keyName),
            },
            Icons.Star()
        )
    );
};

const ResultItem = ({ result, ui, handlers }) => {
    const copyFeedback = van.state(null);

    const isEditing = () => ui.edit.path === result.path && ui.edit.surface !== "inspector";
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
            class: () =>
                "search-result-item " +
                (ui.selectedResultPath === result.path ? "is-selected " : "") +
                (copyFeedback.val === "success" ? "copied" : ""),
            onclick: (event) => handlers.selectResult(result, event),
            onkeydown: (event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                handlers.selectResult(result, event);
            },
            tabindex: 0,
            "aria-current": () => (ui.selectedResultPath === result.path ? "true" : "false"),
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

        div({ class: "result-actions" }, () => {
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
                    Icons.Pencil()
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
        })
    );
};

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
            class: () => `btn-primary search-btn ${className} ${isSearching() ? "loading" : ""}`.trim(),
            onclick: onClick,
            disabled: () => isSearching() || disabled(),
            title,
        },
        () => (isSearching() ? "..." : typeof label === "function" ? label() : label),
        icon()
    );

export const KeysSection = ({ ui, handlers }) =>
    div(
        {
            id: "search-keys-panel",
            class: () => `search-keys-section ${ui.keysOpen ? "is-open" : ""}`,
            role: () => (ui.keysOverlay ? "dialog" : "navigation"),
            "aria-modal": () => String(ui.keysOverlay && ui.keysOpen),
            "aria-hidden": () => String(ui.keysOverlay && !ui.keysOpen),
            "aria-label": "Search keys",
            onkeydown: handlers.handleKeysPanelKeydown,
        },
        div(
            { class: "section-header" },
            span({ class: "section-title" }, "SEARCH IN KEYS"),
            div(
                { class: "section-actions" },
                button(
                    {
                        class: () => `btn-secondary btn-small ${handlers.areAllSelected() ? "active" : ""}`,
                        onclick: handlers.toggleAll,
                        title: () => (handlers.areAllSelected() ? "Deselect all keys" : "Select all keys"),
                    },
                    () => (handlers.areAllSelected() ? "NONE" : "ALL")
                ),
                button(
                    {
                        class: "btn-secondary btn-small",
                        onclick: () => handlers.selectKeys(handlers.getValidFavorites()),
                        disabled: () => handlers.getValidFavorites().length === 0,
                        title: "Select favorite keys",
                    },
                    "FAV"
                ),
                button(
                    { class: "btn-secondary btn-small", onclick: handlers.clearSelection, title: "Clear selection" },
                    "CLEAR"
                ),
                button(
                    {
                        class: "search-keys-close",
                        onclick: handlers.closeKeysPane,
                        title: "Close key navigation",
                        "aria-label": "Close key navigation",
                    },
                    Icons.X()
                )
            )
        ),
        div(
            { class: "keys-content scroll-container" },
            div(
                { class: "keys-group" },
                div({ class: "keys-group-header" }, () => `FAVORITES (${handlers.getValidFavorites().length})`),
                () => {
                    const favorites = handlers.getValidFavorites();
                    if (ui.isLoading) return div({ class: "keys-loading" }, "Loading");
                    if (favorites.length === 0) return div({ class: "keys-loading" }, "No favorite keys");

                    return div(
                        { class: "keys-grid" },
                        ...favorites.map((key) =>
                            KeyCheckbox({
                                keyName: key,
                                selectedKeys: ui.selectedKeys,
                                onChange: handlers.handleKeyChange,
                                isFavorite: handlers.isFavoriteKey,
                                onToggleFavorite: handlers.toggleFavoriteKey,
                            })
                        )
                    );
                }
            ),
            div(
                { class: "keys-group" },
                div({ class: "keys-group-header" }, () => `OTHER KEYS (${handlers.getFilteredKeys().length})`),
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
                    if (ui.isLoading) return div({ class: "keys-loading" }, "Loading");

                    const keys = handlers.getFilteredKeys();
                    if (keys.length === 0) return div({ class: "keys-loading" }, "No keys match this filter");

                    return div(
                        { class: "keys-grid" },
                        ...keys.map((key) =>
                            KeyCheckbox({
                                keyName: key,
                                selectedKeys: ui.selectedKeys,
                                onChange: handlers.handleKeyChange,
                                isFavorite: handlers.isFavoriteKey,
                                onToggleFavorite: handlers.toggleFavoriteKey,
                            })
                        )
                    );
                }
            )
        ),
        div({ class: "keys-footer" }, () =>
            span({ class: "selected-count" }, `${ui.selectedKeys.length} keys selected`)
        )
    );

export const SearchInputSection = ({ ui, handlers }) =>
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
                                  class: "search-query-input global-search-input",
                                  placeholder: getScanTypePlaceholder(activeScanType),
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
                            onClick: () =>
                                ui.scanSessionActive ? handlers.startNewScan() : handlers.handleSearch("new"),
                            label: () => (ui.scanSessionActive ? "NEW SCAN" : "FIRST"),
                            title: () =>
                                ui.scanSessionActive
                                    ? "Reset and prepare a fresh first scan"
                                    : "First scan (search all selected keys)",
                            icon: () => (ui.scanSessionActive ? Icons.Refresh() : Icons.Search()),
                        }),
                        SearchButton({
                            isSearching: () => ui.isSearching,
                            disabled: () => !ui.scanSessionActive || ui.scopePaths.length === 0,
                            onClick: () => handlers.handleSearch("next"),
                            label: "NEXT",
                            className: "next-search-btn",
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
                    if (activeScanType === "unknown_initial_value") {
                        return span(
                            { class: "type-label" },
                            "MODE: " + getScanTypeLabel(activeScanType).toUpperCase() + " (SEARCHES FOR ANY VALUE)"
                        );
                    }

                    const suffix =
                        activeScanType === "changed_value" || activeScanType === "unchanged_value"
                            ? "(COMPARES AGAINST PREVIOUS RESULT LIST)"
                            : "(NUMBERS ONLY; COMPARES AGAINST PREVIOUS RESULT LIST)";

                    return span(
                        { class: "type-label" },
                        "MODE: " + getScanTypeLabel(activeScanType).toUpperCase() + " " + suffix
                    );
                }

                if (activeScanType !== "exact_value") {
                    return span(
                        { class: "type-label" },
                        "MODE: " +
                            getScanTypeLabel(activeScanType).toUpperCase() +
                            " (NUMBERS ONLY; STRINGS ARE IGNORED)"
                    );
                }

                return span(
                    span({ class: "type-label" }, "DETECTED TYPE: "),
                    span({ class: () => `type-value type-${ui.detectedType}` }, () => ui.detectedType.toUpperCase())
                );
            })
        )
    );

export const ResultsSection = ({ ui, handlers }) =>
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
                        (ui.lastSearchMode === "next" ? ui.scopePaths.length === 0 : ui.selectedKeys.length === 0),
                    title: () => (ui.lastSearchMode === "next" ? "Refresh NEXT search" : "Refresh NEW search"),
                },
                Icons.Refresh()
            ),
            span({ class: "results-scope-badge" }, () => {
                const filteredCount = handlers.getFilteredResults().length;
                const totalCount = ui.results.length;
                if (!ui.resultsFilterApplied) {
                    return `${totalCount} RESULT${totalCount === 1 ? "" : "S"}`;
                }
                return `${filteredCount} / ${totalCount} SHOWN`;
            })
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
                                  class: "btn-secondary btn-small",
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
                        subtitle: "Enter a value and click Search, or use UNKNOWN INITIAL VALUE to scan all values",
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

// Returns { node, sync }: the node is cached and reused by SavedResultsSection's
// row reconciler, and sync(entry) pushes fresh entry data into the row's state
// so the DOM identity (and per-row copy feedback) survives list rebuilds.
const SavedResultItem = ({ entry: initialEntry, ui, handlers }) => {
    const entryState = van.state(initialEntry);
    const path = initialEntry.path;
    const copyFeedback = van.state(null);

    const isEditing = () => ui.savedEdit.path === path;

    const handleCopy = (e) => {
        e.stopPropagation();
        const success = copyToClipboard("bEngine.gameAttributes.h." + path);
        copyFeedback.val = success ? "success" : "error";
        store.notify(success ? "Path copied to clipboard" : "Failed to copy", success ? "success" : "error");
        setTimeout(() => (copyFeedback.val = null), 1500);
    };

    const monitorPath = monitorPathForSearchResult(path);
    const monitorData = () => resolveMonitorEntry(monitorPath, store.data.monitorValues || {}).entry;
    const isMonitorEnabled = () => entryState.val.monitorEnabled === true;
    const isMonitored = () => isMonitorEnabled() && !!monitorData();
    const monitorError = () => (isMonitorEnabled() ? monitorData()?.error || null : null);
    const liveMonitorHistory = () => (isMonitorEnabled() ? getMonitorHistory(monitorData()) : []);
    const monitorHistory = () => {
        if (!isMonitorEnabled()) return [];

        const liveHistory = liveMonitorHistory();
        if (liveHistory.length > 0) return liveHistory;

        return Array.isArray(entryState.val.lastHistory) ? entryState.val.lastHistory : [];
    };
    const hasLiveValue = () => liveMonitorHistory().length > 0;
    const liveDisplayValue = () => {
        if (hasLiveValue()) return formatDisplayValue(getMonitorHistory(monitorData())[0]?.value);
        return entryState.val.formattedValue;
    };
    const liveStatusClass = () => {
        if (!isMonitorEnabled()) return "live-paused";
        if (monitorError()) return "live-error";
        return hasLiveValue() ? "live-active" : "live-pending";
    };

    const handleMonitor = (e) => {
        e.stopPropagation();
        if (e.currentTarget && typeof e.currentTarget.blur === "function") {
            e.currentTarget.blur();
        }

        handlers.toggleSavedMonitor(path, !isMonitorEnabled());
    };

    const handleStartEdit = (e) => {
        e.stopPropagation();
        handlers.startSavedEdit(entryState.val);
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
        handlers.removeSavedResult(path);
    };

    const node = div(
        {
            class: () =>
                "search-result-item saved-result-item " +
                (isMonitorEnabled() ? "monitor-enabled " : "") +
                (isMonitored() ? "monitored " : "") +
                (copyFeedback.val === "success" ? "copied" : ""),
        },
        span({ class: "result-path" }, path),
        span({ class: "result-equals" }, "="),

        () => {
            if (!isEditing()) {
                return div(
                    { class: "saved-result-body" },
                    div(
                        { class: "saved-live-wrap" },
                        span(
                            {
                                class: () => "result-value saved-live-value " + liveStatusClass(),
                                title: () => monitorError() || "",
                            },
                            liveDisplayValue
                        )
                    ),
                    div({ class: "saved-history" }, () => {
                        const history = monitorHistory();

                        if (!isMonitorEnabled() || history.length === 0) {
                            return null;
                        }

                        if (canGraph(history)) {
                            return div(
                                { class: "saved-history-content" },
                                Sparkline({ data: history, width: 136, height: 26 })
                            );
                        }

                        return div(
                            { class: "saved-history-list" },
                            ...history.slice(0, 10).map((h) =>
                                span(
                                    {
                                        class: "saved-history-item",
                                        title: new Date(h.ts).toLocaleTimeString(),
                                    },
                                    formatDisplayValue(h.value)
                                )
                            )
                        );
                    })
                );
            }

            return input({
                class: "result-edit-input",
                value: () => ui.savedEdit.draft,
                oninput: (e) => (ui.savedEdit.draft = e.target.value),
                onclick: (e) => e.stopPropagation(),
                onkeydown: (e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") handlers.saveSavedEdit();
                    if (e.key === "Escape") handlers.cancelSavedEdit();
                },
            });
        },

        div({ class: "result-actions" }, () => {
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
                    Icons.Pencil()
                ),
                button(
                    {
                        class: () => "result-action-btn monitor-btn " + (isMonitorEnabled() ? "active" : ""),
                        title: () =>
                            monitorError()
                                ? "Watcher failed: " + monitorError()
                                : isMonitorEnabled()
                                  ? "Stop Watcher"
                                  : "Enable Watcher",
                        onclick: handleMonitor,
                    },
                    Icons.Eye()
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
                        class: "result-action-btn remove-btn",
                        title: "Remove from saved list",
                        onclick: handleRemove,
                    },
                    Icons.X()
                )
            );
        })
    );

    return { node, sync: (nextEntry) => (entryState.val = nextEntry) };
};

export const SavedResultsSection = ({ ui, handlers }) => {
    const rowCache = new Map();
    const listNode = div({ class: "saved-results-list" });
    const reconcile = createStaticRowReconciler(listNode);

    const getRow = (entry) => {
        const cached = rowCache.get(entry.path);
        if (cached) {
            cached.sync(entry);
            return cached;
        }
        const row = SavedResultItem({ entry, ui, handlers });
        rowCache.set(entry.path, row);
        return row;
    };

    const renderRows = () => {
        // Drop cached rows whose path is no longer saved.
        const savedPaths = new Set(ui.savedResults.map((e) => e.path));
        for (const key of [...rowCache.keys()]) {
            if (!savedPaths.has(key)) rowCache.delete(key);
        }

        if (ui.savedResults.length === 0) {
            reconcile("empty", [
                EmptyState({
                    icon: Icons.List(),
                    title: "NO SAVED RESULTS",
                    subtitle: "Use the list button on a search result to pin it here",
                }),
            ]);
            return;
        }

        const filtered = handlers.getFilteredSavedResults();
        if (filtered.length === 0) {
            reconcile("no-match", [
                EmptyState({
                    icon: Icons.List(),
                    title: "NO FILTER MATCH",
                    subtitle: "Try a different path/value filter",
                }),
            ]);
            return;
        }

        // Rebuild the DOM only when the visible path set changes; a value-only
        // edit keeps the same signature and updates via each row's sync().
        const rows = filtered.map((entry) => getRow(entry).node);
        reconcile("rows:" + filtered.map((e) => e.path).join("|"), rows);
    };

    van.derive(() => {
        ui.savedResults;
        ui.savedFilterApplied;
        renderRows();
    });

    return div(
        { class: "saved-results-section" },
        div(
            { class: "section-header" },
            span({ class: "section-title" }, "SAVED LIST"),
            button(
                {
                    class: "btn-icon refresh-btn",
                    onclick: handlers.refreshSavedResults,
                    disabled: () => ui.isRefreshingSavedResults || ui.savedResults.length === 0,
                    title: "Refresh saved values",
                },
                Icons.Refresh()
            ),
            span({ class: "results-count" }, () => {
                const filteredCount = handlers.getFilteredSavedResults().length;
                const totalCount = ui.savedResults.length;
                if (!ui.savedFilterApplied) {
                    return totalCount + " ITEM" + (totalCount === 1 ? "" : "S");
                }
                return `${filteredCount} / ${totalCount} SHOWN`;
            }),
            div(
                { class: "section-actions" },
                button(
                    {
                        class: "btn-secondary btn-small",
                        onclick: handlers.clearSavedResults,
                        disabled: () => ui.savedResults.length === 0,
                        title: "Clear saved list",
                    },
                    "CLEAR"
                )
            )
        ),
        div(
            { class: "saved-results-content scroll-container" },
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
                                  class: "btn-secondary btn-small",
                                  onclick: handlers.clearSavedFilter,
                                  title: "Clear saved filter",
                              },
                              "CLEAR"
                          )
                        : null
            ),
            listNode
        )
    );
};

const SelectedResultSection = ({ result, ui, handlers }) => {
    const copyFeedback = van.state(false);
    const savedEntry = () => ui.savedResults.find((entry) => entry.path === result.path) || null;
    const isEditing = () => ui.edit.path === result.path && ui.edit.surface === "inspector";
    const monitorEntry = () =>
        resolveMonitorEntry(monitorPathForSearchResult(result.path), store.data.monitorValues || {}).entry;
    const monitorHistory = () => (savedEntry()?.monitorEnabled === false ? [] : getMonitorHistory(monitorEntry()));

    const copyPath = () => {
        const success = copyToClipboard("bEngine.gameAttributes.h." + result.path);
        copyFeedback.val = success;
        store.notify(success ? "Path copied to clipboard" : "Failed to copy", success ? "success" : "error");
        if (success) setTimeout(() => (copyFeedback.val = false), 1500);
    };

    const toggleSavedMonitor = () => {
        const entry = savedEntry();
        if (!entry) {
            handlers.addToSavedResults(result);
            return;
        }
        handlers.toggleSavedMonitor(result.path, entry.monitorEnabled === false);
    };

    return div(
        { class: "search-selected-result" },
        div(
            { class: "selected-result-heading" },
            span({ class: "selected-result-kicker" }, "GGA PATH"),
            span({ class: "selected-result-path" }, result.path)
        ),
        div(
            { class: "selected-result-meta" },
            div(span("Type"), span({ class: `type-${result.type}` }, result.type || "unknown")),
            div(
                span("Saved"),
                span(() => (savedEntry() ? "Yes" : "No"))
            ),
            div(
                span("Watcher"),
                span(() => {
                    const entry = savedEntry();
                    if (!entry) return "Not saved";
                    if (entry.monitorEnabled === false) return "Paused";
                    return monitorEntry()?.error ? "Error" : monitorEntry() ? "Live" : "Pending";
                })
            )
        ),
        div({ class: "selected-result-value" }, span({ class: "selected-result-label" }, "VALUE"), () =>
            isEditing()
                ? input({
                      class: "result-edit-input selected-result-edit-input",
                      value: () => ui.edit.draft,
                      oninput: (event) => (ui.edit.draft = event.target.value),
                      onkeydown: (event) => {
                          event.stopPropagation();
                          if (event.key === "Enter") handlers.saveEdit();
                          if (event.key === "Escape") handlers.cancelEdit();
                      },
                  })
                : span({ class: `selected-result-display type-${result.type}` }, result.formattedValue)
        ),
        div({ class: "selected-result-history" }, () => {
            const history = monitorHistory();
            if (history.length === 0) {
                return span({ class: "selected-result-history-empty" }, "Save this path to retain a live monitor.");
            }
            if (canGraph(history)) {
                return div(
                    { class: "selected-result-sparkline" },
                    Sparkline({ data: history, width: 280, height: 54 })
                );
            }
            return div(
                { class: "selected-result-history-values" },
                ...history
                    .slice(0, 10)
                    .map((entry) =>
                        span({ title: new Date(entry.ts).toLocaleTimeString() }, formatDisplayValue(entry.value))
                    )
            );
        }),
        div(
            { class: "selected-result-actions" },
            () =>
                isEditing()
                    ? div(
                          { class: "selected-result-edit-actions" },
                          button({ class: "btn-primary", onclick: handlers.saveEdit }, "Save value"),
                          button({ class: "btn-secondary", onclick: handlers.cancelEdit }, "Cancel")
                      )
                    : div(
                          { class: "selected-result-edit-actions" },
                          button(
                              { class: "btn-primary", onclick: () => handlers.startInspectorEdit(result) },
                              Icons.Pencil(),
                              "Edit value"
                          ),
                          button({ class: "btn-secondary", onclick: copyPath }, () =>
                              copyFeedback.val ? "Copied" : "Copy path"
                          )
                      ),
            button(
                {
                    class: () =>
                        `btn-secondary selected-monitor-action ${savedEntry() && savedEntry().monitorEnabled !== false ? "active" : ""}`,
                    onclick: toggleSavedMonitor,
                },
                Icons.Eye(),
                () => {
                    const entry = savedEntry();
                    if (!entry) return "Save & monitor";
                    return entry.monitorEnabled === false ? "Resume monitor" : "Pause monitor";
                }
            )
        )
    );
};

export const SearchInspector = ({ ui, handlers }) => {
    const savedSection = SavedResultsSection({ ui, handlers });
    const inspector = aside(
        {
            id: "search-inspector",
            class: () => `search-inspector ${ui.inspectorOpen ? "is-open" : ""}`,
            role: () => (ui.inspectorOverlay ? "dialog" : "complementary"),
            "aria-modal": () => String(ui.inspectorOverlay && ui.inspectorOpen),
            "aria-hidden": () => String(ui.inspectorOverlay && !ui.inspectorOpen),
            "aria-label": "Search inspector",
            onkeydown: handlers.handleInspectorKeydown,
        },
        div(
            { class: "search-inspector-header" },
            div(
                { class: "search-inspector-tabs", role: "tablist", "aria-label": "Search inspector views" },
                button(
                    {
                        class: () => `search-inspector-tab ${ui.inspectorTab === "selected" ? "active" : ""}`,
                        role: "tab",
                        "aria-selected": () => String(ui.inspectorTab === "selected"),
                        onclick: () => (ui.inspectorTab = "selected"),
                    },
                    "Selected"
                ),
                button(
                    {
                        class: () => `search-inspector-tab ${ui.inspectorTab === "saved" ? "active" : ""}`,
                        role: "tab",
                        "aria-selected": () => String(ui.inspectorTab === "saved"),
                        onclick: () => (ui.inspectorTab = "saved"),
                    },
                    "Saved",
                    span({ class: "search-inspector-count" }, () => ui.savedResults.length)
                )
            ),
            button(
                {
                    class: "search-inspector-close",
                    onclick: handlers.closeInspector,
                    "aria-label": "Close search inspector",
                    title: "Close inspector",
                },
                Icons.X()
            )
        ),
        div(
            {
                class: () => `search-inspector-panel ${ui.inspectorTab === "selected" ? "active" : ""}`,
                role: "tabpanel",
            },
            () => {
                const selected = handlers.getSelectedResult();
                if (!selected) {
                    return EmptyState({
                        icon: Icons.Search(),
                        title: "NO RESULT SELECTED",
                        subtitle: "Select a result to inspect its path, value and monitor state",
                    });
                }
                return SelectedResultSection({ result: selected, ui, handlers });
            }
        ),
        div(
            {
                class: () => `search-inspector-panel ${ui.inspectorTab === "saved" ? "active" : ""}`,
                role: "tabpanel",
            },
            savedSection
        )
    );

    van.derive(() => {
        if (!ui.inspectorOverlay || !ui.inspectorOpen) return;
        setTimeout(() => inspector.querySelector(".search-inspector-tab.active")?.focus(), 0);
    });

    return div(
        { class: "search-inspector-layer" },
        button({
            type: "button",
            class: () => `search-inspector-backdrop ${ui.inspectorOpen ? "is-open" : ""}`,
            onclick: handlers.closeInspector,
            tabindex: () => (ui.inspectorOpen ? 0 : -1),
            "aria-label": "Close search inspector",
        }),
        inspector
    );
};
