/**
 * World 2 Tab - Yum-Yum Desert
 */

import { BrewingTab } from "./w2/BrewingTab.js";
import { LiquidTab } from "./w2/LiquidTab.js";
import { VialTab } from "./w2/VialTab.js";
import { Pay2WinTab } from "./w2/Pay2WinTab.js";
import { SigilTab } from "./w2/SigilTab.js";
import { ArcadeTab } from "./w2/ArcadeTab.js";
import { PostOfficeTab } from "./w2/PostOfficeTab.js";
import { KillroyTab } from "./w2/KillroyTab.js";
import { IslandsTab } from "./w2/IslandsTab.js";
import { PoppyTab } from "./w2/PoppyTab.js";
import { createNestedTab, createWorldTab } from "./tabShared.js";

const ALCHEMY_SUBTABS = [
    { id: "brewing", label: "BREWING", component: BrewingTab },
    { id: "liquid", label: "LIQUID", component: LiquidTab },
    { id: "vials", label: "VIALS", component: VialTab },
    { id: "pay2win", label: "PAY 2 WIN", component: Pay2WinTab },
    { id: "sigils", label: "SIGILS", component: SigilTab },
];

const AlchemyPanel = createNestedTab(ALCHEMY_SUBTABS, "", "data-alchemy");

const W2_SUBTABS = [
    { id: "alchemy", label: "ALCHEMY", component: AlchemyPanel },
    { id: "arcade", label: "ARCADE", component: ArcadeTab },
    { id: "post-office", label: "POST OFFICE", component: PostOfficeTab },
    { id: "killroy", label: "KILLROY", component: KillroyTab },
    { id: "islands", label: "ISLANDS", component: IslandsTab },
    { id: "poppy", label: "POPPY", component: PoppyTab },
];

export const W2Tab = createWorldTab(W2_SUBTABS, "w2-world-tab");
