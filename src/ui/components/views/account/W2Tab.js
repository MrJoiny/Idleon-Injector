/**
 * World 2 Tab — YUM-YUM DESERT
 *
 * Sub-tabs:
 *   - ALCHEMY  (inner: Brewing ✓, Liquid/Vials/Pay2Win placeholders)
 *   - ARCADE, POST OFFICE, OBOLS  (placeholders)
 */

import van from "../../../vendor/van-1.6.0.js";
import { Icons } from "../../../assets/icons.js";
import { BrewingTab } from "./w2/BrewingTab.js";
import { LiquidTab } from "./w2/LiquidTab.js";
import { VialTab } from "./w2/VialTab.js";

const { div, button, span, p } = van.tags;

// ── Alchemy inner sub-tabs ────────────────────────────────────────────────
const ALCHEMY_SUBTABS = [
    { id: "brewing", label: "BREWING", component: BrewingTab },
    { id: "liquid", label: "LIQUID",  component: LiquidTab  },
    { id: "vials",  label: "VIALS",   component: VialTab    },
    { id: "pay2win", label: "PAY 2 WIN", component: null },
];

// ── W2 top-level sub-tabs ─────────────────────────────────────────────────
const W2_SUBTABS = [
    { id: "alchemy", label: "ALCHEMY" },
    { id: "arcade", label: "ARCADE" },
    { id: "post-office", label: "POST OFFICE" },
    { id: "obols", label: "OBOLS" },
];

const PlaceholderPane = (label) =>
    div(
        { class: "world-sub-placeholder" },
        span({ class: "world-sub-placeholder__icon" }, Icons.Wrench()),
        p({ class: "world-sub-placeholder__label" }, `${label} — COMING SOON`)
    );

// ── Alchemy panel (inner sub-nav) ─────────────────────────────────────────
const AlchemyPanel = () => {
    const active = van.state(ALCHEMY_SUBTABS[0].id);

    return div(
        { class: "alchemy-panel" },

        div(
            { class: "alchemy-sub-nav" },
            ...ALCHEMY_SUBTABS.map((tab) =>
                button(
                    {
                        class: () => `alchemy-sub-btn${active.val === tab.id ? " active" : ""}${!tab.component ? " alchemy-sub-btn--stub" : ""}`,
                        onclick: () => (active.val = tab.id),
                    },
                    tab.label
                )
            )
        ),

        div(
            { class: "alchemy-sub-content" },
            ...ALCHEMY_SUBTABS.map((tab) => {
                const pane = div({
                    class: () => `alchemy-pane${active.val === tab.id ? " alchemy-pane--active" : ""}`,
                    "data-alchemy": tab.id,
                });

                if (!tab.component) {
                    van.add(pane, PlaceholderPane(tab.label));
                } else {
                    let mounted = false;
                    van.derive(() => {
                        if (active.val === tab.id && !mounted) {
                            mounted = true;
                            van.add(pane, tab.component());
                        }
                    });
                }

                return pane;
            })
        )
    );
};

// ── W2Tab ─────────────────────────────────────────────────────────────────

export const W2Tab = () => {
    const activeSubTab = van.state(W2_SUBTABS[0].id);

    return div(
        { class: "world-tab w2-world-tab" },

        div(
            { class: "world-tab-header" },
            span({ class: "world-tab-badge" }, "W2"),
            div(
                { class: "world-tab-title-group" },
                () => {
                    const cur = W2_SUBTABS.find((t) => t.id === activeSubTab.val);
                    return van.tags.h2({ class: "world-tab-title" }, `W2 — ${cur?.label ?? ""}`);
                },
                p({ class: "world-tab-subtitle" }, "Yum-Yum Desert — Alchemy, Arcade, Post Office & Obols")
            )
        ),

        div(
            { class: "world-sub-nav" },
            ...W2_SUBTABS.map((tab) =>
                button(
                    {
                        class: () =>
                            `world-sub-tab-btn${activeSubTab.val === tab.id ? " active" : ""}${tab.id !== "alchemy" ? " world-sub-tab-btn--stub" : ""}`,
                        onclick: () => (activeSubTab.val = tab.id),
                    },
                    tab.label
                )
            )
        ),

        div(
            { class: "world-sub-content" },
            ...W2_SUBTABS.map((tab) => {
                const pane = div({
                    class: () => `world-sub-pane${activeSubTab.val === tab.id ? " active" : ""}`,
                    "data-subtab": tab.id,
                });

                if (tab.id === "alchemy") {
                    let mounted = false;
                    van.derive(() => {
                        if (activeSubTab.val === tab.id && !mounted) {
                            mounted = true;
                            van.add(pane, AlchemyPanel());
                        }
                    });
                } else {
                    van.add(pane, PlaceholderPane(tab.label));
                }

                return pane;
            })
        )
    );
};
