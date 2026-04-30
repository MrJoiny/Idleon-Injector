import van from "../../../../vendor/van-1.6.0.js";
import { GridTab } from "./GridTab.js";
import { ObservationsTab } from "./ObservationsTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";

const { div } = van.tags;

const RESEARCH_SUBTABS = [
    { id: "grid", label: "GRID", component: GridTab },
    { id: "observations", label: "OBSERVATIONS", component: ObservationsTab },
];

export const ResearchTab = () => {
    const activeSubTab = van.state(RESEARCH_SUBTABS[0].id);

    return div(
        { class: "tab-container" },
        renderTabNav({
            tabs: RESEARCH_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: RESEARCH_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-research",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
