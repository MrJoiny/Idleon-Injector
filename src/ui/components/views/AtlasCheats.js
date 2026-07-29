import van from "../../vendor/van-1.6.0.js";
import vanX from "../../vendor/van-x-0.6.3.js";
import store from "../../state/store.js";
import { CATEGORY_ORDER, VIEWS } from "../../state/constants.js";
import * as API from "../../services/api.js";
import { configPathExists, getCheatConfigPath } from "../../utils/index.js";
import { Icons } from "../../assets/icons.js";
import { Loader } from "../Loader.js";
import { EmptyState } from "../EmptyState.js";
import { CheatItem } from "../CheatItem.js";
import { ConfigNode } from "../config/ConfigNode.js";
import { registerWorkspaceContext, registerWorkspaceSaveHandler } from "../WorkspaceContext.js";
import { ConfigActions } from "./config/ConfigActions.js";
import {
    buildConfigPathTemplate,
    configDraftReady,
    getConfigDraft,
    getConfigPathData,
    saveConfigDraft,
} from "./config/configDraft.js";

const { div, button, span, input, code } = van.tags;

const PAGE_SIZE = 50;

const normalizeRootStateKey = (key) => (key.endsWith("s") ? key.slice(0, -1) : key);

/**
 * Flatten the full boolean state response without discarding false values.
 * Presence in this map means the backend can truthfully expose a switch.
 * @param {object} states
 * @returns {Map<string, boolean>}
 */
const flattenCheatStates = (states) => {
    const result = new Map();

    const visit = (value, path) => {
        if (typeof value === "boolean") {
            result.set(path.join(" "), value);
            return;
        }

        if (!value || typeof value !== "object") return;
        for (const [key, child] of Object.entries(value)) {
            const segment = path.length === 0 ? normalizeRootStateKey(key) : key;
            visit(child, [...path, segment]);
        }
    };

    visit(states, []);
    return result;
};

const sortCategoryNames = (categories) =>
    [...categories].sort((a, b) => {
        const indexA = CATEGORY_ORDER.indexOf(a);
        const indexB = CATEGORY_ORDER.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });

const makeBaseEntry = (cheat) => ({
    id: `base:${cheat.value}`,
    action: cheat.value,
    parameter: "",
    cheat,
});

const matchesFilter = (cheat, term) =>
    [cheat.value, cheat.message, cheat.category].filter(Boolean).some((value) => value.toLowerCase().includes(term));

/**
 * Resolve a stored favorite/recent action back to its command definition.
 * Longest-prefix matching preserves parameters that contain spaces.
 * @param {string} action
 * @param {object[]} cheats
 * @returns {object|null}
 */
const resolveStoredAction = (action, cheats) => {
    const exact = cheats.find((cheat) => cheat.value === action);
    if (exact) return makeBaseEntry(exact);

    const parameterized = cheats
        .filter((cheat) => cheat.needsParam && action.startsWith(`${cheat.value} `))
        .sort((a, b) => b.value.length - a.value.length)[0];

    if (!parameterized) return null;
    return {
        id: `action:${action}`,
        action,
        parameter: action.slice(parameterized.value.length + 1),
        cheat: parameterized,
    };
};

const ScopeButton = ({ id, label, count, activeScope, onSelect, icon = null }) =>
    button(
        {
            type: "button",
            class: () => `atlas-scope-button ${activeScope() === id ? "is-active" : ""}`,
            "aria-current": () => (activeScope() === id ? "page" : null),
            onclick: () => onSelect(id),
        },
        icon ? span({ class: "atlas-scope-icon", "aria-hidden": "true" }, icon) : null,
        span({ class: "atlas-scope-label" }, label),
        span({ class: "atlas-scope-count" }, count)
    );

/**
 * Atlas dense cheat browser with explicit selection, execution, and config editing.
 * @returns {Element}
 */
