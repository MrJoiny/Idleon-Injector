/**
 * World 2 Tab - Yum-Yum Desert
 */

import van from "../../../vendor/van-1.6.0.js";
import { BrewingTab } from "./w2/BrewingTab.js";
import { LiquidTab } from "./w2/LiquidTab.js";
import { VialTab } from "./w2/VialTab.js";
import { Pay2WinTab } from "./w2/Pay2WinTab.js";
import { SigilTab } from "./w2/SigilTab.js";
import { ArcadeTab } from "./w2/ArcadeTab.js";
import { PostOfficeTab } from "./w2/PostOfficeTab.js";
import { KillroyTab } from "./w2/KillroyTab.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav, renderWorldHeader } from "./tabShared.js";

const { div } = van.tags;

const ALCHEMY_SUBTABS = [
    { id: "brewing", label: "BREWING", component: BrewingTab },
    { id: "liquid", label: "LIQUID", component: LiquidTab },
    { id: "vials", label: "VIALS", component: VialTab },
    { id: "pay2win", label: "PAY 2 WIN", component: Pay2WinTab },
    { id: "sigils", label: "SIGILS", component: SigilTab },
];

const W2_SUBTABS = [
    { id: "alchemy", label: "ALCHEMY", component: null },
    { id: "arcade", label: "ARCADE", component: ArcadeTab },
    { id: "post-office", label: "POST OFFICE", component: PostOfficeTab },
    { id: "killroy", label: "KILLROY", component: KillroyTab },
    { id: "obols", label: "OBOLS", component: null },
];

const AlchemyPanel = () => {
    const active = van.state(ALCHEMY_SUBTABS[0].id);

    return div(
        { class: "tab-container" },
        renderTabNav({
            tabs: ALCHEMY_SUBTABS,
            activeId: active,
            navClass: "alchemy-sub-nav",
            buttonClass: "alchemy-sub-btn",
            stubClass: "alchemy-sub-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "alchemy-sub-content" },
            ...renderLazyPanes({
                tabs: ALCHEMY_SUBTABS,
                activeId: active,
                paneClass: "alchemy-pane",
                activeClass: "alchemy-pane--active",
                dataAttr: "data-alchemy",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};

export const W2Tab = () => {
    const activeSubTab = van.state(W2_SUBTABS[0].id);

    return div(
        { class: "world-tab w2-world-tab" },
        renderWorldHeader({
            badge: "W2",
            title: () => {
                const cur = W2_SUBTABS.find((tab) => tab.id === activeSubTab.val);
                return `W2 — ${cur?.label ?? ""}`;
            },
            subtitle: "Yum-Yum Desert — Alchemy, Arcade, Post Office, Killroy & Obols",
        }),
        renderTabNav({
            tabs: W2_SUBTABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav",
            buttonClass: "world-sub-tab-btn",
            stubClass: "world-sub-tab-btn--stub",
            isStub: (tab) => !tab.component && tab.id !== "alchemy",
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: W2_SUBTABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => {
                    if (tab.id === "alchemy") return AlchemyPanel();
                    if (tab.component) return tab.component();
                    return createComingSoonPlaceholder(tab.label);
                },
            })
        )
    );
};
