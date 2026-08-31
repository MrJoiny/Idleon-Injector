/**
 * Masterclasses Tab
 */

import { CompassTab } from "./masterclasses/CompassTab.js";
import { GrimoireTab } from "./masterclasses/GrimoireTab.js";
import { LilOrbletShopTab } from "./masterclasses/LilOrbletShopTab.js";
import { OutpostsTab } from "./masterclasses/OutpostsTab.js";
import { ResourceNodesTab } from "./masterclasses/ResourceNodesTab.js";
import { RoyalArmoryTab } from "./masterclasses/RoyalArmoryTab.js";
import { TesseractTab } from "./masterclasses/TesseractTab.js";
import { createWorldTab } from "./tabShared.js";

const MASTERCLASSES_SUBTABS = [
    { id: "grimoire", label: "GRIMOIRE", component: GrimoireTab },
    { id: "compass", label: "COMPASS", component: CompassTab },
    { id: "tesseract", label: "TESSERACT", component: TesseractTab },
    { id: "royal-armory", label: "ROYAL ARMORY", component: RoyalArmoryTab },
    { id: "resource-nodes", label: "RESOURCE NODES", component: ResourceNodesTab },
    { id: "outposts", label: "OUTPOSTS", component: OutpostsTab },
    { id: "lil-orblet-shop", label: "LIL ORBLET SHOP", component: LilOrbletShopTab },
];

export const MasterclassesTab = createWorldTab(MASTERCLASSES_SUBTABS, "masterclasses-tab");
