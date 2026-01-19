import van from "../../van-1.6.0.js";
import vanX from "../../van-x-0.6.3.js";
import store from "../../store.js";
import { Loader } from "../Loader.js";
import { EmptyState } from "../EmptyState.js";
import { ConfigNode } from "../config/ConfigNode.js";
import { StartupCheats, AddCheatSearchBar } from "../config/StartupCheats.js";
import { SearchBar } from "../SearchBar.js";
import { Icons } from "../../icons.js";
import { withTooltip } from "../Tooltip.js";

const { div, button, select, option, label, input, span } = van.tags;

export const Config = () => {
    const activeSubTab = van.state("cheatconfig");
    const categoryFilter = van.state("all");
    const configSearchTerm = van.state("");
    const isAddingCheat = van.state(false);
    const draftReady = van.state(false);

    // Draft will be a vanX.reactive object, but we store it in a regular variable to avoid reactivity cascade
    let draft = null;
    let addCheatFn = null;

    if (!store.app.config) store.loadConfig();

    van.derive(() => {
        if (store.app.config && !draft) {
            draft = vanX.reactive(JSON.parse(JSON.stringify(store.app.config)));
            draftReady.val = true;
        }
    });

    // Handle forced config path navigation from Cheats tab
    van.derive(() => {
        const forcedPath = store.app.configForcedPath;
        if (forcedPath && forcedPath.length > 0) {
            activeSubTab.val = "cheatconfig";
            // Reset filters to defaults when navigating to a specific cheat config
            categoryFilter.val = "all";
            configSearchTerm.val = "";
        }
    });

    /**
     * Clear forced path when user manually interacts with filters.
     */
    const handleCategoryChange = (e) => {
        store.clearForcedConfigPath();
        categoryFilter.val = e.target.value;
    };

    const handleSearchInput = (val) => {
        store.clearForcedConfigPath();
        configSearchTerm.val = val;
    };

    /**
     * Clear forced path button handler.
     */
    const handleClearForcedPath = () => {
        store.clearForcedConfigPath();
    };

    const save = (isPersistent) => {
        if (!draft) return;

        const toSave = JSON.parse(JSON.stringify(draft));
        delete toSave.defaultConfig;

        store.saveConfig(toSave, isPersistent);
    };

    const handleAddCheat = (val) => {
        if (addCheatFn) {
            addCheatFn(val);
            isAddingCheat.val = false;
        }
    };

    /**
     * Build a filtered data object that only contains the specified path.
     * e.g., pathParts = ["w1", "owl"] => { w1: { owl: {...} } }
     * @param {object} root - The full config object
     * @param {string[]} pathParts - Path parts to filter to
     * @returns {object} - Filtered object containing only the path
     */
    const buildForcedPathData = (root, pathParts) => {
        if (!pathParts || pathParts.length === 0 || !root) return root;

        let current = root;
        const result = {};
        let resultCurrent = result;

        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            if (current === null || current === undefined || !(part in current)) {
                return {}; // Path doesn't exist
            }

            if (i === pathParts.length - 1) {
                // Last part - include the value
                resultCurrent[part] = current[part];
            } else {
                // Intermediate part - create nested object
                resultCurrent[part] = {};
                resultCurrent = resultCurrent[part];
                current = current[part];
            }
        }

        return result;
    };

    const buildContent = () => {
        const config = draft;

        const startupCheatsResult = StartupCheats(config.startupCheats);
        addCheatFn = startupCheatsResult.addItem;

        const root = config.cheatConfig || {};
        const rootTemplate = store.app.config.cheatConfig || {};

        const cheatConfigNode = div({ id: "cheatconfig-options" }, () => {
            const forcedPath = store.app.configForcedPath;
            const filter = categoryFilter.val;
            const search = configSearchTerm.val;

            let data, template;

            if (forcedPath && forcedPath.length > 0) {
                // Forced path mode: show only the specific config entry
                data = buildForcedPathData(root, forcedPath);
                template = buildForcedPathData(rootTemplate, forcedPath);
            } else {
                // Normal filtering mode
                data = filter === "all" ? root : { [filter]: root[filter] };
                template = filter === "all" ? rootTemplate : { [filter]: rootTemplate[filter] };
            }

            const nodes = ConfigNode({
                data,
                path: "cheatConfig",
                template,
                searchTerm: forcedPath ? "" : search, // Ignore search term when in forced path mode
                forceOpen: !!forcedPath,
            });

            const hasMatches = nodes.some((node) => node !== null);
            if ((search || forcedPath) && !hasMatches) {
                return EmptyState({
                    icon: Icons.SearchX(),
                    title: "NO CONFIG FOUND",
                    subtitle: forcedPath
                        ? `Config path "${forcedPath.join(" ")}" not found`
                        : "Try a different search term or category",
                });
            }

            return div(nodes);
        });

        const injectorConfigNode = div(
            ConfigNode({
                data: config.injectorConfig || {},
                path: "injectorConfig",
                template: store.app.config.injectorConfig || {},
            })
        );

        return div(
            { id: "config-sub-tab-content", class: "scroll-container" },

            div(
                { class: "sub-nav" },
                ["Cheat Config", "Startup", "Injector"].map((name) => {
                    let id = name.toLowerCase().replace(" ", "");
                    if (name === "Startup") id += "cheats";
                    if (name === "Injector") id += "config";

                    return button(
                        {
                            class: () => `config-sub-tab-button ${activeSubTab.val === id ? "active" : ""}`,
                            onclick: () => {
                                activeSubTab.val = id;
                                isAddingCheat.val = false;
                            },
                        },
                        name.toUpperCase()
                    );
                })
            ),

            div(
                {
                    class: () => `config-sub-tab-pane ${activeSubTab.val === "cheatconfig" ? "active" : ""}`,
                },

                div(
                    { class: "panel-section mb-20" },

                    // Switch between forced path indicator and normal filters
                    () => {
                        const forcedPath = store.app.configForcedPath;
                        if (forcedPath && forcedPath.length > 0) {
                            return div(
                                { class: "forced-path-indicator" },
                                span({ class: "forced-path-text" }, `SHOWING: ${[...forcedPath].join(" ").toUpperCase()}`),
                                button(
                                    {
                                        class: "forced-path-clear",
                                        onclick: handleClearForcedPath,
                                        title: "Clear filter and show all",
                                    },
                                    Icons.X()
                                )
                            );
                        }

                        return div(
                            { style: "display: contents" },
                            div(
                                { class: "config-filter-group" },
                                label({ class: "config-filter-label" }, "CATEGORY FILTER"),

                                select(
                                    {
                                        value: categoryFilter,
                                        onchange: handleCategoryChange,
                                    },
                                    option({ value: "all" }, "ALL SECTORS"),
                                    Object.keys(config.cheatConfig || {})
                                        .sort()
                                        .map((k) => option({ value: k }, k.toUpperCase()))
                                )
                            ),
                            div(
                                { class: "config-filter-search" },
                                SearchBar({
                                    placeholder: "SEARCH_CONFIG...",
                                    onInput: handleSearchInput,
                                    debounceMs: 0,
                                    icon: Icons.HelpCircle(),
                                    value: configSearchTerm,
                                })
                            )
                        );
                    }
                ),
                cheatConfigNode
            ),

            div(
                {
                    class: () => `config-sub-tab-pane ${activeSubTab.val === "startupcheats" ? "active" : ""}`,
                },

                startupCheatsResult.element
            ),

            div(
                {
                    class: () => `config-sub-tab-pane ${activeSubTab.val === "injectorconfig" ? "active" : ""}`,
                },

                div({ class: "warning-banner mb-20" }, "⚠ RESTART REQUIRED FOR CHANGES TO APPLY"),
                injectorConfigNode
            )
        );
    };

    return div(
        { id: "config-tab", class: "tab-pane config-layout" },

        () => {
            if (store.app.isLoading || !draftReady.val) {
                return Loader({ text: "LOADING CONFIG..." });
            }
            return buildContent();
        },

        div(
            { class: "action-bar" },
            button(
                {
                    class: () =>
                        `add-cheat-button ${
                            activeSubTab.val === "startupcheats" && !isAddingCheat.val ? "" : "hidden"
                        }`,
                    onclick: () => (isAddingCheat.val = true),
                },
                "+ ADD CHEAT"
            ),

            div(
                {
                    class: () =>
                        `add-cheat-search-container ${
                            activeSubTab.val === "startupcheats" && isAddingCheat.val ? "" : "hidden"
                        }`,
                },

                () => (isAddingCheat.val ? AddCheatSearchBar(handleAddCheat, () => (isAddingCheat.val = false)) : div())
            ),

            div({ class: () => `spacer ${activeSubTab.val === "startupcheats" && isAddingCheat.val ? "hidden" : ""}` }),

            withTooltip(
                button(
                    { id: "update-config-button", class: "btn-secondary", onclick: () => save(false) },
                    "APPLY (RAM)"
                ),
                "Apply to session only (lost on restart)"
            ),
            withTooltip(
                button({ id: "save-config-button", class: "btn-primary", onclick: () => save(true) }, "SAVE (DISK)"),
                "Save permanently to config file"
            )
        )
    );
};
