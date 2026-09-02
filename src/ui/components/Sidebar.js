import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { VIEWS, VIEW_ORDER, IS_ELECTRON } from "../state/constants.js";
import { WorkspaceContextSlot } from "./WorkspaceContext.js";
import { Icons } from "../assets/icons.js";

const { aside, nav, div, button, span, a } = van.tags;

const viewIcons = {
    [VIEWS.CHEATS.id]: Icons.Cheats,
    [VIEWS.ACCOUNT.id]: Icons.Account,
    [VIEWS.CONFIG.id]: Icons.Config,
    [VIEWS.SEARCH.id]: Icons.Search,
    [VIEWS.DEVTOOLS.id]: Icons.DevTools,
};

const DefaultWorkspaceContext = (viewId) => {
    const view = VIEW_ORDER.find((candidate) => candidate.id === viewId);
    return div(
        { class: "atlas-context-placeholder" },
        div({ class: "atlas-context-heading" }, "Context"),
        div({ class: "atlas-context-empty" }, `${view?.label || "Workspace"} controls are available in the main view.`)
    );
};

export const Sidebar = () => {
    const compactQuery = window.matchMedia("(max-width: 1023px)");
    const responsiveRailQuery = window.matchMedia("(min-width: 1024px) and (max-width: 1280px)");
    const compactLayout = van.state(compactQuery.matches);
    const responsiveRail = van.state(responsiveRailQuery.matches);

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
                    responsiveRail.val && ![VIEWS.CHEATS.id, VIEWS.ACCOUNT.id].includes(store.app.activeTab)
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
        div({ class: "atlas-sidebar-divider" }),
        WorkspaceContextSlot({ fallback: DefaultWorkspaceContext }),
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
