import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { VIEWS, VIEW_ORDER } from "../state/constants.js";
import { Icons } from "../assets/icons.js";

const { header, div, button, span } = van.tags;

const activeView = () => VIEW_ORDER.find((view) => view.id === store.app.activeTab) || VIEWS.CHEATS;

export const AtlasHeader = () =>
    header(
        { class: "atlas-header" },
        div(
            { class: "atlas-header-brand" },
            button(
                {
                    class: "atlas-mobile-menu",
                    type: "button",
                    onclick: () => store.toggleMobileSidebar(),
                    "aria-controls": "atlas-sidebar",
                    "aria-expanded": () => String(store.app.sidebarMobileOpen),
                    "aria-label": () =>
                        store.app.sidebarMobileOpen ? "Close workspace navigation" : "Open workspace navigation",
                },
                span({ "aria-hidden": "true" }, span(), span(), span())
            ),
            span({ class: "atlas-brand-mark", "aria-hidden": "true" }, Icons.Logo()),
            span({ class: "atlas-brand-name" }, "Idleon Injector")
        ),
        div(
            { class: "atlas-breadcrumb", "aria-label": "Current workspace" },
            span({ class: "atlas-breadcrumb-root" }, "Workspace"),
            Icons.ChevronRight({ class: "atlas-breadcrumb-separator" }),
            span({ class: "atlas-breadcrumb-current" }, () => activeView().label)
        ),
        div(
            { class: "atlas-header-actions" },
            span(
                {
                    class: () => `atlas-connection ${store.app.heartbeat ? "is-online" : "is-offline"}`,
                    role: "status",
                    "aria-live": "polite",
                },
                span({ class: "atlas-connection-dot", "aria-hidden": "true" }),
                span(() => {
                    if (!store.app.heartbeat) return "Disconnected";
                    return store.app.connectionTransport === "websocket" ? "Connected / WS" : "Connected / HTTP";
                })
            ),
            span(
                {
                    class: () => `atlas-dirty-indicator ${store.app.configDirty ? "is-visible" : ""}`,
                    role: "status",
                    title: "Unsaved config changes",
                },
                span({ "aria-hidden": "true" }, "*"),
                "Unsaved changes"
            ),
            button(
                {
                    class: () =>
                        `atlas-header-button atlas-version ${store.app.updateInfo?.updateAvailable ? "has-update" : ""}`,
                    type: "button",
                    onclick: () => {
                        if (store.app.updateInfo?.updateAvailable) store.openUpdateModal();
                    },
                    disabled: () => !store.app.updateInfo?.updateAvailable,
                    title: () =>
                        store.app.updateInfo?.updateAvailable
                            ? "Update available"
                            : store.app.appInfo?.version
                              ? "Current version"
                              : "Version unavailable",
                },
                () => (store.app.appInfo?.version ? `v${store.app.appInfo.version}` : "Version unavailable"),
                () =>
                    store.app.updateInfo?.updateAvailable ? span({ class: "atlas-update-dot" }) : span({ hidden: true })
            ),
            button(
                {
                    class: "atlas-header-button atlas-theme-toggle",
                    type: "button",
                    onclick: () => {
                        const currentTheme = document.documentElement.dataset.theme || store.app.theme;
                        store.setTheme(currentTheme === "dark" ? "light" : "dark");
                    },
                    title: () => (store.app.theme === "light" ? "Switch to dark theme" : "Switch to light theme"),
                    "aria-label": () =>
                        store.app.theme === "light" ? "Switch to dark theme" : "Switch to light theme",
                },
                () => (store.app.theme === "light" ? Icons.Moon() : Icons.Sun())
            ),
            button(
                {
                    class: () =>
                        `atlas-header-button atlas-drawer-trigger ${store.app.activityDrawer === "activity" ? "is-active" : ""}`,
                    type: "button",
                    onclick: () => store.toggleActivityDrawer("activity"),
                    "aria-controls": "atlas-activity-drawer",
                    "aria-expanded": () => String(store.app.activityDrawer === "activity"),
                },
                Icons.Bell(),
                span({ class: "atlas-action-label" }, "Activity"),
                () => {
                    const count = store.app.notificationHistory.length;
                    return count
                        ? span(
                              { class: "atlas-activity-count", "aria-label": `${count} activity entries` },
                              count > 99 ? "99+" : count
                          )
                        : span({ hidden: true });
                }
            ),
            button(
                {
                    class: () =>
                        `atlas-header-button atlas-drawer-trigger ${store.app.activityDrawer === "monitors" ? "is-active" : ""}`,
                    type: "button",
                    onclick: () => store.toggleActivityDrawer("monitors"),
                    "aria-controls": "atlas-activity-drawer",
                    "aria-expanded": () => String(store.app.activityDrawer === "monitors"),
                },
                Icons.Eye(),
                span({ class: "atlas-action-label" }, "Monitors")
            )
        )
    );
