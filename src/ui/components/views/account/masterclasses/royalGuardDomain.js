/** Royal Guard unit rebuilding, distribution, and outpost slot rules shared by account views. */

import { deleteGga, gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { toInt, toNum, writeManyVerified } from "../accountShared.js";

export const BUILT_OUTPOST_LENGTH = 13;

export const MAP_UNIT_ORDER = [5, 6, 4, 7];

export const MAP_UNIT_ARRAYS = {
    1: { typeArray: 6, mapArray: 7 },
    2: { typeArray: 8, mapArray: 9 },
    3: { typeArray: 10, mapArray: 11 },
    4: { typeArray: 12, mapArray: 13 },
};

export const MILITIA_WORLD_TO_DISPLAY_SHELF = {
    1: 14,
    2: 19,
    3: 38,
    4: 56,
};
export const MILITIA_SHELF_TO_WORLD = {
    14: 1,
    19: 2,
    38: 3,
    56: 4,
};
export const UNIT_REBUILD_DISPLAY_SHELVES = new Set([14, 19, 28, 38, 56]);
const displayShelfToOrderIndex = (displayShelf) => displayShelf - 1;

const VANILLA_MILITIA_UPGRADES = {
    1: 60,
    2: 61,
    3: 62,
    4: 63,
};

export const VANILLA_UNIT_HOME_MAPS = {
    1: 1,
    2: 51,
    3: 101,
    4: 151,
};

const SOVEREIGNTY_SHELF = 28;
const SOVEREIGNTY_UPGRADE_ID = 68;
const SOVEREIGNTY_UNIT_TYPES = "0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,1,1,1,1,0,2,2,2,1,2,2,2,2,2,2,2,0,1,2,2"
    .split(",")
    .map((value) => Number(value) + 5);
const SOVEREIGNTY_WORLDS = "1,2,1,2,1,2,3,1,2,3,1,2,3,3,4,3,4,1,2,3,4,1,2,3,4,1,2,3,4,1,2,3,4,4,4,4".split(",");

export const decodeSlots = (value) =>
    String(Math.trunc(toNum(value, 111111111)))
        .padStart(9, "1")
        .slice(-9)
        .split("");
export const encodeSlots = (slots) => Number(slots.join(""));
export const unlockedSlotCount = (barracksLevel) =>
    Math.max(0, Math.min(6, 1 + Math.min(5, toInt(barracksLevel, { min: 0, mode: "floor" }))));

export const normalizeSlotsForCapacity = (slotValue, barracksLevel) => {
    const slots = decodeSlots(slotValue);
    const unlockedSlots = unlockedSlotCount(barracksLevel);

    for (let slot = 0; slot < slots.length; slot++) {
        if (slot >= unlockedSlots) {
            slots[slot] = "1";
        } else if (slots[slot] === "1") {
            slots[slot] = "2";
        }
    }

    return encodeSlots(slots);
};

const countUnitTypes = (types) =>
    types.reduce((acc, type) => {
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
    }, {});

const makeUnitSummary = ({ world, types, addedNew = 0, movedExisting = 0 }) => ({
    world,
    total: types.length,
    counts: countUnitTypes(types),
    addedNew,
    movedExisting,
});

export const buildVanillaUnitArrays = (royalG, order = []) => {
    const upgrades = toIndexedArray(royalG?.[2] ?? []);
    const resolveUpgradeId = (shelf, fallback) => {
        const resolved = Number(toIndexedArray(order)[shelf]);
        return Number.isInteger(resolved) && resolved >= 0 ? resolved : fallback;
    };
    const militiaUpgrades = Object.fromEntries(
        Object.entries(MILITIA_WORLD_TO_DISPLAY_SHELF).map(([worldKey, displayShelf]) => [
            worldKey,
            resolveUpgradeId(displayShelfToOrderIndex(displayShelf), VANILLA_MILITIA_UPGRADES[worldKey]),
        ])
    );
    const sovereigntyUpgrade = resolveUpgradeId(displayShelfToOrderIndex(SOVEREIGNTY_SHELF), SOVEREIGNTY_UPGRADE_ID);
    const rebuilt = {};
    const summaries = [];

    Object.entries(MAP_UNIT_ARRAYS).forEach(([worldKey, arrays]) => {
        const currentWorld = Number(worldKey);
        const types = [];
        const maps = [];
        const homeMap = VANILLA_UNIT_HOME_MAPS[currentWorld];
        const militiaUpgrade = militiaUpgrades[currentWorld];
        const militiaCount = Math.max(0, Math.min(10, toInt(upgrades[militiaUpgrade], { min: 0, mode: "floor" })));

        for (let i = 0; i < militiaCount; i++) {
            types.push(4);
            maps.push(homeMap);
        }

        rebuilt[currentWorld] = { ...arrays, types, maps };
    });

    const sovereigntyCount = Math.max(
        0,
        Math.min(SOVEREIGNTY_UNIT_TYPES.length, toInt(upgrades[sovereigntyUpgrade], { min: 0, mode: "floor" }))
    );

    for (let index = 0; index < sovereigntyCount; index++) {
        const currentWorld = Number(SOVEREIGNTY_WORLDS[index]);
        const target = rebuilt[currentWorld];
        if (!target) continue;

        target.types.push(SOVEREIGNTY_UNIT_TYPES[index]);
        target.maps.push(VANILLA_UNIT_HOME_MAPS[currentWorld]);
    }

    Object.entries(rebuilt).forEach(([worldKey, entry]) => {
        summaries.push(makeUnitSummary({ world: Number(worldKey), types: entry.types }));
    });

    return { rebuilt, summaries, sovereigntyCount };
};

export const refreshRoyalGuardUnitCaches = async () => {
    await deleteGga("DNSM.h.TotUnitzAllMapz");
};

export const resetRoyalGuardUnitsToVanilla = async () => {
    const [rawRoyalG, rawRoyalMaps, rawOrder] = await Promise.all([
        gga("RoyalG"),
        gga("RoyalMaps"),
        readCList("Research[43]"),
    ]);
    const royalG = toIndexedArray(rawRoyalG ?? []);
    const royalMaps = toIndexedArray(rawRoyalMaps ?? []);
    const { rebuilt } = buildVanillaUnitArrays(royalG, rawOrder);
    const writes = [];

    Object.values(rebuilt).forEach((entry) => {
        writes.push({ path: `RoyalG[${entry.typeArray}]`, value: entry.types });
        writes.push({ path: `RoyalG[${entry.mapArray}]`, value: entry.maps });
    });

    royalMaps.forEach((row, mapId) => {
        if (!Array.isArray(row) || row.length < BUILT_OUTPOST_LENGTH) return;
        const nextSlots = normalizeSlotsForCapacity(row[11], row[0]);
        if (nextSlots !== row[11]) writes.push({ path: `RoyalMaps[${mapId}][11]`, value: nextSlots });
    });

    await writeManyVerified(writes);
    await refreshRoyalGuardUnitCaches();
};

export const buildDistributedUnitArrays = (royalG, wantedPerOutpost, outpostsByWorld) => {
    const rebuilt = {};
    const summaries = [];
    const wantedTypes = new Set(MAP_UNIT_ORDER);

    Object.entries(outpostsByWorld).forEach(([worldKey, mapIds]) => {
        const world = Number(worldKey);
        const arrays = MAP_UNIT_ARRAYS[world];
        const currentTypes = toIndexedArray(royalG?.[arrays.typeArray] ?? []);
        const pool = {};
        let movedExisting = 0;
        let addedNew = 0;

        MAP_UNIT_ORDER.forEach((unitType) => {
            pool[unitType] = 0;
        });

        currentTypes.forEach((rawType) => {
            const unitType = Number(rawType);
            if (wantedTypes.has(unitType)) pool[unitType]++;
        });

        const types = [];
        const maps = [];

        const wantedForWorld = wantedPerOutpost[world] ?? wantedPerOutpost;

        mapIds.forEach((mapId) => {
            MAP_UNIT_ORDER.forEach((unitType) => {
                const wanted = Math.max(0, toInt(wantedForWorld[unitType], { min: 0, mode: "floor" }));
                for (let i = 0; i < wanted; i++) {
                    if (pool[unitType] > 0) {
                        pool[unitType]--;
                        movedExisting++;
                    } else {
                        addedNew++;
                    }

                    types.push(unitType);
                    maps.push(mapId);
                }
            });
        });

        rebuilt[world] = { ...arrays, types, maps };
        summaries.push(makeUnitSummary({ world, types, movedExisting, addedNew }));
    });

    return { rebuilt, summaries };
};
