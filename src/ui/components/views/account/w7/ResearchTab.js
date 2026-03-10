import van from "../../../../vendor/van-1.6.0.js";
import { ObservationsTab } from "./ObservationsTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";

const { div } = van.tags;

const RESEARCH_SUBTABS = [
    { id: "grid", label: "GRID", component: null },
    { id: "observations", label: "OBSERVATIONS", component: ObservationsTab },
];

export const ResearchTab = () => {
    const activeSubTab = van.state(RESEARCH_SUBTABS[0].id);

    return div(
        { class: "tab-container" },
        renderTabNav({
            tabs: RESEARCH_SUBTABS,
            activeId: activeSubTab,
            navClass: "alchemy-sub-nav",
            buttonClass: "alchemy-sub-btn",
            stubClass: "alchemy-sub-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "alchemy-sub-content" },
            ...renderLazyPanes({
                tabs: RESEARCH_SUBTABS,
                activeId: activeSubTab,
                paneClass: "alchemy-pane",
                activeClass: "alchemy-pane--active",
                dataAttr: "data-research",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
