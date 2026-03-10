import van from "../../../vendor/van-1.6.0.js";
import { GalleryTab } from "./w7/GalleryTab.js";
import { ResearchTab } from "./w7/ResearchTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav, renderWorldHeader } from "./tabShared.js";

const { div } = van.tags;

const W7_SUBTABS = [
    { id: "spelunk", label: "SPELUNK", component: null },
    { id: "research", label: "RESEARCH", component: ResearchTab },
    { id: "gallery", label: "GALLERY", component: GalleryTab },
    { id: "legend-talent", label: "LEGEND TALENT", component: null },
    { id: "coral", label: "CORAL", component: null },
    { id: "zenith", label: "ZENITH", component: null },
    { id: "clam", label: "CLAM", component: null },
    { id: "big-fish", label: "BIG FISH", component: null },
    { id: "minehead", label: "MINEHEAD", component: null },
    { id: "glimbo", label: "GLIMBO", component: null },
];

export const W7Tab = () => {
    const activeSubTab = van.state(W7_SUBTABS[0].id);

    return div(
        { class: "world-tab w7-world-tab" },
        renderWorldHeader({
            badge: "W7",
            title: () => {
                const cur = W7_SUBTABS.find((tab) => tab.id === activeSubTab.val);
                return `W7 - ${cur?.label ?? ""}`;
            },
            subtitle: "Equinox Valley - Spelunk, Research, Gallery, Coral, Zenith, Clam, Minehead & more",
        }),
        renderTabNav({
            tabs: W7_SUBTABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav",
            buttonClass: "world-sub-tab-btn",
            stubClass: "world-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: W7_SUBTABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
