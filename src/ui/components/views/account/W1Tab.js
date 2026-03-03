/**
 * World 1 Tab — Blunder Hills
 *
 * Sub-tabs:
 *   - STAMPS  (fully implemented)
 *   - ANVIL   (placeholder)
 *   - FORGE   (placeholder)
 *   - more to come…
 *
 * To add a new W1 sub-tab:
 *   1. Create its component in ./w1/
 *   2. Push an entry to W1_SUBTABS below.
 */

import van from "../../../vendor/van-1.6.0.js";
import { Icons } from "../../../assets/icons.js";
import { StampsTab } from "./w1/StampsTab.js";
import { AnvilTab } from "./w1/AnvilTab.js";
import { ForgeTab } from "./w1/ForgeTab.js";
import { StatuesTab } from "./w1/StatuesTab.js";
import { OrionTab } from "./w1/OrionTab.js";
import { StarSignsTab } from "./w1/StarSignsTab.js";

const { div, button, span, p } = van.tags;

// ─── sub-tab registry ─────────────────────────────────────────────────────────

const W1_SUBTABS = [
    { id: "stamps", label: "STAMPS", component: StampsTab },
    { id: "anvil", label: "ANVIL", component: AnvilTab },
    { id: "forge", label: "FORGE", component: ForgeTab },
    { id: "statues", label: "STATUES", component: StatuesTab },
    { id: "starsigns", label: "STAR SIGNS", component: StarSignsTab },
    { id: "orion", label: "ORION", component: OrionTab },
];

// ─── placeholder pane ─────────────────────────────────────────────────────────

const PlaceholderPane = (label) =>
    div(
        { class: "world-sub-placeholder" },
        span({ class: "world-sub-placeholder__icon" }, Icons.Wrench()),
        p({ class: "world-sub-placeholder__label" }, `${label} — COMING SOON`)
    );

// ─── W1Tab ────────────────────────────────────────────────────────────────────

export const W1Tab = () => {
    const activeSubTab = van.state(W1_SUBTABS[0].id);

    return div(
        { class: "world-tab w1-world-tab" },

        // World header
        div(
            { class: "world-tab-header" },
            span({ class: "world-tab-badge" }, "W1"),
            div(
                { class: "world-tab-title-group" },
                () => {
                    const cur = W1_SUBTABS.find((t) => t.id === activeSubTab.val);
                    return van.tags.h2({ class: "world-tab-title" }, `W1 — ${cur?.label ?? ""}`);
                },
                p({ class: "world-tab-subtitle" }, "Blunder Hills — Stamps, Statues, and other oddities")
            )
        ),

        // Sub-tab navigation
        div(
            { class: "world-sub-nav" },
            ...W1_SUBTABS.map((tab) =>
                button(
                    {
                        class: () =>
                            `world-sub-tab-btn ${activeSubTab.val === tab.id ? "active" : ""} ${!tab.component ? "world-sub-tab-btn--stub" : ""
                            }`,
                        onclick: () => (activeSubTab.val = tab.id),
                    },
                    tab.label
                )
            )
        ),

        // Sub-tab content — lazy mount
        div(
            { class: "world-sub-content" },
            ...W1_SUBTABS.map((tab) => {
                const pane = div({
                    class: () =>
                        `world-sub-pane ${activeSubTab.val === tab.id ? "active" : ""}`,
                    "data-subtab": tab.id,
                });

                if (!tab.component) {
                    van.add(pane, PlaceholderPane(tab.label));
                } else {
                    let mounted = false;
                    van.derive(() => {
                        if (activeSubTab.val === tab.id && !mounted) {
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