export const AtlasCheats = () => {
    const compactInspectorQuery = window.matchMedia("(max-width: 1023px)");
    const compactInspector = van.state(compactInspectorQuery.matches);
    const ui = vanX.reactive({
        filter: "",
        scope: "all",
        selectedAction: "",
        inspectorTab: "details",
        inspectorOpen: !compactInspector.val,
        page: 0,
    });
    const parameterStates = new Map();

    compactInspectorQuery.addEventListener("change", (event) => {
        compactInspector.val = event.matches;
        ui.inspectorOpen = !event.matches;
    });

    if (store.data.cheats.length === 0) store.loadCheats();
    registerWorkspaceSaveHandler(VIEWS.CHEATS.id, () => saveConfigDraft("disk"));

    const stateMap = van.derive(() => flattenCheatStates(store.data.activeCheatStates));

    const getStateInfo = (command) => {
        const states = stateMap.val;
        return {
            known: states.has(command),
            active: states.get(command) === true,
        };
    };

    const getEntriesForScope = () => {
        const cheats = [...store.data.cheats];
        const decorateEntry = (entry) => ({
            ...entry,
            hasConfig: store.hasConfigEntry(entry.cheat.value),
        });

        if (ui.scope === "favorites") {
            return [...store.data.favoriteCheats]
                .map((action) => resolveStoredAction(action, cheats))
                .filter(Boolean)
                .map(decorateEntry);
        }

        if (ui.scope === "recent") {
            return [...store.data.recentCheats]
                .map((action) => resolveStoredAction(action, cheats))
                .filter(Boolean)
                .map(decorateEntry);
        }

        const entries = cheats.map(makeBaseEntry).map(decorateEntry);
        if (ui.scope === "active") return entries.filter((entry) => getStateInfo(entry.cheat.value).active);
        if (ui.scope.startsWith("category:")) {
            const category = ui.scope.slice("category:".length);
            return entries.filter((entry) => (entry.cheat.category || "general") === category);
        }
        return entries;
    };

    const matchingCategoryCounts = van.derive(() => {
        const term = ui.filter.trim().toLowerCase();
        const counts = new Map();

        for (const cheat of store.data.cheats) {
            if (term && !matchesFilter(cheat, term)) continue;
            const category = cheat.category || "general";
            counts.set(category, (counts.get(category) || 0) + 1);
        }

        return counts;
    });

    const visibleEntries = van.derive(() => {
        const term = ui.filter.trim().toLowerCase();
        const entries = getEntriesForScope();
        if (!term) return entries;

        return entries.filter((entry) => matchesFilter(entry.cheat, term));
    });

    const pageCount = van.derive(() => Math.max(1, Math.ceil(visibleEntries.val.length / PAGE_SIZE)));
    const currentPage = van.derive(() => {
        const lastPage = pageCount.val - 1;
        if (ui.page > lastPage) ui.page = lastPage;
        return ui.page;
    });

    const visibleRows = van.derive(() => {
        const start = currentPage.val * PAGE_SIZE;
        return visibleEntries.val.slice(start, start + PAGE_SIZE);
    });

    const selectScope = (scope) => {
        ui.scope = scope;
        ui.page = 0;
    };

    const selectedEntry = van.derive(() => {
        const selected = visibleRows.val.find((entry) => entry.action === ui.selectedAction);
        return selected || visibleRows.val[0] || null;
    });

    van.derive(() => {
        const entry = selectedEntry.val;
        if (ui.inspectorTab === "config" && entry && !entry.hasConfig) ui.inspectorTab = "details";
    });

    van.derive(() => {
        if (!ui.scope.startsWith("category:")) return;
        const category = ui.scope.slice("category:".length);
        if (matchingCategoryCounts.val.has(category)) return;
        ui.scope = "all";
        ui.page = 0;
    });

    const setPage = (page) => {
        ui.page = Math.max(0, Math.min(page, pageCount.val - 1));
        ui.selectedAction = visibleRows.val[0]?.action || "";
    };

    const getParameterState = (entry) => {
        const key = entry.cheat.value;
        if (!parameterStates.has(key)) parameterStates.set(key, van.state(entry.parameter || ""));
        const state = parameterStates.get(key);
        if (entry.parameter && state.val !== entry.parameter) state.val = entry.parameter;
        return state;
    };

    const selectEntry = (entry, { focusParameter = false } = {}) => {
        ui.selectedAction = entry.action;
        if (compactInspector.val) ui.inspectorOpen = true;
        if (entry.parameter) getParameterState(entry).val = entry.parameter;

        if (focusParameter) {
            ui.inspectorTab = "details";
            requestAnimationFrame(() => document.querySelector("#atlas-cheat-parameter")?.focus());
        }
    };

    const getExecutionAction = (entry) => {
        if (!entry.cheat.needsParam) return entry.cheat.value;
        const parameter = getParameterState(entry).val.trim();
        return parameter ? `${entry.cheat.value} ${parameter}` : null;
    };

    const executeAction = async (action, message) => {
        if (!store.app.heartbeat) throw new Error("The injector is disconnected");

        try {
            const result = await API.executeCheatAction(action);
            store.addToRecent(action);
            store.notify(`Cheat ${result?.result || "Success"}`);
            return result;
        } catch (error) {
            store.notify(`Error executing '${message}': ${error.message}`, "error");
            throw error;
        }
    };

    const toggleFavorite = (entry) => {
        const action = getExecutionAction(entry);
        if (!action) {
            selectEntry(entry, { focusParameter: true });
            store.notify("Enter a value before saving this command", "error");
            return;
        }
        store.toggleFavorite(action);
    };

    const openConfig = (entry) => {
        selectEntry(entry);
        ui.inspectorTab = "config";
    };

    const handleTableKeydown = (event) => {
        if (["INPUT", "BUTTON", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
        const entries = visibleRows.val;
        if (entries.length === 0) return;

        const currentAction = selectedEntry.val?.action;
        let index = Math.max(
            0,
            entries.findIndex((entry) => entry.action === currentAction)
        );

        if (["ArrowDown", "j"].includes(event.key)) index = Math.min(entries.length - 1, index + 1);
        else if (["ArrowUp", "k"].includes(event.key)) index = Math.max(0, index - 1);
        else if (event.key === "Enter") {
            ui.inspectorOpen = true;
            requestAnimationFrame(() => document.querySelector(".atlas-cheat-inspector")?.focus());
            return;
        } else {
            return;
        }

        event.preventDefault();
        selectEntry(entries[index]);
        document
            .querySelector(`[data-cheat-row="${CSS.escape(entries[index].id)}"]`)
            ?.scrollIntoView({ block: "nearest" });
    };

    const workspaceContext = div(
        { class: "atlas-cheat-context", role: "navigation", "aria-label": "Cheat scopes" },
        div({ class: "atlas-tree-heading" }, "VIEWS"),
        ScopeButton({
            id: "all",
            label: "All cheats",
            count: () => store.data.cheats.length,
            activeScope: () => ui.scope,
            onSelect: selectScope,
            icon: Icons.Cheats(),
        }),
        ScopeButton({
            id: "active",
            label: "Active",
            count: () => [...stateMap.val.values()].filter(Boolean).length,
            activeScope: () => ui.scope,
            onSelect: selectScope,
            icon: Icons.Lightning(),
        }),
        ScopeButton({
            id: "favorites",
            label: "Favorites",
            count: () => store.data.favoriteCheats.length,
            activeScope: () => ui.scope,
            onSelect: selectScope,
            icon: Icons.Star(),
        }),
        ScopeButton({
            id: "recent",
            label: "Recent",
            count: () => store.data.recentCheats.length,
            activeScope: () => ui.scope,
            onSelect: selectScope,
            icon: Icons.Refresh(),
        }),
        div({ class: "atlas-tree-heading atlas-category-heading" }, "CATEGORIES"),
        div({ class: "atlas-category-scopes" }, () =>
            div(
                ...sortCategoryNames(matchingCategoryCounts.val.keys()).map((category) =>
                    ScopeButton({
                        id: `category:${category}`,
                        label: category,
                        count: () => matchingCategoryCounts.val.get(category) || 0,
                        activeScope: () => ui.scope,
                        onSelect: selectScope,
                    })
                )
            )
        )
    );
    registerWorkspaceContext(VIEWS.CHEATS.id, () => workspaceContext);

    const table = div(
        {
            class: "atlas-cheat-table",
            role: "table",
            tabindex: "0",
            "aria-label": "Cheat commands",
            onkeydown: handleTableKeydown,
        },
        div(
            { class: "atlas-cheat-toolbar" },
            div(
                { class: "atlas-cheat-search" },
                Icons.Search(),
                input({
                    type: "search",
                    class: "global-search-input",
                    value: () => ui.filter,
                    placeholder: "Filter by command, description, or category...",
                    "aria-label": "Filter cheats",
                    oninput: (event) => {
                        ui.filter = event.target.value;
                        ui.page = 0;
                    },
                })
            ),
            span({ class: "atlas-row-count", "aria-live": "polite" }, () => {
                const total = visibleEntries.val.length;
                if (total === 0) return "0 rows";
                const start = currentPage.val * PAGE_SIZE + 1;
                const end = Math.min(total, start + PAGE_SIZE - 1);
                return `${start}-${end} of ${total} rows`;
            }),
            div(
                { class: "atlas-cheat-pagination", "aria-label": "Cheat list pages" },
                button(
                    {
                        type: "button",
                        disabled: () => currentPage.val === 0,
                        "aria-label": "Previous page",
                        onclick: () => setPage(currentPage.val - 1),
                    },
                    Icons.ChevronLeft()
                ),
                span(() => `Page ${currentPage.val + 1} / ${pageCount.val}`),
                button(
                    {
                        type: "button",
                        disabled: () => currentPage.val >= pageCount.val - 1,
                        "aria-label": "Next page",
                        onclick: () => setPage(currentPage.val + 1),
                    },
                    Icons.ChevronRight()
                )
            ),
            button(
                {
                    type: "button",
                    class: "atlas-inspector-toggle",
                    disabled: () => !selectedEntry.val,
                    onclick: () => (ui.inspectorOpen = true),
                    "aria-controls": "atlas-cheat-inspector",
                    "aria-expanded": () => String(ui.inspectorOpen),
                },
                "Inspect"
            ),
            span({ class: "atlas-table-hint" }, "Up/Down or j/k move - Enter inspect")
        ),
        div(
            { class: "atlas-cheat-table-head", role: "row" },
            span({ role: "columnheader" }, "Command"),
            span({ role: "columnheader" }, "Description"),
            span({ role: "columnheader" }, "Category"),
            span({ role: "columnheader" }, "State / action")
        ),
        div({ class: "atlas-cheat-table-body", role: "rowgroup" }, () => {
            const entries = visibleRows.val;
            if (store.app.isLoading && store.data.cheats.length === 0) return Loader({ text: "INITIALIZING" });
            if (entries.length === 0) {
                return EmptyState({
                    icon: Icons.SearchX(),
                    title: "NO CHEATS FOUND",
                    subtitle: ui.filter ? "Try a different filter" : "This scope is empty",
                });
            }

            return div(
                { class: "atlas-cheat-row-list" },
                ...entries.map((entry) =>
                    CheatItem({
                        entry,
                        selected: () => selectedEntry.val?.action === entry.action,
                        getStateInfo,
                        isFavorite: (item) => store.isFavorite(item.action || item.cheat.value),
                        onSelect: selectEntry,
                        onExecute: executeAction,
                        onFavorite: toggleFavorite,
                        onOpenConfig: openConfig,
                        canExecute: () => store.app.heartbeat,
                    })
                )
            );
        })
    );

    const inspectorDetails = (entry) => {
        const parameterState = entry.cheat.needsParam ? getParameterState(entry) : null;
        const pending = van.state(false);
        const executeFromInspector = async () => {
            const action = getExecutionAction(entry);
            if (!action) {
                document.querySelector("#atlas-cheat-parameter")?.focus();
                return;
            }

            pending.val = true;
            try {
                await executeAction(action, entry.cheat.message || entry.cheat.value);
                ui.selectedAction = action;
            } finally {
                pending.val = false;
            }
        };

        return div(
            { class: "atlas-inspector-pane atlas-inspector-details" },
            div({ class: "atlas-inspector-description" }, entry.cheat.message || "No description provided."),
            entry.cheat.needsParam
                ? div(
                      { class: "atlas-inspector-field" },
                      span("Command value"),
                      input({
                          id: "atlas-cheat-parameter",
                          type: "text",
                          value: parameterState,
                          placeholder: "Enter required value",
                          oninput: (event) => (parameterState.val = event.target.value),
                          onkeydown: (event) => {
                              if (event.key === "Enter") executeFromInspector();
                          },
                      })
                  )
                : null,
            button(
                {
                    type: "button",
                    class: "atlas-inspector-run",
                    disabled: () =>
                        pending.val || !store.app.heartbeat || (entry.cheat.needsParam && !parameterState.val.trim()),
                    onclick: executeFromInspector,
                },
                () => {
                    if (pending.val) return "Running...";
                    if (!store.app.heartbeat) return "Disconnected";
                    const state = getStateInfo(entry.cheat.value);
                    if (state.known) return `${state.active ? "Disable" : "Enable"} cheat`;
                    return "Run command";
                }
            ),
            div(
                { class: "atlas-inspector-facts" },
                div(span("Category"), span(entry.cheat.category || "general")),
                div(
                    span("Behavior"),
                    span(() => {
                        const state = getStateInfo(entry.cheat.value);
                        return entry.cheat.needsParam ? "Parameterized command" : state.known ? "Toggle" : "Command";
                    })
                ),
                div(
                    span("Live state"),
                    span(() => {
                        const state = getStateInfo(entry.cheat.value);
                        return state.known ? (state.active ? "Active" : "Inactive") : "Not exposed";
                    })
                ),
                div(
                    span("Command"),
                    code(() => getExecutionAction(entry) || entry.cheat.value)
                )
            )
        );
    };

    const configInspectorCache = new Map();

    const getInspectorConfig = (entry) => {
        const cacheKey = entry.cheat.value;
        const cached = configInspectorCache.get(cacheKey);
        if (cached) return cached;

        const host = div({ class: "atlas-inspector-pane atlas-inspector-config" }, Loader({ text: "LOADING CONFIG" }));
        let mounted = false;

        configInspectorCache.set(cacheKey, host);
        getConfigDraft();

        van.derive(() => {
            if (!configDraftReady.val || mounted) return;

            const draft = getConfigDraft();
            const path = getCheatConfigPath(entry.cheat.value);
            const templateRoot = store.app.config?.cheatConfig;
            const hasPath = Boolean(
                draft?.cheatConfig && Array.isArray(path) && path.length > 0 && configPathExists(path, templateRoot)
            );

            mounted = true;

            if (!hasPath) {
                host.replaceChildren(
                    EmptyState({
                        icon: Icons.CircleSlash(),
                        title: "NO LINKED CONFIG",
                        subtitle: "This command does not map to an editable config subtree.",
                    })
                );
                return;
            }

            const nodes = ConfigNode({
                data: getConfigPathData(draft.cheatConfig, path),
                path: "cheatConfig",
                template: buildConfigPathTemplate(templateRoot, path),
                forceOpen: true,
            });

            host.replaceChildren(
                div({ class: "atlas-linked-config-path" }, `cheatConfig.${path.join(".")}`),
                div({ class: "atlas-linked-config-tree" }, ...nodes),
                button(
                    {
                        type: "button",
                        class: "atlas-open-full-config",
                        onclick: () => store.navigateToCheatConfig(entry.cheat.value),
                    },
                    "Open full Config",
                    Icons.ChevronRight()
                ),
                ConfigActions({ compact: true })
            );
        });

        return host;
    };

    const inspector = div(
        {
            id: "atlas-cheat-inspector",
            class: () => `atlas-cheat-inspector ${ui.inspectorOpen ? "is-open" : ""}`,
            tabindex: "-1",
            role: "complementary",
            "aria-label": "Selected cheat inspector",
            "aria-hidden": () => String(compactInspector.val && !ui.inspectorOpen),
            inert: () => compactInspector.val && !ui.inspectorOpen,
            onkeydown: (event) => {
                if (event.key === "Escape" && compactInspector.val) ui.inspectorOpen = false;
            },
        },
        () => {
            const entry = selectedEntry.val;
            if (!entry) {
                return EmptyState({
                    icon: Icons.CircleSlash(),
                    title: "NO SELECTION",
                    subtitle: "Select a command to inspect it.",
                });
            }

            return div(
                { class: "atlas-inspector-content" },
                div(
                    { class: "atlas-inspector-header" },
                    span({ class: "atlas-inspector-icon", "aria-hidden": "true" }, Icons.Lightning()),
                    div({ class: "atlas-inspector-title" }, span(entry.cheat.value), code(entry.action)),
                    div(
                        { class: "atlas-inspector-header-actions" },
                        button(
                            {
                                type: "button",
                                class: () =>
                                    `atlas-cheat-favorite ${store.isFavorite(getExecutionAction(entry) || entry.action) ? "is-favorite" : ""}`,
                                title: "Toggle favorite",
                                "aria-label": "Toggle favorite",
                                onclick: () => toggleFavorite(entry),
                            },
                            Icons.Star()
                        ),
                        button(
                            {
                                type: "button",
                                class: "atlas-inspector-close",
                                title: "Close inspector",
                                "aria-label": "Close cheat inspector",
                                onclick: () => (ui.inspectorOpen = false),
                            },
                            Icons.X()
                        )
                    )
                ),
                div(
                    { class: "atlas-inspector-tabs", role: "tablist" },
                    button(
                        {
                            type: "button",
                            role: "tab",
                            class: () => (ui.inspectorTab === "details" ? "is-active" : ""),
                            "aria-selected": () => String(ui.inspectorTab === "details"),
                            onclick: () => (ui.inspectorTab = "details"),
                        },
                        "Details"
                    ),
                    button(
                        {
                            type: "button",
                            role: "tab",
                            class: () => (ui.inspectorTab === "config" ? "is-active" : ""),
                            "aria-selected": () => String(ui.inspectorTab === "config"),
                            disabled: () => !store.hasConfigEntry(entry.cheat.value),
                            onclick: () => (ui.inspectorTab = "config"),
                        },
                        "Config"
                    )
                ),
                () => (ui.inspectorTab === "config" ? getInspectorConfig(entry) : inspectorDetails(entry))
            );
        }
    );

    const inspectorBackdrop = button({
        type: "button",
        class: () => `atlas-inspector-backdrop ${ui.inspectorOpen ? "is-visible" : ""}`,
        tabindex: () => (compactInspector.val && ui.inspectorOpen ? "0" : "-1"),
        "aria-label": "Close cheat inspector",
        onclick: () => (ui.inspectorOpen = false),
    });

    return div(
        { id: "cheats-tab", class: "tab-pane atlas-cheats-pane" },
        div({ class: "atlas-cheats-workbench" }, table, inspectorBackdrop, inspector)
    );
};
