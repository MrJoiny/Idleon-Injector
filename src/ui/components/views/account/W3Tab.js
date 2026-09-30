/**
 * World 3 Tab - Frostbite Tundra
 */

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
import { createNestedTab, createWorldTab } from "./tabShared.js";

const CONSTRUCTION_SUBTABS = [
    { id: "buildings", label: "BUILDINGS", component: ConstructionBuildingsTab },
    { id: "cogs", label: "COGS", component: CogsTab },
];

const ConstructionPanel = createNestedTab(CONSTRUCTION_SUBTABS, "", "data-construction");

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

export const W3Tab = createWorldTab(W3_SUBTABS, "w3-world-tab");
