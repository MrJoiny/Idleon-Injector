import { createNestedTab } from "../tabShared.js";
import { EssenceTab } from "./summoning/EssenceTab.js";
import { RoundsTab } from "./summoning/RoundsTab.js";
import { UpgradesTab } from "./summoning/UpgradesTab.js";

const SUMMONING_SUBTABS = [
    { id: "upgrades", label: "UPGRADES", component: UpgradesTab },
    { id: "essence", label: "ESSENCE", component: EssenceTab },
    { id: "rounds", label: "ROUNDS", component: RoundsTab },
];

export const SummoningTab = createNestedTab(SUMMONING_SUBTABS, "summoning-tab", "data-summoning");
