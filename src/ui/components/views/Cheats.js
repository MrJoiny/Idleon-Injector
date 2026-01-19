import van from "../../van-1.6.0.js";
import vanX from "../../van-x-0.6.3.js";
import store from "../../store.js";
import { Loader } from "../Loader.js";
import { EmptyState } from "../EmptyState.js";
import { SearchBar } from "../SearchBar.js";
import { Icons } from "../../icons.js";

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
                    class: "quick-access-btn",
                    onclick: () => store.executeCheat(cheat.value, cheat.message),
                    title: cheat.message,
                },
                cheat.value
            ),
            isFavorite
                ? button({ class: "quick-access-remove", onclick: () => store.toggleFavorite(cheatValue) }, Icons.X())
                : null
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

export const Cheats = () => {
    const ui = vanX.reactive({
        filter: "",
        shouldOpen: false,
    });

    if (store.data.cheats.length === 0) {
        store.loadCheats();
    }

    const handleSearch = (val) => {
        ui.filter = val;
        ui.shouldOpen = val.length > 0;
    };

    /**
     * Groups cheats by category, filtering by search term.
     * Called fresh on each render to avoid reactivity issues.
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

    return div(
        { id: "cheats-tab", class: "tab-pane" },

        div(
            { class: "control-bar" },
            SearchBar({
                placeholder: "SEARCH_COMMANDS...",
                onInput: handleSearch,
            })
        ),

        QuickAccessSection(),

        () => {
            if (store.app.isLoading && store.data.cheats.length === 0) {
                return Loader({ text: "INITIALIZING..." });
            }

            // Get fresh snapshot of cheats and filter term
            const cheats = [...store.data.cheats];
            const filterTerm = ui.filter;
            const groupedData = getGroupedCheats(cheats, filterTerm);
            const categories = Object.keys(groupedData);

            if (categories.length === 0) {
                return EmptyState({
                    icon: Icons.SearchX(),
                    title: "NO CHEATS FOUND",
                    subtitle: filterTerm ? "Try a different search term" : "Cheats list is empty",
                });
            }

            return div(
                { id: "cheat-buttons", class: "grid-layout" },
                categories.map((cat) => {
                    return details(
                        {
                            class: "cheat-category",
                            open: ui.shouldOpen,
                        },
                        summary(cat),
                        div(
                            { class: "cheat-category-content" },
                            groupedData[cat].map((cheat) => CheatItem(cheat))
                        )
                    );
                })
            );
        }
    );
};

const CheatItem = (cheat) => {
    const needsValue = cheat.needsParam === true;

    const inputValue = van.state("");

    const feedbackState = van.state(null);

    const handleExecute = async () => {
        let finalAction = cheat.value;
        if (needsValue) {
            if (!inputValue.val.trim()) {
                store.notify(`Value required for '${cheat.value}'`, "error");
                feedbackState.val = "error";
                setTimeout(() => (feedbackState.val = null), 1000);
                return;
            }
            finalAction = `${cheat.value} ${inputValue.val.trim()}`;
        }

        try {
            await store.executeCheat(finalAction, cheat.message);
            feedbackState.val = "success";
        } catch {
            feedbackState.val = "error";
        }
        setTimeout(() => (feedbackState.val = null), 1000);
    };

    const handleFavorite = () => {
        // For cheats that need a value, include the current input value for the favorite
        if (needsValue) {
            if (!inputValue.val.trim()) {
                store.notify(`Enter a value first to favorite '${cheat.value}'`, "error");
                return;
            }
            const fullCommand = `${cheat.value} ${inputValue.val.trim()}`;
            store.toggleFavorite(fullCommand);
        } else {
            store.toggleFavorite(cheat.value);
        }
    };

    // Check if this cheat (or parameterized variant) is favorited
    const isFavorited = () => {
        if (needsValue) {
            if (!inputValue.val.trim()) return false;
            const fullCommand = `${cheat.value} ${inputValue.val.trim()}`;
            return store.isFavorite(fullCommand);
        }
        return store.isFavorite(cheat.value);
    };

    return div(
        { class: "cheat-item-container" },
        button(
            {
                class: () =>
                    `cheat-button ${feedbackState.val === "success" ? "feedback-success" : ""} ${
                        feedbackState.val === "error" ? "feedback-error" : ""
                    }`,
                onclick: handleExecute,
            },
            // Show both value and message in button
            cheat.message && cheat.message !== cheat.value ? `${cheat.value} - ${cheat.message}` : cheat.value
        ),
        () =>
            needsValue
                ? input({
                      type: "text",
                      class: "cheat-input",
                      placeholder: "Val",
                      oninput: (e) => (inputValue.val = e.target.value),
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
