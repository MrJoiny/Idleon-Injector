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

    const buildContent = () => {
        const config = draft;

        const startupCheatsResult = StartupCheats(config.startupCheats);
        addCheatFn = startupCheatsResult.addItem;

        const root = config.cheatConfig || {};
        const rootTemplate = store.app.config.cheatConfig || {};

        const cheatConfigNode = div({ id: "cheatconfig-options" }, () => {
            const filter = categoryFilter.val;
            const search = configSearchTerm.val;
            const data = filter === "all" ? root : { [filter]: root[filter] };
            const template = filter === "all" ? rootTemplate : { [filter]: rootTemplate[filter] };

            const nodes = ConfigNode({
                data,
                path: "cheatConfig",
                template,
                searchTerm: search,
            });

            const hasMatches = nodes.some((node) => node !== null);
            if (search && !hasMatches) {
                return EmptyState({
                    icon: Icons.SearchX(),
                    title: "NO CONFIG FOUND",
                    subtitle: "Try a different search term or category",
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
                    div(
                        { class: "config-filter-group" },
                        label({ class: "config-filter-label" }, "CATEGORY FILTER"),

                        select(
                            {
                                value: categoryFilter,
                                onchange: (e) => (categoryFilter.val = e.target.value),
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
                            onInput: (val) => (configSearchTerm.val = val),
                            debounceMs: 0,
                            icon: Icons.HelpCircle(),
                        })
                    )
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
