/**
 * World 1 Tab - Blunder Hills
 */

import van from "../../../vendor/van-1.6.0.js";
import { StampsTab } from "./w1/StampsTab.js";
import { AnvilTab } from "./w1/AnvilTab.js";
import { ForgeTab } from "./w1/ForgeTab.js";
import { StatuesTab } from "./w1/StatuesTab.js";
import { OrionTab } from "./w1/OrionTab.js";
import { StarSignsTab } from "./w1/StarSignsTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav, renderWorldHeader } from "./tabShared.js";

const { div } = van.tags;

const W1_SUBTABS = [
    { id: "stamps", label: "STAMPS", component: StampsTab },
    { id: "anvil", label: "ANVIL", component: AnvilTab },
    { id: "forge", label: "FORGE", component: ForgeTab },
    { id: "statues", label: "STATUES", component: StatuesTab },
    { id: "starsigns", label: "STAR SIGNS", component: StarSignsTab },
    { id: "orion", label: "ORION", component: OrionTab },
];

export const W1Tab = () => {
    const activeSubTab = van.state(W1_SUBTABS[0].id);

    return div(
        { class: "world-tab w1-world-tab" },
        renderWorldHeader({
            badge: "W1",
            title: () => {
                const cur = W1_SUBTABS.find((tab) => tab.id === activeSubTab.val);
                return `W1 — ${cur?.label ?? ""}`;
            },
            subtitle: "Blunder Hills — Stamps, Statues, and other oddities",
        }),
        renderTabNav({
            tabs: W1_SUBTABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav",
            buttonClass: "world-sub-tab-btn",
            stubClass: "world-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: W1_SUBTABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};


