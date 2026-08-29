import { MasterclassUpgradeTab } from "./MasterclassUpgradeTab.js";

const LIL_ORBLET_SHOP_UPGRADES = [
    { storageIndex: 0, displayIndex: "#0", name: "Emulsion", maxLevel: 5 },
    { storageIndex: 1, displayIndex: "#1", name: "Hydration", maxLevel: 200 },
    { storageIndex: 2, displayIndex: "#2", name: "Talented", maxLevel: 100 },
    { storageIndex: 3, displayIndex: "#3", name: "Full Clear", maxLevel: 50 },
    { storageIndex: 4, displayIndex: "#4", name: "Intervene", maxLevel: 100 },
    { storageIndex: 5, displayIndex: "#5", name: "Stronk Rank", maxLevel: 50 },
    { storageIndex: 6, displayIndex: "#6", name: "Bargain", maxLevel: 25 },
    { storageIndex: 7, displayIndex: "#7", name: "Long Range", maxLevel: 20 },
    { storageIndex: 8, displayIndex: "#8", name: "Parchmore", maxLevel: 100 },
];

export const LilOrbletShopTab = () =>
    MasterclassUpgradeTab({
        title: "LIL ORBLET SHOP",
        description: "Manage Royal Guard Lil Orblet Shop upgrades.",
        levelsPath: "RoyalG[23]",
        staticUpgrades: LIL_ORBLET_SHOP_UPGRADES,
        fallbackPrefix: "Orblet Shop Upgrade",
    });
