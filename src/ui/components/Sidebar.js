import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { VIEWS, IS_ELECTRON } from "../state/constants.js";
import { Icons } from "../assets/icons.js";
import { withTooltip } from "./Tooltip.js";
import { NotificationHistory } from "./NotificationHistory.js";

const { nav, div, button, span, a } = van.tags;

const SHORTCUTS_TOOLTIP_TEXT =
    "Keyboard shortcuts:\n" +
    "1 - Cheats\n" +
    "2 - Account Options\n" +
    "3 - Config\n" +
    "4 - Search\n" +
    "5 - Monitor\n" +
    "6 - Chromedebug\n" +
    "/ - Focus search\n" +
    "Ctrl+S - Save config (Config tab)\n";

const ActiveCheatList = () => {
    return div({ class: "active-cheats" }, div({ class: "active-cheats-header" }, "ACTIVE CHEATS"), () => {
        const activeCheats = store.getActiveCheats();

        if (activeCheats.length === 0) {
            return div({ class: "active-cheats-list" }, span({ class: "no-active-cheats" }, "None"));
        }

        return div(
            { class: "active-cheats-list" },
            ...activeCheats.map((cheat) =>
                span(
                    { class: "active-cheat-item", onclick: () => store.executeCheat(cheat, cheat) },
                    span({ class: "active-cheat-text" }, cheat)
                )
            )
        );
    });
};

export const Sidebar = () => {
    const NavBtn = (viewConfig, Icon) =>
        withTooltip(
            button(
                {
                    class: () => `tab-button ${store.app.activeTab === viewConfig.id ? "active" : ""}`,
                    onclick: () => (store.app.activeTab = viewConfig.id),
                },
                Icon(),
                span({ class: "tab-label" }, viewConfig.sidebarLabel)
            ),
            viewConfig.sidebarLabel,
            "right",
            () => store.app.sidebarCollapsed
        );

    return nav(
        {
            class: () => `sidebar ${store.app.sidebarCollapsed ? "sidebar-collapsed" : ""}`,
        },
        div(
            { class: "brand" },
            div(
                { class: "brand-main" },
                div({ class: "brand-logo" }, Icons.Logo()),
                div(
                    { class: "brand-text" },
                    span("IDLEON"),
                    span({ class: "highlight" }, "INJECTOR"),
                    span({ class: "brand-version" }, () => (store.app.appVersion ? `v${store.app.appVersion}` : ""))
                )
            ),
            NotificationHistory()
        ),
        div(
            { class: "nav-menu" },
            NavBtn(VIEWS.CHEATS, Icons.Cheats),
            NavBtn(VIEWS.ACCOUNT, Icons.Account),
            NavBtn(VIEWS.CONFIG, Icons.Config),
            NavBtn(VIEWS.SEARCH, Icons.Search),
            NavBtn(VIEWS.MONITOR, Icons.Eye),
            NavBtn(VIEWS.DEVTOOLS, Icons.DevTools),
            withTooltip(
                a(
                    {
                        class: "tab-button github-link",
                        href: "https://github.com/MrJoiny/Idleon-Injector",
                        target: "_blank",
                        onclick: (e) => {
                            if (IS_ELECTRON) {
                                e.preventDefault();
                                store.openExternalUrl("https://github.com/MrJoiny/Idleon-Injector");
                            }
                        },
                    },
                    Icons.GitHub(),
                    span({ class: "tab-label" }, "GitHub")
                ),
                "Official GitHub Repository",
                "right",
                () => store.app.sidebarCollapsed
            )
        ),
        ActiveCheatList(),
        div(
            { class: "system-status" },
            div({
                class: () => {
                    const online = IS_ELECTRON || store.app.heartbeat;
                    return `status-dot ${online ? "is-online" : "is-offline"}`;
                },
            }),
            span(
                {
                    id: "system-status-text",
                    class: () => {
                        const online = IS_ELECTRON || store.app.heartbeat;
                        return online ? "is-online" : "is-offline";
                    },
                },
                () => (IS_ELECTRON || store.app.heartbeat ? "SYSTEM ONLINE" : "CONNECTION LOST")
            ),

            withTooltip(
                button(
                    {
                        type: "button",
                        class: "system-shortcuts-button",
                        "aria-label": "Keyboard shortcuts",
                    },
                    Icons.Keyboard()
                ),
                SHORTCUTS_TOOLTIP_TEXT,
                "right",
                () => !store.app.sidebarCollapsed
            )
        ),

        withTooltip(
            button({ class: "sidebar-toggle", onclick: () => store.toggleSidebar() }, () =>
                store.app.sidebarCollapsed ? Icons.ChevronRight() : Icons.ChevronLeft()
            ),
            () => (store.app.sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"),
            "right"
        )
    );
};
