/**
 * World 1 Tab - Blunder Hills
 */

import { StampsTab } from "./w1/StampsTab.js";
import { AnvilTab } from "./w1/AnvilTab.js";
import { ForgeTab } from "./w1/ForgeTab.js";
import { StatuesTab } from "./w1/StatuesTab.js";
import { OrionTab } from "./w1/OrionTab.js";
import { StarSignsTab } from "./w1/StarSignsTab.js";
import { CompanionsTab } from "./w1/CompanionsTab.js";
import { createWorldTab } from "./tabShared.js";

const W1_SUBTABS = [
    { id: "stamps", label: "STAMPS", component: StampsTab },
    { id: "anvil", label: "ANVIL", component: AnvilTab },
    { id: "forge", label: "FORGE", component: ForgeTab },
    { id: "statues", label: "STATUES", component: StatuesTab },
    { id: "starsigns", label: "STAR SIGNS", component: StarSignsTab },
    { id: "orion", label: "ORION", component: OrionTab },
    { id: "companions", label: "PETS", component: CompanionsTab },
];

export const W1Tab = createWorldTab(W1_SUBTABS, "w1-world-tab");
