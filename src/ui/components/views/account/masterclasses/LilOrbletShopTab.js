import { MasterclassUpgradeTab } from "./MasterclassUpgradeTab.js";

export const LilOrbletShopTab = () =>
    MasterclassUpgradeTab({
        title: "LIL ORBLET SHOP",
        description: "Manage Royal Guard Lil Orblet Shop upgrades.",
        levelsPath: "RoyalG[23]",
        definitionPaths: ["OrbletMarket"],
        fallbackPrefix: "Orblet Shop Upgrade",
    });
