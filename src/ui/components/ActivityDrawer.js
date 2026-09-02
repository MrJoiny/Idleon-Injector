import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { VIEWS } from "../state/constants.js";
import { Icons } from "../assets/icons.js";
import { formatDisplayValue } from "../utils/search/valueUtils.js";

const { section, div, button, span, code } = van.tags;

const formatTime = (timestamp) =>
    new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const ActivityPanel = () =>
    div(
        {
            class: () => `atlas-drawer-panel ${store.app.activityDrawer === "activity" ? "is-active" : ""}`,
            id: "atlas-activity-panel",
            role: "tabpanel",
            "aria-labelledby": "atlas-activity-tab",
        },
        () => {
            const entries = store.app.notificationHistory.slice(0, 10);
            if (!entries.length) {
                return div({ class: "atlas-drawer-empty" }, "No activity recorded in this session.");
            }

            return div(
                { class: "atlas-activity-list" },
                ...entries.map((entry) =>
                    div(
                        { class: `atlas-activity-row is-${entry.type || "success"}` },
                        span({ class: "atlas-activity-time" }, formatTime(entry.id)),
                        span({ class: "atlas-activity-kind" }, entry.type === "error" ? "error" : "event"),
                        span({ class: "atlas-activity-message" }, entry.message)
                    )
                )
            );
        }
    );

const MonitorPanel = () =>
    div(
        {
            class: () => `atlas-drawer-panel ${store.app.activityDrawer === "monitors" ? "is-active" : ""}`,
            id: "atlas-monitors-panel",
            role: "tabpanel",
            "aria-labelledby": "atlas-monitors-tab",
        },
        () => {
            const monitors = Object.entries(store.data.monitorValues || {}).sort(([, a], [, b]) =>
                String(a?.path || "").localeCompare(String(b?.path || ""))
            );

            if (!monitors.length) {
                return div(
                    { class: "atlas-drawer-empty" },
                    span("No live monitors are subscribed."),
                    button(
                        {
                            class: "atlas-inline-action",
                            type: "button",
                            onclick: () => store.setActiveTab(VIEWS.SEARCH.id),
                        },
                        "Open Search"
                    )
                );
            }

            return div(
                { class: "atlas-monitor-list" },
                ...monitors.map(([id, monitor]) => {
                    const latest = Array.isArray(monitor?.history) ? monitor.history[0] : null;
                    const displayValue = latest ? formatDisplayValue(latest.value) : "Waiting for value...";

                    return div(
                        { class: `atlas-monitor-row ${monitor?.error ? "has-error" : ""}` },
                        span({ class: "atlas-monitor-status", "aria-hidden": "true" }),
                        code({ class: "atlas-monitor-path", title: monitor?.path || id }, monitor?.path || id),
                        code({ class: "atlas-monitor-value" }, monitor?.error || displayValue)
                    );
                })
            );
        }
    );

export const ActivityDrawer = () =>
    section(
        {
            class: () => `atlas-activity-drawer ${store.app.activityDrawer ? "is-open" : ""}`,
            id: "atlas-activity-drawer",
            "aria-label": "Activity and monitors",
            "aria-hidden": () => String(!store.app.activityDrawer),
            inert: () => !store.app.activityDrawer,
        },
        div(
            { class: "atlas-drawer-tabs", role: "tablist", "aria-label": "Runtime information" },
            button(
                {
                    class: () => `atlas-drawer-tab ${store.app.activityDrawer === "activity" ? "is-active" : ""}`,
                    id: "atlas-activity-tab",
                    type: "button",
                    role: "tab",
                    "aria-selected": () => String(store.app.activityDrawer === "activity"),
                    "aria-controls": "atlas-activity-panel",
                    onclick: () => store.openActivityDrawer("activity"),
                },
                Icons.Bell(),
                "Activity"
            ),
            button(
                {
                    class: () => `atlas-drawer-tab ${store.app.activityDrawer === "monitors" ? "is-active" : ""}`,
                    id: "atlas-monitors-tab",
                    type: "button",
                    role: "tab",
                    "aria-selected": () => String(store.app.activityDrawer === "monitors"),
                    "aria-controls": "atlas-monitors-panel",
                    onclick: () => store.openActivityDrawer("monitors"),
                },
                Icons.Eye(),
                "Monitors"
            ),
            span({ class: "atlas-drawer-summary" }, () => {
                const monitorCount = Object.keys(store.data.monitorValues || {}).length;
                return `${store.app.notificationHistory.length} events / ${monitorCount} monitors`;
            }),
            button(
                {
                    class: "atlas-drawer-close",
                    type: "button",
                    onclick: () => store.closeActivityDrawer(),
                    "aria-label": "Close activity drawer",
                },
                Icons.X()
            )
        ),
        div({ class: "atlas-drawer-content" }, ActivityPanel(), MonitorPanel())
    );
