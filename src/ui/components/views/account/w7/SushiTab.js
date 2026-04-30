import van from "../../../../vendor/van-1.6.0.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";
import { SushiGeneralTab } from "./sushi/SushiGeneralTab.js";
import { SushiShopTab } from "./sushi/SushiShopTab.js";
import { SushiStationTab } from "./sushi/SushiStationTab.js";

const { div } = van.tags;

const SUSHI_SUBTABS = [
    { id: "general", label: "GENERAL", component: SushiGeneralTab },
    { id: "station", label: "STATION", component: SushiStationTab },
    { id: "shop", label: "SHOP", component: SushiShopTab },
];

export const SushiTab = () => {
    const activeSubTab = van.state(SUSHI_SUBTABS[0].id);

    return div(
        { class: "tab-container sushi-tab" },
        renderTabNav({
            tabs: SUSHI_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: SUSHI_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-sushi",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
