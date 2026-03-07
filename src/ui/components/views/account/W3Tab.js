/**
 * World 3 Tab - Frostbite Tundra
 */

import van from "../../../vendor/van-1.6.0.js";
import { ConstructionBuildingsTab } from "./w3/ConstructionBuildingsTab.js";
import { RefineryTab } from "./w3/RefineryTab.js";
import { SaltLickTab } from "./w3/SaltLickTab.js";
import { AtomColliderTab } from "./w3/AtomColliderTab.js";
import { MiscTab } from "./w3/MiscTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav, renderWorldHeader } from "./tabShared.js";

const { div } = van.tags;

const CONSTRUCTION_SUBTABS = [
    { id: "buildings", label: "BUILDINGS", component: ConstructionBuildingsTab },
    { id: "cogs", label: "COGS", component: null },
];

const W3_SUBTABS = [
    { id: "construction", label: "CONSTRUCTION", component: ConstructionPanel },
    { id: "refinery", label: "REFINERY", component: RefineryTab },
    { id: "salt-lick", label: "SALT LICK", component: SaltLickTab },
    { id: "atom-collider", label: "ATOM COLLIDER", component: AtomColliderTab },
    { id: "misc", label: "MISC", component: MiscTab },
    { id: "trapping", label: "TRAPPING", component: null },
    { id: "deathnote", label: "DEATHNOTE", component: null },
];

function ConstructionPanel() {
    const active = van.state(CONSTRUCTION_SUBTABS[0].id);

    return div(
        { class: "tab-container" },
        renderTabNav({
            tabs: CONSTRUCTION_SUBTABS,
            activeId: active,
            navClass: "alchemy-sub-nav",
            buttonClass: "alchemy-sub-btn",
            stubClass: "alchemy-sub-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "alchemy-sub-content" },
            ...renderLazyPanes({
                tabs: CONSTRUCTION_SUBTABS,
                activeId: active,
                paneClass: "alchemy-pane",
                activeClass: "alchemy-pane--active",
                dataAttr: "data-construction",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
}

export const W3Tab = () => {
    const activeSubTab = van.state(W3_SUBTABS[0].id);

    return div(
        { class: "world-tab w3-world-tab" },
        renderWorldHeader({
            badge: "W3",
            title: () => {
                const cur = W3_SUBTABS.find((tab) => tab.id === activeSubTab.val);
                return `W3 — ${cur?.label ?? ""}`;
            },
            subtitle: "Frostbite Tundra — Construction, Refinery, Salt Lick, Atom Collider & more",
        }),
        renderTabNav({
            tabs: W3_SUBTABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav",
            buttonClass: "world-sub-tab-btn",
            stubClass: "world-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: W3_SUBTABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
