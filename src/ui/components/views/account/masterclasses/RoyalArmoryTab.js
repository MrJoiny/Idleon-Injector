import { MasterclassUpgradeTab } from "./MasterclassUpgradeTab.js";

const resourceFields = (resourceIds) =>
    resourceIds.map((resourceId) => ({
        key: `royalResource${resourceId}`,
        path: `RoyalG[1][${resourceId}]`,
        name: `RGres${resourceId}`,
        badge: `R${resourceId}`,
    }));

const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

const ROYAL_ARMORY_RESOURCE_TABS = [
    { id: "w1", label: "W1", fields: resourceFields(range(0, 15)) },
    { id: "w2", label: "W2", fields: resourceFields(range(20, 36)) },
    { id: "w3", label: "W3", fields: resourceFields(range(40, 57)) },
    { id: "w4", label: "W4", fields: resourceFields(range(60, 76)) },
];

export const RoyalArmoryTab = () =>
    MasterclassUpgradeTab({
        title: "ROYAL ARMORY",
        description: "Manage Royal Guard Royal Armory upgrades.",
        levelsPath: "RoyalG[2]",
        definitionPaths: ["ArmoryUpg"],
        orderPath: "Research[43]",
        currencyTitle: "ROYAL RESOURCES",
        currencyTabs: ROYAL_ARMORY_RESOURCE_TABS,
        fallbackPrefix: "Royal Armory Upgrade",
    });
