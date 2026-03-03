import van from "../../vendor/van-1.6.0.js";
import vanX from "../../vendor/van-x-0.6.3.js";
import store from "../../state/store.js";
import { FAVORITE_KEYS } from "../../state/constants.js";
import { detectQueryType, copyToClipboard } from "../../utils/index.js";
import { Loader } from "../Loader.js";
import { EmptyState } from "../EmptyState.js";
import { Icons } from "../../assets/icons.js";
import * as API from "../../services/api.js";

const { div, input, button, span, label, details, summary } = van.tags;

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
const ResultItem = ({ result }) => {
    const copyFeedback = van.state(null);

    const handleCopy = (e) => {
        e.stopPropagation();
        const success = copyToClipboard(`gga.${result.path}`);
        copyFeedback.val = success ? "success" : "error";
        store.notify(success ? "Path copied to clipboard" : "Failed to copy", success ? "success" : "error");
        setTimeout(() => (copyFeedback.val = null), 1500);
    };

    const handleMonitor = (e) => {
        e.stopPropagation();
        store.subscribeMonitor(`gga.${result.path}`);
        store.notify(`Added ${result.path} to monitor`);
    };

    return div(
        {
            class: () => `search-result-item ${copyFeedback.val === "success" ? "copied" : ""}`,
            onclick: handleCopy,
            title: "Click to copy full access path",
        },
        span({ class: "result-path" }, result.path),
        span({ class: "result-equals" }, "="),
        span({ class: `result-value type-${result.type}` }, result.formattedValue),
        div(
            { class: "result-actions" },
            button(
                {
                    class: "result-action-btn monitor-btn",
                    title: "Send to Monitor",
                    onclick: handleMonitor,
                },
                Icons.Eye()
            ),
            span({ class: "result-copy-icon" }, () => (copyFeedback.val === "success" ? Icons.Check() : Icons.Copy()))
        )
    );
};

/**
 * Reusable search button component.
 */
