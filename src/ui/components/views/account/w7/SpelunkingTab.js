import { createNestedTab } from "../tabShared.js";
import { SpelunkingCavesTab } from "./spelunking/SpelunkingCavesTab.js";
import { SpelunkingLoreTab } from "./spelunking/SpelunkingLoreTab.js";
import { SpelunkingShopTab } from "./spelunking/SpelunkingShopTab.js";

const SPELUNKING_SUBTABS = [
    { id: "caves", label: "CAVES", component: SpelunkingCavesTab },
    { id: "shop", label: "SHOP", component: SpelunkingShopTab },
    { id: "lore", label: "LORE", component: SpelunkingLoreTab },
];

export const SpelunkingTab = createNestedTab(SPELUNKING_SUBTABS, "spelunking-tab", "data-spelunking");
