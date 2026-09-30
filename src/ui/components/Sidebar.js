import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { VIEWS, VIEW_ORDER, IS_ELECTRON } from "../state/constants.js";
import { Icons } from "../assets/icons.js";
import { fetchCheatStates, executeCheatAction } from "../services/api.js";
import { flattenCheatStates, resolveStoredAction } from "./views/AtlasCheats.js";

const { aside, nav, div, button, span, a } = van.tags;

const viewIcons = {
    [VIEWS.CHEATS.id]: Icons.Cheats,
    [VIEWS.ACCOUNT.id]: Icons.Account,
    [VIEWS.CONFIG.id]: Icons.Config,
    [VIEWS.SEARCH.id]: Icons.Search,
    [VIEWS.DEVTOOLS.id]: Icons.DevTools,
};

const sectionPreference = (name) => localStorage.getItem(`sidebar${name}Open`) !== "false";

const QuickAccess = ({ collapsed, expand }) => {
    const activeOpen = van.state(sectionPreference("Active"));
    const favoritesOpen = van.state(sectionPreference("Favorites"));
    const pending = van.state("");
    const feedback = van.state(null);
    const states = van.derive(() => flattenCheatStates(store.data.activeCheatStates));
    const active = van.derive(() =>
        [...states.val]
            .filter(([, enabled]) => enabled)
            .map(([action]) => action)
            .sort((a, b) => a.localeCompare(b))
    );

    const toggleSection = (name, state) => {
        if (collapsed()) {
            expand();
            state.val = true;
        } else {
            state.val = !state.val;
        }
        localStorage.setItem(`sidebar${name}Open`, String(state.val));
    };

    const showError = (action, message) => {
        const value = { action, message };
        feedback.val = value;
        setTimeout(() => {
            if (feedback.val === value) feedback.val = null;
        }, 2600);
    };

    const run = async (action, desiredState = null) => {
        if (pending.val === action || !store.app.heartbeat) return;
        pending.val = action;
        if (feedback.val?.action === action) feedback.val = null;
        try {
            if (desiredState !== null) {
                const beforeData = (await fetchCheatStates()).data;
                const before = flattenCheatStates(beforeData);
                store.data.activeCheatStates = beforeData;
                if (!before.has(action)) throw new Error("Switch state is unavailable");
                if (before.get(action) !== desiredState) await executeCheatAction(action);
                const afterData = (await fetchCheatStates()).data;
                const after = flattenCheatStates(afterData);
                store.data.activeCheatStates = afterData;
                if (after.get(action) !== desiredState) throw new Error("State did not change as requested");
            } else {
                await executeCheatAction(action);
                store.addToRecent(action);
            }
        } catch (error) {
            showError(action, error.message);
        } finally {
            pending.val = "";
        }
    };

    const feedbackFor = (action) =>
        span({ class: "atlas-quick-feedback is-error", "aria-live": "polite" }, () =>
            feedback.val?.action === action ? feedback.val.message : ""
        );

    const SectionHeader = (name, Icon, open, count) =>
        button(
            {
                class: "atlas-quick-header",
                type: "button",
                title: () => `${name} (${count()})`,
                "aria-label": () => `${name}, ${count()} items`,
                "aria-expanded": () => String(open.val),
                onclick: () => toggleSection(name, open),
            },
            Icon(),
            span({ class: "atlas-quick-heading" }, name),
            span({ class: "atlas-quick-count" }, count),
            span({ class: "atlas-quick-chevron" }, () => (open.val ? "⌄" : "›"))
        );

    const activeList = div({ class: "atlas-quick-list", "aria-label": "Active cheats" }, () => {
        if (!active.val.length) return div({ class: "atlas-quick-empty" }, "No active cheats");
        return div(
            ...active.val.map((action) =>
                div(
                    { class: "atlas-quick-row" },
                    button(
                        {
                            class: "atlas-quick-name",
                            type: "button",
                            title: action,
                            onclick: () => store.navigateToCheat(action, "active"),
                        },
                        action
                    ),
                    button(
                        {
                            class: "atlas-quick-action",
                            type: "button",
                            disabled: () => pending.val === action || !store.app.heartbeat,
                            "aria-label": `Disable ${action}`,
                            onclick: () => run(action, false),
                        },
                        () => (pending.val === action ? "…" : "Off")
                    ),
                    button(
                        {
                            class: () => `atlas-quick-remove ${store.isFavorite(action) ? "is-favorite" : ""}`,
                            type: "button",
                            title: () =>
                                `${store.isFavorite(action) ? "Remove" : "Add"} ${action} ${store.isFavorite(action) ? "from" : "to"} favorites`,
                            "aria-label": () =>
                                `${store.isFavorite(action) ? "Remove" : "Add"} ${action} ${store.isFavorite(action) ? "from" : "to"} favorites`,
                            "aria-pressed": () => String(store.isFavorite(action)),
                            onclick: () => store.toggleFavorite(action),
                        },
                        Icons.Star()
                    ),
                    feedbackFor(action)
                )
            )
        );
    });

    const favoriteList = div({ class: "atlas-quick-list", "aria-label": "Favorite cheats" }, () => {
        const favorites = [...store.data.favoriteCheats];
        if (!favorites.length) return div({ class: "atlas-quick-empty" }, "Star cheats to save them here");
        return div(
            ...favorites.map((action) => {
                const entry = resolveStoredAction(action, [...store.data.cheats]);
                const known = Boolean(entry);
                const toggle =
                    known && !entry.cheat.needsParam && !entry.cheat.choices && states.val.has(entry.cheat.value);
                const enabled = toggle && states.val.get(entry.cheat.value) === true;
                return div(
                    { class: "atlas-quick-row" },
                    button(
                        {
                            class: "atlas-quick-name",
                            type: "button",
                            disabled: !known,
                            title: entry?.cheat.message || action,
                            onclick: () => store.navigateToCheat(action, "favorites"),
                        },
                        span(entry?.cheat.value || action),
                        entry?.parameter ? span({ class: "atlas-quick-param" }, entry.parameter) : null,
                        !known ? span({ class: "atlas-quick-param" }, "Unavailable") : null
                    ),
                    button(
                        {
                            class: "atlas-quick-action",
                            type: "button",
                            disabled: () => !known || pending.val === action || !store.app.heartbeat,
                            "aria-label": `${toggle ? (enabled ? "Disable" : "Enable") : "Run"} ${action}`,
                            onclick: () => run(action, toggle ? !enabled : null),
                        },
                        () => (pending.val === action ? "…" : toggle ? (enabled ? "Disable" : "Enable") : "Run")
                    ),
                    button(
                        {
                            class: "atlas-quick-remove is-favorite",
                            type: "button",
                            title: `Remove ${action} from favorites`,
                            "aria-label": `Remove ${action} from favorites`,
                            onclick: () => store.toggleFavorite(action),
                        },
                        Icons.Star()
                    ),
                    entry?.cheat.message?.startsWith("!danger!")
                        ? span({ class: "atlas-quick-warning" }, entry.cheat.message)
                        : null,
                    feedbackFor(action)
                );
            })
        );
    });

    fetchCheatStates()
        .then((result) => {
            store.data.activeCheatStates = result.data || {};
        })
        .catch(() => {});

    return div(
        { class: "atlas-quick-access", "aria-label": "Quick cheat access" },
        div(
            {
                class: () => `atlas-quick-section ${activeOpen.val ? "is-open" : ""}`,
            },
            SectionHeader("Active", Icons.Lightning, activeOpen, () => active.val.length),
            activeList
        ),
        div(
            {
                class: () => `atlas-quick-section ${favoritesOpen.val ? "is-open" : ""}`,
            },
            SectionHeader("Favorites", Icons.Star, favoritesOpen, () => store.data.favoriteCheats.length),
            favoriteList
        )
    );
};

