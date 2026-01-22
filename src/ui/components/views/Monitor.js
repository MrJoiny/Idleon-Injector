import van from "../../vendor/van-1.6.0.js";
import store from "../../state/store.js";
import { Icons } from "../../assets/icons.js";

const { div, h2, table, thead, tbody, tr, th, td, span, button, input } = van.tags;

/**
 * Value Monitor View Component
 */
export const Monitor = () => {
    const manualPath = van.state("");

    const handleAdd = () => {
        const path = manualPath.val.trim();
        if (path) {
            store.subscribeMonitor(path);
            manualPath.val = "";
        }
    };

    const formatValue = (val) => {
        if (val === null) return "null";
        if (val === undefined) return "undefined";
        if (typeof val === "object") return "[obj]";
        return String(val);
    };

    return div(
        { id: "monitor-tab", class: "tab-pane monitor-view" },
        div(
            { class: "view-header" },
            h2("Value Monitor"),
            div(
                { class: "monitor-controls" },
                input({
                    type: "text",
                    placeholder: "Enter path (e.g. gga.h.GemsOwned)",
                    value: manualPath,
                    oninput: (e) => (manualPath.val = e.target.value),
                    onkeydown: (e) => e.key === "Enter" && handleAdd(),
                }),
                button({ class: "btn-primary", onclick: handleAdd }, "Add Watcher")
            )
        ),
        div(
            { class: "view-content" },
            div(
                { class: "table-responsive" },
                () => {
                    const entries = Object.entries(store.data.monitorValues);
                    const headerRow = tr(
                        th("ID"),
                        th("Path"),
                        th("Current Value"),
                        th("History (Last 10)"),
                        th({ class: "actions-col" }, "")
                    );

                    if (entries.length === 0) {
                        return table(
                            { class: "monitor-table" },
                            thead(headerRow),
                            tbody(tr(td({ colspan: 5, class: "empty-msg" }, "No values being monitored.")))
                        );
                    }

                    return table(
                        { class: "monitor-table" },
                        thead(headerRow),
                        tbody(
                            ...entries.map(([id, data]) => {
                                const current = data.history[0]?.value;
                                const historyItems = data.history.slice(1);

                                return tr(
                                    td(span({ class: "monitor-id" }, id)),
                                    td(span({ class: "monitor-path" }, data.path)),
                                    td(div({ class: "monitor-current" }, formatValue(current))),
                                    td(
                                        div(
                                            { class: "monitor-history-list" },
                                            ...historyItems.map((h) =>
                                                span({ class: "history-item", title: new Date(h.ts).toLocaleTimeString() }, formatValue(h.value))
                                            )
                                        )
                                    ),
                                    td(
                                        { class: "actions-col" },
                                        button(
                                            {
                                                class: "btn-icon btn-danger",
                                                title: "Unwatch",
                                                onclick: () => store.unsubscribeMonitor(id),
                                            },
                                            Icons.X()
                                        )
                                    )
                                );
                            })
                        )
                    );
                }
            )
        )
    );
};
