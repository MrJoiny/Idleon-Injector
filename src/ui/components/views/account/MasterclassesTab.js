/**
 * Masterclasses (branch-specific) - limited to GRIMOIRE + TARGET tab for isolated PR testing
 */

import van from "../../../vendor/van-1.6.0.js";
import { GrimoireTab } from "./masterclasses/GrimoireTab.js";
import { MasterclassUpgradeTab } from "./masterclasses/MasterclassUpgrade.js";
import { renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div } = van.tags;

const MASTERCLASSES_SUBTABS = [
    { id: "grimoire", label: "GRIMOIRE", component: GrimoireTab },
    { id: "masterclass-upgrade", label: "MASTERCLASS UPGRADE", component: MasterclassUpgradeTab },
];

export const MasterclassesTab = () => {
    const activeSubTab = van.state(MASTERCLASSES_SUBTABS[0].id);

    return div(
        { class: "world-tab masterclasses-tab" },
        renderTabNav({
            tabs: MASTERCLASSES_SUBTABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav masterclasses-sub-nav",
            buttonClass: "account-world-sub-tab-btn masterclasses-sub-tab-btn",
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: MASTERCLASSES_SUBTABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => tab.component(),
            })
        )
    );
};
