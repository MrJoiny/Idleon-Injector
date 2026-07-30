import { createNestedTab } from "../tabShared.js";
import { CharmsTab } from "./sneaking/CharmsTab.js";
import { JadeTab } from "./sneaking/JadeTab.js";
import { UpgradesTab } from "./sneaking/UpgradesTab.js";

const SNEAKING_SUBTABS = [
    { id: "upgrades", label: "UPGRADES", component: UpgradesTab },
    { id: "jade", label: "JADE", component: JadeTab },
    { id: "charms", label: "CHARMS", component: CharmsTab },
];

export const SneakingTab = createNestedTab(SNEAKING_SUBTABS, "sneaking-tab", "data-sneaking");
