import van from "../../vendor/van-1.6.0.js";
import vanX from "../../vendor/van-x-0.6.3.js";
import store from "../../state/store.js";
import { Loader } from "../Loader.js";
import { EmptyState } from "../EmptyState.js";
import { SearchBar } from "../SearchBar.js";
import { Icons } from "../../assets/icons.js";

const { div, input, button, span, details, summary } = van.tags;

const QuickAccessSection = () => {
    /**
     * Find a cheat object by its value, handling parameterized commands.
     * @param {string} val - The cheat value to find
     * @returns {object|null} The cheat object or a reconstructed one for parameterized commands
     */
    const getCheatByValue = (val) => {
        const allCheats = store.data.cheats;
        // Direct match
        const found = allCheats.find((c) => c.value === val);
        if (found) return found;

        // Handle parameterized commands (e.g., "drop Copper 100" -> base "drop Copper")
        const baseParts = val.split(" ");
        if (baseParts.length > 1) {
            const baseCmd = baseParts.slice(0, -1).join(" ");
            const paramFound = allCheats.find((c) => c.value === baseCmd);
            if (paramFound) {
                return {
                    value: val,
                    message: `${paramFound.message} (${baseParts[baseParts.length - 1]})`,
                    category: paramFound.category,
                };
            }
        }
        return null;
    };

    const QuickAccessBtn = (cheatValue, isFavorite = false) => {
        const cheat = getCheatByValue(cheatValue);
        if (!cheat) return null;

        return div(
            { class: "quick-access-item" },
            button(
                {
                    class: () => `quick-access-btn ${isFavorite ? "is-favorite-btn" : ""}`,
                    onclick: () => store.executeCheat(cheat.value, cheat.message),
                    title: cheat.message,
                },
                span({ class: "quick-access-btn-text" }, cheat.value),
                isFavorite
                    ? span(
                          {
                              class: "quick-access-remove-icon",
                              onclick: (e) => {
                                  e.stopPropagation();
                                  store.toggleFavorite(cheatValue);
                              },
                              title: "Remove from favorites",
                          },
                          Icons.X()
                      )
                    : null
            )
        );
    };

    return div(
        { class: "quick-access-section" },
        div({ class: "quick-access-group" }, div({ class: "quick-access-header" }, "★ FAVORITES"), () => {
            const favorites = [...store.data.favoriteCheats];
            if (favorites.length === 0) {
                return div({ class: "quick-access-empty" }, "No favorites yet");
            }
            return div({ class: "quick-access-items" }, ...favorites.map((val) => QuickAccessBtn(val, true)));
        }),

        div({ class: "quick-access-group" }, div({ class: "quick-access-header" }, "↻ RECENT"), () => {
            const recent = [...store.data.recentCheats];
            if (recent.length === 0) {
                return div({ class: "quick-access-empty" }, "No recent cheats");
            }
            return div({ class: "quick-access-items" }, ...recent.slice(0, 5).map((val) => QuickAccessBtn(val, false)));
        })
    );
};

/**
 * Lazy Rendering Category
 * Wraps <details> element and only renders children when opened.
 */
const LazyCategory = ({ category, isOpen, cheats }) => {
    const isExpanded = van.state(isOpen);

    return details(
        {
            class: "cheat-category",
            open: isOpen,
            ontoggle: (e) => {
                isExpanded.val = e.target.open;
            },
        },
        summary(category),
        () => {
            if (!isExpanded.val) {
                return div({ class: "cheat-category-content", style: "display:none" });
            }
            return div(
                { class: "cheat-category-content" },
                cheats.map((cheat) => CheatItem(cheat))
            );
        }
    );
};

/**
 * Groups cheats by category, filtering by search term.
 * Moved outside component to avoid re-creation and allow use in handlers.
 */
const getGroupedCheats = (list, term) => {
    const groups = {};
    const searchTerm = term.toLowerCase();

    for (let i = 0; i < list.length; i++) {
        const cheat = list[i];

        // Filter: match term against value or message
        if (searchTerm) {
            const msg = (cheat.message || "").toLowerCase();
            const val = (cheat.value || "").toLowerCase();
            if (!msg.includes(searchTerm) && !val.includes(searchTerm)) continue;
        }

        const category = cheat.category || "general";
        if (!groups[category]) groups[category] = [];
        groups[category].push(cheat);
    }

    // Return sorted by category name
    const sortedKeys = Object.keys(groups).sort();
    const result = {};
    for (const key of sortedKeys) {
        result[key] = groups[key];
    }
    return result;
};

