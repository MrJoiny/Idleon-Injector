import van from "../../../../vendor/van-1.6.0.js";
import { renderLazyPanes, renderTabNav } from "../tabShared.js";
import { GeneralTab } from "./breeding/GeneralTab.js";
import { PetsTab } from "./breeding/PetsTab.js";
import { TerritoryTab } from "./breeding/TerritoryTab.js";

const { div } = van.tags;

const BREEDING_SUBTABS = [
    { id: "general", label: "GENERAL", component: GeneralTab },
    { id: "pets", label: "PETS", component: PetsTab },
    { id: "territory", label: "TERRITORY", component: TerritoryTab },
];

export const BreedingTab = () => {
    const activeSubTab = van.state(BREEDING_SUBTABS[0].id);

    return div(
        { class: "tab-container breeding-tab" },
        renderTabNav({
            tabs: BREEDING_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: BREEDING_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-breeding",
                renderContent: (tab) => tab.component(),
            })
        )
    );
};
