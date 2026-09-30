import { createNestedTab } from "../tabShared.js";
import { SushiGeneralTab } from "./sushi/SushiGeneralTab.js";
import { SushiShopTab } from "./sushi/SushiShopTab.js";
import { SushiStationTab } from "./sushi/SushiStationTab.js";

const SUSHI_SUBTABS = [
    { id: "general", label: "GENERAL", component: SushiGeneralTab },
    { id: "station", label: "STATION", component: SushiStationTab },
    { id: "shop", label: "SHOP", component: SushiShopTab },
];

export const SushiTab = createNestedTab(SUSHI_SUBTABS, "sushi-tab", "data-sushi");
