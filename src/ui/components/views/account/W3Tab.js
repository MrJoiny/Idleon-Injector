/**
 * World 3 Tab - Frostbite Tundra
 */

import van from "../../../vendor/van-1.6.0.js";
import { ConstructionBuildingsTab } from "./w3/ConstructionBuildingsTab.js";
import { CogsTab } from "./w3/CogsTab.js";
import { RefineryTab } from "./w3/RefineryTab.js";
import { SaltLickTab } from "./w3/SaltLickTab.js";
import { AtomColliderTab } from "./w3/AtomColliderTab.js";
import { HatRackTab } from "./w3/HatRackTab.js";
import { SmithyTab } from "./w3/SmithyTab.js";
import { WorshipTab } from "./w3/WorshipTab.js";
import { DeathNoteTab } from "./w3/DeathNoteTab.js";
import { LibraryTab } from "./w3/LibraryTab.js";
import { EquinoxTab } from "./w3/EquinoxTab.js";
import { TrappingTab } from "./w3/TrappingTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div } = van.tags;

const CONSTRUCTION_SUBTABS = [
    { id: "buildings", label: "BUILDINGS", component: ConstructionBuildingsTab },
    { id: "cogs", label: "COGS", component: CogsTab },
];

const W3_SUBTABS = [
    { id: "construction", label: "CONSTRUCTION", component: ConstructionPanel },
    { id: "refinery", label: "REFINERY", component: RefineryTab },
    { id: "salt-lick", label: "SALT LICK", component: SaltLickTab },
    { id: "atom-collider", label: "ATOM COLLIDER", component: AtomColliderTab },
    { id: "hat-rack", label: "HAT RACK", component: HatRackTab },
    { id: "smithy", label: "SMITHY", component: SmithyTab },
    { id: "worship", label: "WORSHIP", component: WorshipTab },
    { id: "death-note", label: "DEATH NOTE", component: DeathNoteTab },
    { id: "library", label: "LIBRARY", component: LibraryTab },
    { id: "equinox", label: "EQUINOX", component: EquinoxTab },
    { id: "trapping", label: "TRAPPING", component: TrappingTab },
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
