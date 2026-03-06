/**
 * World 3 Tab — FROSTBITE TUNDRA
 *
 * Sub-tabs:
 *   - CONSTRUCTION   (inner: Buildings ✓, Cogs placeholder)
 *   - REFINERY       ✓
 *   - SALT LICK      ✓
 *   - ATOM COLLIDER  ✓
 *   - MISC           (Library + Worship stubs)
 *   - TRAPPING, DEATHNOTE  (placeholders)
 */

import van from "../../../vendor/van-1.6.0.js";
import { Icons } from "../../../assets/icons.js";
import { ConstructionBuildingsTab } from "./w3/ConstructionBuildingsTab.js";
import { RefineryTab }              from "./w3/RefineryTab.js";
import { SaltLickTab }             from "./w3/SaltLickTab.js";
import { AtomColliderTab }         from "./w3/AtomColliderTab.js";
import { MiscTab }                 from "./w3/MiscTab.js";

const { div, button, span, p } = van.tags;

// ── Shared placeholder ─────────────────────────────────────────────────────

const PlaceholderPane = (label) =>
    div(
        { class: "world-sub-placeholder" },
        span({ class: "world-sub-placeholder__icon" }, Icons.Wrench()),
        p({ class: "world-sub-placeholder__label" }, `${label} — COMING SOON`)
    );

// ── Construction inner panel (Buildings / Cogs) ────────────────────────────

const CONSTRUCTION_SUBTABS = [
    { id: "buildings", label: "BUILDINGS", component: ConstructionBuildingsTab },
    { id: "cogs", label: "COGS", component: null },
];

const ConstructionPanel = () => {
    const active = van.state(CONSTRUCTION_SUBTABS[0].id);

    return div(
        { class: "tab-container" },

        div(
            { class: "alchemy-sub-nav" },
            ...CONSTRUCTION_SUBTABS.map((tab) =>
                button(
                    {
                        class: () =>
                            `alchemy-sub-btn${active.val === tab.id ? " active" : ""}${!tab.component ? " alchemy-sub-btn--stub" : ""
                            }`,
                        onclick: () => (active.val = tab.id),
                    },
                    tab.label
                )
            )
        ),

        div(
            { class: "alchemy-sub-content" },
            ...CONSTRUCTION_SUBTABS.map((tab) => {
                const pane = div({
                    class: () => `alchemy-pane${active.val === tab.id ? " alchemy-pane--active" : ""}`,
                    "data-construction": tab.id,
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

// ── W3 top-level sub-tabs ─────────────────────────────────────────────────

const W3_SUBTABS = [
    { id: "construction",  label: "CONSTRUCTION",  component: ConstructionPanel },
    { id: "refinery",      label: "REFINERY",      component: RefineryTab       },
    { id: "salt-lick",     label: "SALT LICK",     component: SaltLickTab       },
    { id: "atom-collider", label: "ATOM COLLIDER", component: AtomColliderTab   },
    { id: "misc",          label: "MISC",          component: MiscTab           },
    { id: "trapping",      label: "TRAPPING",      component: null              },
    { id: "deathnote",     label: "DEATHNOTE",     component: null              },
];

export const W3Tab = () => {
    const activeSubTab = van.state(W3_SUBTABS[0].id);

    return div(
        { class: "world-tab w3-world-tab" },

        div(
            { class: "world-tab-header" },
            span({ class: "world-tab-badge" }, "W3"),
            div(
                { class: "world-tab-title-group" },
                () => {
                    const cur = W3_SUBTABS.find((t) => t.id === activeSubTab.val);
                    return van.tags.h2({ class: "world-tab-title" }, `W3 — ${cur?.label ?? ""}`);
                },
                p({ class: "world-tab-subtitle" }, "Frostbite Tundra — Construction, Refinery, Salt Lick, Atom Collider & more")
            )
        ),

        div(
            { class: "world-sub-nav" },
            ...W3_SUBTABS.map((tab) =>
                button(
                    {
                        class: () =>
                            `world-sub-tab-btn${activeSubTab.val === tab.id ? " active" : ""}${!tab.component ? " world-sub-tab-btn--stub" : ""
                            }`,
                        onclick: () => (activeSubTab.val = tab.id),
                    },
                    tab.label
                )
            )
        ),

        div(
            { class: "world-sub-content" },
            ...W3_SUBTABS.map((tab) => {
                const pane = div({
                    class: () => `world-sub-pane${activeSubTab.val === tab.id ? " active" : ""}`,
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