export const Sidebar = () => {
    const compactQuery = window.matchMedia("(max-width: 1023px)");
    const responsiveRailQuery = window.matchMedia("(min-width: 1024px) and (max-width: 1280px)");
    const compactLayout = van.state(compactQuery.matches);
    const responsiveRail = van.state(responsiveRailQuery.matches);
    const railExpanded = van.state(false);

    compactQuery.addEventListener("change", (event) => {
        compactLayout.val = event.matches;
        if (!event.matches) store.closeMobileSidebar();
    });

    responsiveRailQuery.addEventListener("change", (event) => {
        responsiveRail.val = event.matches;
    });

    van.derive(() => {
        if (!compactLayout.val || !store.app.sidebarMobileOpen) return;
        requestAnimationFrame(() => document.querySelector("#atlas-sidebar .atlas-nav-button.active")?.focus());
    });

    return aside(
        {
            class: () =>
                `sidebar atlas-sidebar ${store.app.sidebarCollapsed ? "sidebar-collapsed" : ""} ${
                    responsiveRail.val && store.app.activeTab !== VIEWS.CHEATS.id && !railExpanded.val
                        ? "is-responsive-rail"
                        : ""
                } ${store.app.sidebarMobileOpen ? "is-mobile-open" : ""}`,
            id: "atlas-sidebar",
            "aria-label": "Workspace navigation",
            "aria-hidden": () => String(compactLayout.val && !store.app.sidebarMobileOpen),
            inert: () => compactLayout.val && !store.app.sidebarMobileOpen,
        },
        div({ class: "atlas-sidebar-section-label" }, "Workspaces"),
        nav(
            { class: "atlas-workspace-nav", "aria-label": "Workspaces" },
            ...VIEW_ORDER.map((view, index) => {
                const Icon = viewIcons[view.id];
                return button(
                    {
                        class: () => `atlas-nav-button ${store.app.activeTab === view.id ? "active" : ""}`,
                        type: "button",
                        onclick: () => store.setActiveTab(view.id),
                        "aria-current": () => (store.app.activeTab === view.id ? "page" : "false"),
                        title: `${view.label} (${index + 1})`,
                    },
                    Icon(),
                    span({ class: "tab-label" }, view.label),
                    span({ class: "atlas-nav-shortcut", "aria-hidden": "true" }, index + 1)
                );
            })
        ),
        QuickAccess({
            collapsed: () =>
                !compactLayout.val &&
                (store.app.sidebarCollapsed ||
                    (responsiveRail.val && store.app.activeTab !== VIEWS.CHEATS.id && !railExpanded.val)),
            expand: () => {
                if (store.app.sidebarCollapsed) store.toggleSidebar();
                railExpanded.val = true;
            },
        }),
        div({ class: "atlas-sidebar-divider" }),
        div(
            { class: "atlas-sidebar-footer" },
            a(
                {
                    class: "atlas-nav-button atlas-github-link",
                    href: "https://github.com/MrJoiny/Idleon-Injector",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    onclick: (event) => {
                        if (!IS_ELECTRON) return;
                        event.preventDefault();
                        store.openExternalUrl("https://github.com/MrJoiny/Idleon-Injector");
                    },
                    title: "Open GitHub repository",
                },
                Icons.GitHub(),
                span({ class: "tab-label" }, "GitHub")
            ),
            div(
                { class: "atlas-sidebar-controls" },
                button(
                    {
                        class: "sidebar-toggle",
                        type: "button",
                        onclick: () => store.toggleSidebar(),
                        "aria-label": () => (store.app.sidebarCollapsed ? "Expand navigation" : "Collapse navigation"),
                        title: () => (store.app.sidebarCollapsed ? "Expand navigation" : "Collapse navigation"),
                    },
                    () => (store.app.sidebarCollapsed ? Icons.ChevronRight() : Icons.ChevronLeft()),
                    span({ class: "tab-label" }, "Collapse")
                )
            )
        )
    );
};

export const SidebarBackdrop = () =>
    button({
        class: () => `atlas-sidebar-backdrop ${store.app.sidebarMobileOpen ? "is-visible" : ""}`,
        type: "button",
        onclick: () => store.closeMobileSidebar(),
        "aria-label": "Close workspace navigation",
        tabindex: () => (store.app.sidebarMobileOpen ? "0" : "-1"),
    });
