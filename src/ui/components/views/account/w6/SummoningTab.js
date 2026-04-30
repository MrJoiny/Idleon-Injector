import van from "../../../../vendor/van-1.6.0.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";
import { EssenceTab } from "./summoning/EssenceTab.js";
import { RoundsTab } from "./summoning/RoundsTab.js";
import { UpgradesTab } from "./summoning/UpgradesTab.js";

const { div } = van.tags;

const SUMMONING_SUBTABS = [
    { id: "upgrades", label: "UPGRADES", component: UpgradesTab },
    { id: "essence", label: "ESSENCE", component: EssenceTab },
    { id: "rounds", label: "ROUNDS", component: RoundsTab },
];

export const SummoningTab = () => {
    const activeSubTab = van.state(SUMMONING_SUBTABS[0].id);

    return div(
        { class: "tab-container summoning-tab" },
        renderTabNav({
            tabs: SUMMONING_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: SUMMONING_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-summoning",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
