import van from "../../vendor/van-1.6.0.js";
import store from "../../state/store.js";
import { Loader } from "../Loader.js";
import { EmptyState } from "../EmptyState.js";
import { ConfigNode } from "../config/ConfigNode.js";
import { StartupCheats, AddCheatSearchBar } from "../config/StartupCheats.js";
import { SearchBar } from "../SearchBar.js";
import { Icons } from "../../assets/icons.js";
import { ConfigActions } from "./config/ConfigActions.js";
import { buildConfigPathTemplate, configDraftReady, getConfigDraft, getConfigPathData } from "./config/configDraft.js";

const { div, button, select, option, label, span } = van.tags;

export const Config = () => {
    const activeSubTab = van.state("cheatconfig");
    const categoryFilter = van.state("all");
    const configSearchTerm = van.state("");
    const isAddingCheat = van.state(false);
    let addCheatFn = null;

    getConfigDraft();

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

    const handleCloseDrawer = () => {
        store.closeConfigDrawer();
        store.clearForcedConfigPath();
    };

    const handleAddCheat = (val) => {
        if (addCheatFn) {
            addCheatFn(val);
            isAddingCheat.val = false;
        }
    };

    const buildContent = () => {
        const config = getConfigDraft();

        const startupCheatsResult = StartupCheats(config.startupCheats);
        addCheatFn = startupCheatsResult.addItem;

        const root = config.cheatConfig || {};
        const rootTemplate = store.app.config.cheatConfig || {};

        const cheatConfigNode = div({ id: "cheatconfig-options" });
        let renderRequest = 0;

        van.derive(() => {
            const forcedPath = store.app.configForcedPath;
            const filter = categoryFilter.val;
            const search = configSearchTerm.val;
            const requestedPath = forcedPath?.length ? [...forcedPath] : null;
            const request = ++renderRequest;

            queueMicrotask(() => {
                if (request !== renderRequest) return;

                let data, template;

                if (requestedPath?.length) {
                    // Forced path mode: show only the specific config entry
                    data = getConfigPathData(root, requestedPath);
                    template = buildConfigPathTemplate(rootTemplate, requestedPath);
                } else {
                    // Normal filtering mode
                    data = filter === "all" ? root : { [filter]: root[filter] };
                    template = filter === "all" ? rootTemplate : { [filter]: rootTemplate[filter] };
                }

                const nodes = ConfigNode({
                    data,
                    path: "cheatConfig",
                    template,
                    searchTerm: requestedPath ? "" : search, // Ignore search term when in forced path mode
                    forceOpen: !!requestedPath,
                });

                const hasMatches = nodes.some((node) => node !== null);
                if ((search || requestedPath) && !hasMatches) {
                    cheatConfigNode.replaceChildren(
                        EmptyState({
                            icon: Icons.SearchX(),
                            title: "NO CONFIG FOUND",
                            subtitle: requestedPath
                                ? `Config path "${requestedPath.join(" ")}" not found`
                                : "Try a different search term or category",
                        })
                    );
                    return;
                }

                cheatConfigNode.replaceChildren(div(nodes));
            });
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
                {
                    class: () => `config-drawer-header ${store.app.configDrawerOpen ? "" : "hidden"}`,
                },
                span({ class: "config-drawer-title" }, () =>
                    store.app.configForcedPath?.length
                        ? `EDITING: ${store.app.configForcedPath.join(" ").toUpperCase()}`
                        : "CONFIG DRAWER"
                ),
                button(
                    {
                        class: "config-drawer-close",
                        onclick: handleCloseDrawer,
                        title: "Close config drawer",
                    },
                    Icons.X()
                )
            ),

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
                                span(
                                    { class: "forced-path-text" },
                                    `SHOWING: ${[...forcedPath].join(" ").toUpperCase()}`
                                ),
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
                                    placeholder: "SEARCH_CONFIG",
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

                div(
                    { class: "theme-preference" },
                    div(
                        div({ class: "theme-preference-title" }, "INTERFACE THEME"),
                        div({ class: "theme-preference-description" }, "Stored locally and applied without a restart.")
                    ),
                    select(
                        {
                            onchange: (event) => store.setTheme(event.target.value),
                            "aria-label": "Interface theme",
                        },
                        option({ value: "system", selected: () => store.app.theme === "system" }, "System"),
                        option({ value: "light", selected: () => store.app.theme === "light" }, "Light"),
                        option({ value: "dark", selected: () => store.app.theme === "dark" }, "Dark")
                    )
                ),
                div({ class: "warning-banner mb-20" }, "⚠ RESTART REQUIRED FOR CHANGES TO APPLY"),
                injectorConfigNode
            )
        );
    };

    const contentHost = div({ style: "display: contents" }, Loader({ text: "LOADING CONFIG" }));
    let contentNode = null;
    let contentRequest = 0;

    van.derive(() => {
        const isReady = configDraftReady.val;
        const request = ++contentRequest;

        queueMicrotask(() => {
            if (request !== contentRequest) return;

            if (!isReady) {
                contentHost.replaceChildren(Loader({ text: "LOADING CONFIG" }));
                return;
            }

            contentNode ||= buildContent();
            contentHost.replaceChildren(contentNode);
        });
    });

    return div(
        { id: "config-tab", class: "tab-pane config-layout" },

        contentHost,

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

                () =>
                    isAddingCheat.val
                        ? AddCheatSearchBar(
                              handleAddCheat,
                              () => (isAddingCheat.val = false),
                              getConfigDraft()?.startupCheats || []
                          )
                        : div()
            ),

            div({ class: () => `spacer ${activeSubTab.val === "startupcheats" && isAddingCheat.val ? "hidden" : ""}` }),
            ConfigActions({ withIds: true })
        )
    );
};
