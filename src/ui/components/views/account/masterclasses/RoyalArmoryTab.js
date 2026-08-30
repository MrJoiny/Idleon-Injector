import { MasterclassUpgradeTab } from "./MasterclassUpgradeTab.js";

const resourceFields = (world, resourceIds) =>
    resourceIds.map((resourceId) => ({
        key: `royalResource${resourceId}`,
        path: `RoyalG[1][${resourceId}]`,
        name: `RGres${resourceId}`,
        badge: `R${resourceId}`,
    }));

const ROYAL_ARMORY_RESOURCE_TABS = [
    { world: 1, resourceIds: [0, 1, 2, 3, 4, 5] },
    { world: 2, resourceIds: [10, 11, 12, 13, 14, 15] },
    { world: 3, resourceIds: [20, 21, 22, 23, 24, 25, 26] },
    { world: 4, resourceIds: [30, 31, 32, 33, 34, 35, 36, 37] },
    { world: 5, resourceIds: [40, 41, 42, 43, 44, 45, 46, 47] },
    { world: 6, resourceIds: [50, 51, 52, 53, 54, 55, 56, 57] },
    { world: 7, resourceIds: [60, 61, 62, 63, 64, 65, 66, 67] },
].map(({ world, resourceIds }) => ({
    id: `w${world}`,
    label: `W${world}`,
    fields: resourceFields(world, resourceIds),
}));

export const RoyalArmoryTab = () =>
    MasterclassUpgradeTab({
        title: "ROYAL ARMORY",
        description: "Manage Royal Guard Royal Armory upgrades.",
        levelsPath: "RoyalG[2]",
        definitionPaths: ["ArmoryUpg"],
        currencyTitle: "ROYAL RESOURCES",
        currencyTabs: ROYAL_ARMORY_RESOURCE_TABS,
        fallbackPrefix: "Royal Armory Upgrade",
    });
