import van from "../../../../vendor/van-1.6.0.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";
import { CoralKidTab } from "./divinity/CoralKidTab.js";
import { GodTab } from "./divinity/GodTab.js";

const { div } = van.tags;

const DIVINITY_SUBTABS = [
    { id: "god", label: "GOD", component: GodTab },
    { id: "coral-kid", label: "CORAL KID", component: CoralKidTab },
];

export const DivinityTab = () => {
    const activeSubTab = van.state(DIVINITY_SUBTABS[0].id);

    return div(
        { class: "tab-container divinity-tab" },
        renderTabNav({
            tabs: DIVINITY_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: DIVINITY_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-divinity",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
