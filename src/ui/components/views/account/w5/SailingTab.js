import { createNestedTab } from "../tabShared.js";
import { ArtifactsTab } from "./sailing/ArtifactsTab.js";
import { BoatsTab } from "./sailing/BoatsTab.js";
import { CurrencyTab } from "./sailing/CurrencyTab.js";
import { IslandsTab } from "./sailing/IslandsTab.js";

const SAILING_SUBTABS = [
    { id: "currency", label: "CURRENCY", component: CurrencyTab },
    { id: "artifacts", label: "ARTIFACTS", component: ArtifactsTab },
    { id: "islands", label: "ISLANDS", component: IslandsTab },
    { id: "boats", label: "BOATS", component: BoatsTab },
];

export const SailingTab = createNestedTab(SAILING_SUBTABS, "sailing-tab", "data-sailing");
