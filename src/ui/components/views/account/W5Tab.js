import van from "../../../vendor/van-1.6.0.js";
import { DivinityTab } from "./w5/DivinityTab.js";
import { GamingTab } from "./w5/GamingTab.js";
import { HoleTab } from "./w5/HoleTab.js";
import { SailingTab } from "./w5/SailingTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div } = van.tags;

const W5_SUBTABS = [
    { id: "sailing", label: "SAILING", component: SailingTab },
    { id: "divinity", label: "DIVINITY", component: DivinityTab },
    { id: "gaming", label: "GAMING", component: GamingTab },
    { id: "hole", label: "HOLE", component: HoleTab },
];

export const W5Tab = () => {
    const activeSubTab = van.state(W5_SUBTABS[0].id);

    return div(
        { class: "world-tab w5-world-tab" },
        renderTabNav({
            tabs: W5_SUBTABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav",
            buttonClass: "account-world-sub-tab-btn",
            stubClass: "account-world-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: W5_SUBTABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
