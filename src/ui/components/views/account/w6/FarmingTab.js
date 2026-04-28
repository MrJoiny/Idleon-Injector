import van from "../../../../vendor/van-1.6.0.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";
import { DepoTab } from "./farming/DepoTab.js";
import { ExoticTab } from "./farming/ExoticTab.js";
import { MarketsTab } from "./farming/MarketsTab.js";
import { PlotTab } from "./farming/PlotTab.js";
import { RankTab } from "./farming/RankTab.js";
import { StickerTab } from "./farming/StickerTab.js";

const { div } = van.tags;

const FARMING_SUBTABS = [
    { id: "depo", label: "DEPO", component: DepoTab },
    { id: "markets", label: "MARKETS", component: MarketsTab },
    { id: "exotic", label: "EXOTIC", component: ExoticTab },
    { id: "sticker", label: "STICKER", component: StickerTab },
    { id: "plot", label: "PLOT", component: PlotTab },
    { id: "rank", label: "RANK", component: RankTab },
];

export const FarmingTab = () => {
    const activeSubTab = van.state(FARMING_SUBTABS[0].id);

    return div(
        { class: "tab-container farming-tab" },
        renderTabNav({
            tabs: FARMING_SUBTABS,
            activeId: activeSubTab,
            navClass: "alchemy-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "alchemy-sub-content" },
            ...renderLazyPanes({
                tabs: FARMING_SUBTABS,
                activeId: activeSubTab,
                paneClass: "alchemy-pane",
                activeClass: "alchemy-pane--active",
                dataAttr: "data-farming",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
