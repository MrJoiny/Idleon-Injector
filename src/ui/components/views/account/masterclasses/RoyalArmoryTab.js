import { MasterclassUpgradeTab } from "./MasterclassUpgradeTab.js";
import {
    MILITIA_SHELF_TO_WORLD,
    syncRoyalGuardMilitiaForWorld,
    syncRoyalGuardSovereigntyUnits,
} from "./OutpostsTab.js";

const resourceFields = (resourceIds) =>
    resourceIds.map((resourceId) => ({
        key: `royalResource${resourceId}`,
        path: `RoyalG[1][${resourceId}]`,
        name: `RGres${resourceId}`,
        badge: `R${resourceId}`,
    }));

const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);

const ROYAL_ARMORY_RESOURCE_TABS = [
    { id: "w1", label: "W1", fields: resourceFields(range(0, 9)) },
    { id: "w2", label: "W2", fields: resourceFields(range(10, 19)) },
    { id: "w3", label: "W3", fields: resourceFields(range(20, 29)) },
    { id: "w4", label: "W4", fields: resourceFields(range(30, 39)) },
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
        onUpgradeChanged: ({ upgrade }) => {
            const shelf = Number(upgrade.index);
            if (shelf === 28) return syncRoyalGuardSovereigntyUnits();
            const world = MILITIA_SHELF_TO_WORLD[shelf];
            return world ? syncRoyalGuardMilitiaForWorld(world) : null;
        },
        onBulkChanged: ({ upgrades }) => {
            const shelves = new Set(upgrades.map((upgrade) => Number(upgrade.index)));
            const tasks = Object.entries(MILITIA_SHELF_TO_WORLD)
                .filter(([shelf]) => shelves.has(Number(shelf)))
                .map(([, world]) => syncRoyalGuardMilitiaForWorld(world));
            if (shelves.has(28)) tasks.push(syncRoyalGuardSovereigntyUnits());
            return Promise.all(tasks);
        },
    });
