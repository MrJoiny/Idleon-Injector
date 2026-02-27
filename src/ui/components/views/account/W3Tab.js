/**
 * World 3 Tab — FROSTBITE TUNDRA
 * Sub-tabs will be added here as each system is implemented.
 * Follow the same pattern as W1Tab.js.
 */

import van from "../../../vendor/van-1.6.0.js";

const { div, button, span, p } = van.tags;

const W3_SUBTABS = [
    { id: "coming-soon", label: "COMING SOON" },
];

export const W3Tab = () => {
    const activeSubTab = van.state(W3_SUBTABS[0].id);

    return div(
        { class: "world-tab w3-world-tab" },

        div(
            { class: "world-tab-header w3-header" },
            span({ class: "world-tab-badge" }, "W3"),
            div(
                { class: "world-tab-title-group" },
                van.tags.h2({ class: "world-tab-title" }, "FROSTBITE TUNDRA"),
                p({ class: "world-tab-subtitle" }, "Construction, Library, Trapping & Worship")
            )
        ),

        div(
            { class: "world-sub-nav" },
            ...W3_SUBTABS.map((tab) =>
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
                span({ class: "world-empty-icon" }, "❄"),
                p({ class: "world-empty-label" }, "W3 SYSTEMS COMING SOON"),
                p({ class: "world-empty-desc" }, "Follow the W1Tab pattern to add sub-tabs for each W3 system.")
            )
        )
    );
};
