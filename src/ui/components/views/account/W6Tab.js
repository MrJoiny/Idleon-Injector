import van from "../../../vendor/van-1.6.0.js";
import { BeanstackTab } from "./w6/BeanstackTab.js";
import { FarmingTab } from "./w6/FarmingTab.js";
import { SneakingTab } from "./w6/SneakingTab.js";
import { SummoningTab } from "./w6/SummoningTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div } = van.tags;

const W6_SUBTABS = [
    { id: "farming", label: "FARMING", component: FarmingTab },
    { id: "sneaking", label: "SNEAKING", component: SneakingTab },
    { id: "summoning", label: "SUMMONING", component: SummoningTab },
    { id: "beanstack", label: "BEANSTACK", component: BeanstackTab },
];

export const W6Tab = () => {
    const activeSubTab = van.state(W6_SUBTABS[0].id);

    return div(
        { class: "world-tab w6-world-tab" },
        renderTabNav({
            tabs: W6_SUBTABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav",
            buttonClass: "account-world-sub-tab-btn",
            stubClass: "account-world-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: W6_SUBTABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
