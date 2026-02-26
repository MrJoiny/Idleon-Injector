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
import { StampsTab } from "./w1/StampsTab.js";
import { AnvilTab } from "./w1/AnvilTab.js";
import { ForgeTab } from "./w1/ForgeTab.js";

const { div, button, span, p } = van.tags;

// ─── sub-tab registry ─────────────────────────────────────────────────────────

const W1_SUBTABS = [
    { id: "stamps",  label: "STAMPS",  component: StampsTab },
    { id: "anvil",   label: "ANVIL",   component: AnvilTab },
    { id: "forge",   label: "FORGE",   component: ForgeTab },
    { id: "smith",   label: "SMITHING", component: null },
];

const subTabCache = new Map();
const getSubTab = (tab) => {
    if (!tab.component) return null;
    if (!subTabCache.has(tab.id)) {
        subTabCache.set(tab.id, tab.component());
    }
    return subTabCache.get(tab.id);
};

// ─── placeholder pane ─────────────────────────────────────────────────────────

const PlaceholderPane = (label) =>
    div(
        { class: "world-sub-placeholder" },
        span({ class: "world-sub-placeholder__icon" }, "⚒"),
        p({ class: "world-sub-placeholder__label" }, `${label} — COMING SOON`)
    );

// ─── W1Tab ────────────────────────────────────────────────────────────────────

export const W1Tab = () => {
    const activeSubTab = van.state(W1_SUBTABS[0].id);

    return div(
        { class: "world-tab w1-world-tab" },

        // World header
        div(
            { class: "world-tab-header w1-header" },
            span({ class: "world-tab-badge" }, "W1"),
            div(
                { class: "world-tab-title-group" },
                () => {
                    const cur = W1_SUBTABS.find((t) => t.id === activeSubTab.val);
                    return van.tags.h2({ class: "world-tab-title" }, `W1 — ${cur?.label ?? "BLUNDER HILLS"}`);
                },
                p({ class: "world-tab-subtitle" }, "Blunder Hills — Mining, Smithing, Stamps")
            )
        ),

        // Sub-tab navigation
        div(
            { class: "world-sub-nav" },
            ...W1_SUBTABS.map((tab) =>
                button(
                    {
                        class: () =>
                            `world-sub-tab-btn ${activeSubTab.val === tab.id ? "active" : ""} ${
                                !tab.component ? "world-sub-tab-btn--stub" : ""
                            }`,
                        onclick: () => (activeSubTab.val = tab.id),
                    },
                    tab.label
                )
            )
        ),

        // Sub-tab content
        div(
            { class: "world-sub-content" },
            ...W1_SUBTABS.map((tab) =>
                div(
                    {
                        class: () =>
                            `world-sub-pane ${activeSubTab.val === tab.id ? "active" : ""}`,
                        "data-subtab": tab.id,
                    },
                    tab.component ? getSubTab(tab) : PlaceholderPane(tab.label)
                )
            )
        )
    );
};
