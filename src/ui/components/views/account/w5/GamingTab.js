import van from "../../../../vendor/van-1.6.0.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";
import { GeneralTab } from "./gaming/GeneralTab.js";
import { ImportsTab } from "./gaming/ImportsTab.js";
import { PaletteHexTab } from "./gaming/PaletteHexTab.js";
import { PaletteTab } from "./gaming/PaletteTab.js";
import { SuperbitsTab } from "./gaming/SuperbitsTab.js";

const { div } = van.tags;

const GAMING_SUBTABS = [
    { id: "general", label: "GENERAL", component: GeneralTab },
    { id: "imports", label: "IMPORTS", component: ImportsTab },
    { id: "superbits", label: "SUPERBITS", component: SuperbitsTab },
    { id: "palette", label: "PALETTE", component: PaletteTab },
    { id: "palette-hex", label: "PALETTE HEX", component: PaletteHexTab },
];

export const GamingTab = () => {
    const activeSubTab = van.state(GAMING_SUBTABS[0].id);

    return div(
        { class: "tab-container gaming-tab" },
        renderTabNav({
            tabs: GAMING_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: GAMING_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-gaming",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
