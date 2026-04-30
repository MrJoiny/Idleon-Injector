import van from "../../../../vendor/van-1.6.0.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";
import { SpelunkingCavesTab } from "./spelunking/SpelunkingCavesTab.js";
import { SpelunkingLoreTab } from "./spelunking/SpelunkingLoreTab.js";
import { SpelunkingShopTab } from "./spelunking/SpelunkingShopTab.js";

const { div } = van.tags;

const SPELUNKING_SUBTABS = [
    { id: "caves", label: "CAVES", component: SpelunkingCavesTab },
    { id: "shop", label: "SHOP", component: SpelunkingShopTab },
    { id: "lore", label: "LORE", component: SpelunkingLoreTab },
];

export const SpelunkingTab = () => {
    const activeSubTab = van.state(SPELUNKING_SUBTABS[0].id);

    return div(
        { class: "tab-container spelunking-tab" },
        renderTabNav({
            tabs: SPELUNKING_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: SPELUNKING_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-spelunking",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
