import van from "../../../vendor/van-1.6.0.js";
import { BreedingTab } from "./w4/BreedingTab.js";
import { CookingTab } from "./w4/CookingTab.js";
import { LabTab } from "./w4/LabTab.js";
import { RiftTab } from "./w4/RiftTab.js";
import { TomeTab } from "./w4/TomeTab.js";
import { renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div } = van.tags;

const W4_SUBTABS = [
    { id: "cooking", label: "COOKING", component: CookingTab },
    { id: "breeding", label: "BREEDING", component: BreedingTab },
    { id: "lab", label: "LAB", component: LabTab },
    { id: "rift", label: "RIFT", component: RiftTab },
    { id: "tome", label: "TOME", component: TomeTab },
];

export const W4Tab = () => {
    const activeSubTab = van.state(W4_SUBTABS[0].id);

    return div(
        { class: "world-tab w4-world-tab" },
        renderTabNav({
            tabs: W4_SUBTABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav",
            buttonClass: "account-world-sub-tab-btn",
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: W4_SUBTABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => tab.component(),
            })
        )
    );
};
