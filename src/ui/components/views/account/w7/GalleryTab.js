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
            navClass: "alchemy-sub-nav",
            buttonClass: "alchemy-sub-btn",
            stubClass: "alchemy-sub-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "alchemy-sub-content" },
            ...renderLazyPanes({
                tabs: GALLERY_SUBTABS,
                activeId: activeSubTab,
                paneClass: "alchemy-pane",
                activeClass: "alchemy-pane--active",
                dataAttr: "data-gallery",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
