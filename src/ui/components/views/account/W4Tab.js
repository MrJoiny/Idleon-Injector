import { BreedingTab } from "./w4/BreedingTab.js";
import { CookingTab } from "./w4/CookingTab.js";
import { LabTab } from "./w4/LabTab.js";
import { RiftTab } from "./w4/RiftTab.js";
import { TomeTab } from "./w4/TomeTab.js";
import { createWorldTab } from "./tabShared.js";

const W4_SUBTABS = [
    { id: "cooking", label: "COOKING", component: CookingTab },
    { id: "breeding", label: "BREEDING", component: BreedingTab },
    { id: "lab", label: "LAB", component: LabTab },
    { id: "rift", label: "RIFT", component: RiftTab },
    { id: "tome", label: "TOME", component: TomeTab },
];

export const W4Tab = createWorldTab(W4_SUBTABS, "w4-world-tab");
