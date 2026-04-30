import van from "../../../../vendor/van-1.6.0.js";
import { renderLazyPanes, renderTabNav } from "../tabShared.js";
import { ChipsTab } from "./lab/ChipsTab.js";
import { JewelsTab } from "./lab/JewelsTab.js";

const { div } = van.tags;

const LAB_SUBTABS = [
    { id: "chips", label: "CHIPS", component: ChipsTab },
    { id: "jewels", label: "JEWELS", component: JewelsTab },
];

export const LabTab = () => {
    const activeSubTab = van.state(LAB_SUBTABS[0].id);

    return div(
        { class: "tab-container lab-tab" },
        renderTabNav({
            tabs: LAB_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: LAB_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-lab",
                renderContent: (tab) => tab.component(),
            })
        )
    );
};
