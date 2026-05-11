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
    isInputlessScanType,
    requiresSecondaryInput,
} from "./scanUtils.js";
import {
    monitorPathForSearchResult,
    formatMonitorValue,
    getMonitorHistory,
    getMonitorCurrentValue,
    resolveMonitorEntry,
} from "./valueUtils.js";

const { div, input, button, span, label, details, summary, select, option } = van.tags;

const KeyCheckbox = ({ keyName, selectedKeys, onChange, isFavorite, onToggleFavorite }) => {
    const isChecked = () => selectedKeys.includes(keyName);
    const favorite = () => (typeof isFavorite === "function" ? isFavorite(keyName) : false);

    return label(
        { class: () => `key-checkbox ${isChecked() ? "checked" : ""}`, title: keyName },
        input({
            type: "checkbox",
            checked: isChecked,
            onchange: (e) => onChange(keyName, e.target.checked),
        }),
        span({ class: "key-checkbox-label" }, keyName),
        button(
            {
                class: () => `key-favorite-btn ${favorite() ? "active" : ""}`,
                title: () => (favorite() ? "Remove from favorites" : "Add to favorites"),
                onclick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite(keyName);
                },
            },
            Icons.Star()
        )
    );
};

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
        { class: "search-keys-section" },
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
                        title: "Select all favorites",
                    },
                    "FAV"
                ),
                button(
                    { class: "btn-secondary btn-small", onclick: handlers.clearSelection, title: "Clear selection" },
                    "CLEAR"
                )
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
                            isFavorite: handlers.isFavoriteKey,
                            onToggleFavorite: handlers.toggleFavoriteKey,
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
                                    isFavorite: handlers.isFavoriteKey,
                                    onToggleFavorite: handlers.toggleFavoriteKey,
                                })
                            )
                        );
                    }
                )
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

const SavedResultItem = ({ entry, ui, handlers }) => {
    const copyFeedback = van.state(null);

    const isEditing = () => ui.savedEdit.path === entry.path;

    const handleCopy = (e) => {
        e.stopPropagation();
        const success = copyToClipboard("bEngine.gameAttributes.h." + entry.path);
        copyFeedback.val = success ? "success" : "error";
        store.notify(success ? "Path copied to clipboard" : "Failed to copy", success ? "success" : "error");
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
        if (e.currentTarget && typeof e.currentTarget.blur === "function") {
            e.currentTarget.blur();
        }

        if (handlers.isMonitorToggleLocked(entry.path)) {
            return;
        }

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
        span({ class: "result-path" }, entry.path),
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
                                    formatMonitorValue(h.value)
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
                        title: () => (isMonitorEnabled() ? "Stop Watcher" : "Enable Watcher"),
                        onclick: handleMonitor,
                        disabled: () => handlers.isMonitorToggleLocked(entry.path),
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
};

export const SavedResultsSection = ({ ui, handlers }) =>
    div(
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
            () => {
                if (ui.savedResults.length === 0) {
                    return EmptyState({
                        icon: Icons.List(),
                        title: "NO SAVED RESULTS",
                        subtitle: "Use the list button on a search result to pin it here",
                    });
                }

                const filteredSavedResults = handlers.getFilteredSavedResults();

                return div(
                    { class: "saved-results-list" },
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
