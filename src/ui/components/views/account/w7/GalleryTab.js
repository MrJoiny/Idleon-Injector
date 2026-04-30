import van from "../../../../vendor/van-1.6.0.js";
import { NametagTab } from "./NametagTab.js";
import { TrophyTab } from "./TrophyTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";

const { div } = van.tags;

const GALLERY_SUBTABS = [
    { id: "trophy", label: "TROPHY", component: TrophyTab },
    { id: "nametag", label: "NAMETAG", component: NametagTab },
];

export const GalleryTab = () => {
    const activeSubTab = van.state(GALLERY_SUBTABS[0].id);

    return div(
        { class: "tab-container" },
        renderTabNav({
            tabs: GALLERY_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: GALLERY_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-gallery",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
