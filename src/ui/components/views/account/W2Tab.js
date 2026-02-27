/**
 * World 2 Tab — YUM-YUM DESERT
 * Sub-tabs will be added here as each system is implemented.
 * Follow the same pattern as W1Tab.js.
 */

import van from "../../../vendor/van-1.6.0.js";

const { div, button, span, p } = van.tags;

const W2_SUBTABS = [
    { id: "coming-soon", label: "COMING SOON" },
];

export const W2Tab = () => {
    const activeSubTab = van.state(W2_SUBTABS[0].id);

    return div(
        { class: "world-tab w2-world-tab" },

        div(
            { class: "world-tab-header w2-header" },
            span({ class: "world-tab-badge" }, "W2"),
            div(
                { class: "world-tab-title-group" },
                van.tags.h2({ class: "world-tab-title" }, "YUM-YUM DESERT"),
                p({ class: "world-tab-subtitle" }, "Alchemy, Arcade, Post Office & Obols")
            )
        ),

        div(
            { class: "world-sub-nav" },
            ...W2_SUBTABS.map((tab) =>
                button(
                    {
                        class: () => `world-sub-tab-btn world-sub-tab-btn--stub ${activeSubTab.val === tab.id ? "active" : ""}`,
                        onclick: () => (activeSubTab.val = tab.id),
                    },
                    tab.label
                )
            )
        ),

        div(
            { class: "world-sub-content" },
            div(
                { class: "world-sub-pane active world-sub-pane--empty" },
                span({ class: "world-empty-icon" }, "🧪"),
                p({ class: "world-empty-label" }, "W2 SYSTEMS COMING SOON"),
                p({ class: "world-empty-desc" }, "Follow the W1Tab pattern to add sub-tabs for each W2 system.")
            )
        )
    );
};
