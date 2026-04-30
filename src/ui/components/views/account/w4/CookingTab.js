import van from "../../../../vendor/van-1.6.0.js";
import { renderLazyPanes, renderTabNav } from "../tabShared.js";
import { MealsTab } from "./cooking/MealsTab.js";
import { SpicesTab } from "./cooking/SpicesTab.js";
import { TablesTab } from "./cooking/TablesTab.js";

const { div } = van.tags;

const COOKING_SUBTABS = [
    { id: "tables", label: "TABLES", component: TablesTab },
    { id: "meals", label: "MEALS", component: MealsTab },
    { id: "spices", label: "SPICES", component: SpicesTab },
];

export const CookingTab = () => {
    const activeSubTab = van.state(COOKING_SUBTABS[0].id);

    return div(
        { class: "tab-container cooking-tab" },
        renderTabNav({
            tabs: COOKING_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: COOKING_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-cooking",
                renderContent: (tab) => tab.component(),
            })
        )
    );
};
