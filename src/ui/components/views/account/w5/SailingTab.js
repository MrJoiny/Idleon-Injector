import van from "../../../../vendor/van-1.6.0.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";
import { ArtifactsTab } from "./sailing/ArtifactsTab.js";
import { BoatsTab } from "./sailing/BoatsTab.js";
import { CurrencyTab } from "./sailing/CurrencyTab.js";
import { IslandsTab } from "./sailing/IslandsTab.js";

const { div } = van.tags;

const SAILING_SUBTABS = [
    { id: "currency", label: "CURRENCY", component: CurrencyTab },
    { id: "artifacts", label: "ARTIFACTS", component: ArtifactsTab },
    { id: "islands", label: "ISLANDS", component: IslandsTab },
    { id: "boats", label: "BOATS", component: BoatsTab },
];

export const SailingTab = () => {
    const activeSubTab = van.state(SAILING_SUBTABS[0].id);

    return div(
        { class: "tab-container sailing-tab" },
        renderTabNav({
            tabs: SAILING_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: SAILING_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-sailing",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