export const Cheats = () => {
    const ui = vanX.reactive({
        filter: "",
        shouldOpen: false,
        activeCategory: null,
    });

    if (store.data.cheats.length === 0) {
        store.loadCheats();
    }

    // Pagination state
    const pagination = vanX.reactive({
        limit: 50,
    });

    const resetPagination = () => {
        pagination.limit = 50;
    };

    const validateActiveCategory = (filter) => {
        const groupedData = getGroupedCheats(store.data.cheats, filter);
        const categories = Object.keys(groupedData);

        if (categories.length > 0) {
            if (!ui.activeCategory || !categories.includes(ui.activeCategory)) {
                ui.activeCategory = categories[0];
            }
        } else {
            ui.activeCategory = null;
        }
    };

    const handleSearch = (val) => {
        ui.filter = val;
        ui.shouldOpen = val.length > 0;
        validateActiveCategory(val);
        resetPagination();
    };

    const handleCategorySwitch = (cat) => {
        ui.activeCategory = cat;
        resetPagination();
    };

    return div(
        { id: "cheats-tab", class: "tab-pane" },

        div(
            { class: "scroll-container" },

            div(
                { class: "control-bar" },
                SearchBar({
                    placeholder: "SEARCH_COMMANDS...",
                    onInput: handleSearch,
                    style: "flex: 1;",
                }),
                button(
                    {
                        class: "view-mode-toggle",
                        onclick: store.toggleCheatsViewMode,
                        title: "Toggle View Mode (List/Tabs)",
                    },
                    () => (store.app.cheatsViewMode === "tabs" ? Icons.List() : Icons.Tabs())
                )
            ),

            QuickAccessSection(),

            () => {
                if (store.app.isLoading && store.data.cheats.length === 0) {
                    return Loader({ text: "INITIALIZING..." });
                }

                // Get fresh snapshot of cheats and filter term
                const filterTerm = ui.filter;
                const groupedData = getGroupedCheats(store.data.cheats, filterTerm);
                const categories = Object.keys(groupedData);

                if (categories.length === 0) {
                    return EmptyState({
                        icon: Icons.SearchX(),
                        title: "NO CHEATS FOUND",
                        subtitle: filterTerm ? "Try a different search term" : "Cheats list is empty",
                    });
                }

                // Initialize active category if null or invalid (subscription-free peek)
                const rawUi = vanX.raw(ui);
                if (!rawUi.activeCategory || !categories.includes(rawUi.activeCategory)) {
                    ui.activeCategory = categories[0];
                }

                const isTabsMode = store.app.cheatsViewMode === "tabs";

                if (isTabsMode) {
                    return div(
                        // Tabs Bar
                        div(
                            { class: "tabs-bar" },
                            categories.map((cat) =>
                                button(
                                    {
                                        class: () => `tab-btn ${ui.activeCategory === cat ? "active" : ""}`,
                                        onclick: () => handleCategorySwitch(cat),
                                    },
                                    cat
                                )
                            )
                        ),
                        // Tab Content - wrapped in reactive function to respond to category/pagination changes
                        () => {
                            const activeCheats = groupedData[ui.activeCategory] || [];
                            const visibleCheats = activeCheats.slice(0, pagination.limit);
                            const hasMore = activeCheats.length > pagination.limit;
                            return div(
                                { class: "tab-content" },
                                visibleCheats.map((cheat) => CheatItem(cheat)),
                                hasMore
                                    ? button(
                                          { class: "load-more-btn", onclick: () => (pagination.limit += 50) },
                                          `LOAD MORE (${activeCheats.length - pagination.limit} REMAINING)`
                                      )
                                    : null
                            );
                        }
                    );
                }

                // List View (Accordion) with Lazy Loading
                return div(
                    { id: "cheat-buttons", class: "grid-layout" },
                    categories.map((cat) => {
                        return LazyCategory({
                            category: cat,
                            isOpen: ui.shouldOpen, // Force open if searching
                            cheats: groupedData[cat],
                        });
                    })
                );
            }
        )
    );
};

const CheatItem = (cheat) => {
    const needsValue = cheat.needsParam === true;
    const hasConfig = store.hasConfigEntry(cheat.value);

    // Use direct DOM reference instead of van.state to save thousands of listeners
    let inputRef = null;
    const getInputValue = () => (inputRef ? inputRef.value.trim() : "");

    const feedbackState = van.state(null);

    const handleExecute = async () => {
        let finalAction = cheat.value;
        if (needsValue) {
            const val = getInputValue();
            if (!val) {
                store.notify(`Value required for '${cheat.value}'`, "error");
                feedbackState.val = "error";
                setTimeout(() => (feedbackState.val = null), 1000);
                return;
            }
            finalAction = `${cheat.value} ${val}`;
        }

        try {
            await store.executeCheat(finalAction, cheat.message);
            feedbackState.val = "success";
        } catch {
            feedbackState.val = "error";
        }
        setTimeout(() => (feedbackState.val = null), 1000);
    };

    const handleConfigClick = (e) => {
        e.stopPropagation();
        store.navigateToCheatConfig(cheat.value);
    };

    const handleFavorite = () => {
        if (needsValue) {
            const val = getInputValue();
            if (!val) {
                store.notify(`Enter a value first to favorite '${cheat.value}'`, "error");
                return;
            }
            store.toggleFavorite(`${cheat.value} ${val}`);
        } else {
            store.toggleFavorite(cheat.value);
        }
    };

    const isFavorited = () => {
        if (needsValue) {
            const val = getInputValue();
            if (!val) return false;
            return store.isFavorite(`${cheat.value} ${val}`);
        }
        return store.isFavorite(cheat.value);
    };

    // Build button content with optional gear icon
    const buttonContent = [
        span(
            { class: "cheat-button-text" },
            cheat.message && cheat.message !== cheat.value ? `${cheat.value} - ${cheat.message}` : cheat.value
        ),
        hasConfig
            ? span(
                  {
                      class: "cheat-config-icon",
                      onclick: handleConfigClick,
                      title: "Open config for this cheat",
                  },
                  Icons.Config()
              )
            : null,
    ];

    return div(
        { class: "cheat-item-container" },
        button(
            {
                class: () =>
                    `cheat-button ${hasConfig ? "has-config" : ""} ${
                        feedbackState.val === "success" ? "feedback-success" : ""
                    } ${feedbackState.val === "error" ? "feedback-error" : ""}`,
                onclick: handleExecute,
            },
            ...buttonContent
        ),
        needsValue
            ? input({
                  type: "text",
                  class: "cheat-input",
                  placeholder: "Val",
                  oncreated: (dom) => (inputRef = dom), // Capture reference
              })
            : null,
        button(
            {
                class: () => `favorite-btn ${isFavorited() ? "is-favorite" : ""}`,
                onclick: (e) => {
                    e.stopPropagation();
                    handleFavorite();
                },
            },
            Icons.Star()
        )
    );
};
