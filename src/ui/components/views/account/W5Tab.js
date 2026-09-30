import { DivinityTab } from "./w5/DivinityTab.js";
import { GamingTab } from "./w5/GamingTab.js";
import { HoleTab } from "./w5/HoleTab.js";
import { SailingTab } from "./w5/SailingTab.js";
import { createWorldTab } from "./tabShared.js";

const W5_SUBTABS = [
    { id: "sailing", label: "SAILING", component: SailingTab },
    { id: "divinity", label: "DIVINITY", component: DivinityTab },
    { id: "gaming", label: "GAMING", component: GamingTab },
    { id: "hole", label: "HOLE", component: HoleTab },
];

export const W5Tab = createWorldTab(W5_SUBTABS, "w5-world-tab");
