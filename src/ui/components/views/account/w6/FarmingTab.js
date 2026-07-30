import { createNestedTab } from "../tabShared.js";
import { DepoTab } from "./farming/DepoTab.js";
import { ExoticTab } from "./farming/ExoticTab.js";
import { MarketsTab } from "./farming/MarketsTab.js";
import { PlotTab } from "./farming/PlotTab.js";
import { RankTab } from "./farming/RankTab.js";
import { StickerTab } from "./farming/StickerTab.js";

const FARMING_SUBTABS = [
    { id: "depo", label: "DEPO", component: DepoTab },
    { id: "markets", label: "MARKETS", component: MarketsTab },
    { id: "exotic", label: "EXOTIC", component: ExoticTab },
    { id: "sticker", label: "STICKER", component: StickerTab },
    { id: "plot", label: "PLOT", component: PlotTab },
    { id: "rank", label: "RANK", component: RankTab },
];

export const FarmingTab = createNestedTab(FARMING_SUBTABS, "farming-tab", "data-farming");
