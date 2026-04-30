import van from "../../../../vendor/van-1.6.0.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";
import { CharmsTab } from "./sneaking/CharmsTab.js";
import { JadeTab } from "./sneaking/JadeTab.js";
import { UpgradesTab } from "./sneaking/UpgradesTab.js";

const { div } = van.tags;

const SNEAKING_SUBTABS = [
    { id: "upgrades", label: "UPGRADES", component: UpgradesTab },
    { id: "jade", label: "JADE", component: JadeTab },
    { id: "charms", label: "CHARMS", component: CharmsTab },
];

export const SneakingTab = () => {
    const activeSubTab = van.state(SNEAKING_SUBTABS[0].id);

    return div(
        { class: "tab-container sneaking-tab" },
        renderTabNav({
            tabs: SNEAKING_SUBTABS,
            activeId: activeSubTab,
            navClass: "alchemy-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "alchemy-sub-content" },
            ...renderLazyPanes({
                tabs: SNEAKING_SUBTABS,
                activeId: activeSubTab,
                paneClass: "alchemy-pane",
                activeClass: "alchemy-pane--active",
                dataAttr: "data-sneaking",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