const SearchButton = ({ isSearching, disabled, onClick }) =>
    button(
        {
            class: () => `search-btn ${isSearching() ? "loading" : ""}`,
            onclick: onClick,
            disabled: () => isSearching() || disabled(),
        },
        () => (isSearching() ? "..." : "SEARCH"),
        Icons.Search()
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
            // Favorites section
            div({ class: "keys-group" }, div({ class: "keys-group-header" }, "★ FAVORITES"), () => {
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
            // All keys expandable section
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
        // Selected count
        div({ class: "keys-footer" }, () =>
            span({ class: "selected-count" }, `${ui.selectedKeys.length} keys selected`)
        )
    );

/**
 * Search Input Section (Top Right)
 */
const SearchInputSection = ({ ui, handlers }) =>
    div(
        { class: "search-input-section" },
        div(
            { class: "section-header" },
            span({ class: "section-title" }, "SEARCH VALUE"),
            button(
                {
                    class: () => `btn-small range-toggle ${ui.range.enabled ? "active" : ""}`,
                    onclick: handlers.toggleRangeMode,
                    title: "Toggle range search mode",
                },
                () => (ui.range.enabled ? "RANGE: ON" : "RANGE: OFF")
            )
        ),
        div(
            { class: "search-input-content" },
            () => {
                if (ui.range.enabled) {
                    return div(
                        { class: "search-input-row range-row" },
                        input({
                            type: "text",
                            class: "search-query-input range-input",
                            placeholder: "MIN",
                            value: () => ui.range.min,
                            oninput: (e) => (ui.range.min = e.target.value),
                            onkeydown: handlers.handleKeyDown,
                        }),
                        span({ class: "range-separator" }, "TO"),
                        input({
                            type: "text",
                            class: "search-query-input range-input",
                            placeholder: "MAX",
                            value: () => ui.range.max,
                            oninput: (e) => (ui.range.max = e.target.value),
                            onkeydown: handlers.handleKeyDown,
                        }),
                        SearchButton({
                            isSearching: () => ui.isSearching,
                            disabled: () => ui.selectedKeys.length === 0,
                            onClick: handlers.handleSearch,
                        })
                    );
                }
                return div(
                    { class: "search-input-row" },
                    input({
                        type: "text",
                        class: "search-query-input",
                        placeholder: "SEARCH_VALUE",
                        value: () => ui.searchQuery,
                        oninput: handlers.handleQueryInput,
                        onkeydown: handlers.handleKeyDown,
                    }),
                    SearchButton({
                        isSearching: () => ui.isSearching,
                        disabled: () => ui.selectedKeys.length === 0,
                        onClick: handlers.handleSearch,
                    })
                );
            },
            div({ class: "search-type-hint" }, () => {
                if (ui.range.enabled) {
                    return span({ class: "type-label" }, "MODE: NUMBER RANGE (MIN ≤ VALUE ≤ MAX)");
                }
                return span(
                    span({ class: "type-label" }, "DETECTED TYPE: "),
                    span({ class: () => `type-value type-${ui.detectedType}` }, () => ui.detectedType.toUpperCase())
                );
            })
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
            () => {
                if (ui.totalCount > 0) {
                    return span(
                        { class: "results-count" },
                        `FOUND ${ui.totalCount} MATCH${ui.totalCount === 1 ? "" : "ES"}`
                    );
                }
                return null;
            },
            button(
                {
                    class: "btn-icon refresh-btn",
                    onclick: handlers.handleSearch,
                    disabled: () => ui.isSearching || !handlers.hasValidQuery(),
                    title: "Refresh search",
                },
                Icons.Refresh()
            )
        ),
        div({ class: "results-content scroll-container" }, () => {
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
                if (handlers.hasValidQuery()) {
                    return EmptyState({
                        icon: Icons.SearchX(),
                        title: "NO RESULTS",
                        subtitle: "Try a different search value or select more keys",
                    });
                }
                return EmptyState({
                    icon: Icons.Search(),
                    title: "SEARCH GGA",
                    subtitle: "Enter a value and click Search to find where it's stored",
                });
            }

            const visibleResults = ui.results.slice(0, ui.displayLimit);
            const hasMore = ui.results.length > ui.displayLimit;
            const remaining = ui.results.length - ui.displayLimit;

            return div(
                { class: "results-list" },
                ...visibleResults.map((result) => ResultItem({ result })),
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
        })
    );

export const Search = () => {
    // Consolidated state
    const ui = vanX.reactive({
        allKeys: [],
        selectedKeys: [],
        searchQuery: "",
        range: { enabled: false, min: "", max: "" },
        detectedType: "empty",
        isLoading: false,
        isSearching: false,
        results: [],
        totalCount: 0,
        displayLimit: 50,
        error: null,
        allKeysExpanded: false,
        allKeysFilter: "",
    });

    // Derived values
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

    const hasValidQuery = () => (ui.range.enabled ? ui.range.min.trim() && ui.range.max.trim() : ui.searchQuery.trim());

    // Generic key selection handler
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

    // Handlers
    const handlers = {
        getValidFavorites,
        getOtherKeys,
        areAllSelected,
        hasValidQuery,

        handleKeyChange: (keyName, isChecked) => updateSelection([keyName], isChecked),

        toggleAll: () => {
            if (areAllSelected()) {
                ui.selectedKeys = [];
            } else {
                ui.selectedKeys = [...ui.allKeys];
            }
        },

        selectKeys: (keys) => updateSelection(keys, true),
        clearSelection: () => (ui.selectedKeys = []),

        toggleRangeMode: () => {
            ui.range.enabled = !ui.range.enabled;
            if (ui.range.enabled) {
                ui.searchQuery = "";
                ui.detectedType = "empty";
            } else {
                ui.range.min = "";
                ui.range.max = "";
            }
        },

        handleQueryInput: (e) => {
            ui.searchQuery = e.target.value;
            ui.detectedType = detectQueryType(e.target.value);
        },

        handleKeyDown: (e) => {
            if (e.key === "Enter") handlers.handleSearch();
        },

        handleSearch: async () => {
            if (ui.selectedKeys.length === 0) {
                store.notify("Select at least one key to search in", "error");
                return;
            }

            let query;
            if (ui.range.enabled) {
                const min = ui.range.min.trim();
                const max = ui.range.max.trim();
                if (!min || !max) {
                    store.notify("Enter both min and max values for range search", "error");
                    return;
                }
                if (isNaN(Number(min)) || isNaN(Number(max))) {
                    store.notify("Range values must be numbers", "error");
                    return;
                }
                query = `${min}-${max}`;
            } else {
                query = ui.searchQuery.trim();
                if (!query) {
                    store.notify("Enter a search value", "error");
                    return;
                }
            }

            ui.isSearching = true;
            ui.error = null;
            ui.displayLimit = 50;

            try {
                const data = await API.searchGga(query, ui.selectedKeys);
                ui.results = data.results || [];
                ui.totalCount = data.totalCount || 0;
            } catch (err) {
                ui.error = err.message || "Search failed";
                ui.results = [];
                ui.totalCount = 0;
            } finally {
                ui.isSearching = false;
            }
        },
    };

    // Load keys on mount
    (async () => {
        ui.isLoading = true;
        ui.error = null;
        try {
            const allKeys = await API.fetchGgaKeys();
            ui.allKeys = allKeys;
            const validFavorites = getValidFavorites();
            ui.selectedKeys = validFavorites.slice(0, 8);
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
                ResultsSection({ ui, handlers })
            )
        )
    );
};
