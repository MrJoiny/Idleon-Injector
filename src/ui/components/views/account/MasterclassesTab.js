/**
 * Masterclasses (branch-specific) - limited to GRIMOIRE + TARGET tab for isolated PR testing
 */

import van from "../../../vendor/van-1.6.0.js";
import { CompassTab } from "./masterclasses/CompassTab.js";
import { GrimoireTab } from "./masterclasses/GrimoireTab.js";
import { LilOrbletShopTab } from "./masterclasses/LilOrbletShopTab.js";
import { OutpostsTab } from "./masterclasses/OutpostsTab.js";
import { ResourceNodesTab } from "./masterclasses/ResourceNodesTab.js";
import { RoyalArmoryTab } from "./masterclasses/RoyalArmoryTab.js";
import { TesseractTab } from "./masterclasses/TesseractTab.js";
import { renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div } = van.tags;

const MASTERCLASSES_SUBTABS = [
    { id: "grimoire", label: "GRIMOIRE", component: GrimoireTab },
    { id: "compass", label: "COMPASS", component: CompassTab },
    { id: "tesseract", label: "TESSERACT", component: TesseractTab },
    { id: "royal-armory", label: "ROYAL ARMORY", component: RoyalArmoryTab },
    { id: "resource-nodes", label: "RESOURCE NODES", component: ResourceNodesTab },
    { id: "outposts", label: "OUTPOSTS", component: OutpostsTab },
    { id: "lil-orblet-shop", label: "LIL ORBLET SHOP", component: LilOrbletShopTab },
];

export const MasterclassesTab = () => {
    const activeSubTab = van.state(MASTERCLASSES_SUBTABS[0].id);

    return div(
        { class: "world-tab masterclasses-tab" },
        renderTabNav({
            tabs: MASTERCLASSES_SUBTABS,
            activeId: activeSubTab,
            navClass: "world-sub-nav masterclasses-sub-nav",
            buttonClass: "account-world-sub-tab-btn masterclasses-sub-tab-btn",
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: MASTERCLASSES_SUBTABS,
                activeId: activeSubTab,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => tab.component(),
            })
        )
    );
};

