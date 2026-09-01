import van from "../../../../vendor/van-1.6.0.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { deleteGga, gga, readCList } from "../../../../services/api.js";
import { formatNumber } from "../../../../utils/numberFormat.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountSection } from "../components/AccountSection.js";
import { ActionButton } from "../components/ActionButton.js";
import { InlineEditableNumberField } from "../components/InlineEditableNumberField.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    adjustFormattedIntInput,
    cleanName,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveFormattedIntInput,
    resolveNumberInput,
    toInt,
    toNum,
    unwrapH,
    useWriteStatus,
    writeManyVerified,
    writeVerified,
} from "../accountShared.js";

const { button, div, input, option, select, span } = van.tags;

const WORLD_COUNT = 7;
const BUILT_OUTPOST_LENGTH = 13;
const DEFAULT_OUTPOST_ROW = [0, 0, 0, 0, 0, 0, 0, 0, -1, -1, 0, 211111111, 0];

const OUTPOST_FIELDS = [
    { index: 0, key: "barracks", label: "BARRACKS", inputMode: "int", min: 0 },
    { index: 1, key: "logistics", label: "LOGISTICS", inputMode: "int", min: 0 },
    { index: 2, key: "education", label: "EDUCATION", inputMode: "int", min: 0 },
    { index: 3, key: "tradingXp", label: "TRADING XP", inputMode: "float", min: 0 },
    { index: 4, key: "intelXp", label: "INTEL XP", inputMode: "float", min: 0 },
    { index: 5, key: "commandXp", label: "COMMAND XP", inputMode: "float", min: 0 },
    { index: 6, key: "militaryXp", label: "MILITARY XP", inputMode: "float", min: 0 },
    { index: 7, key: "purityXp", label: "PURITY XP", inputMode: "float", min: 0 },
];

const OUTPOST_TYPES = [
    { value: 0, label: "Resource Depot" },
    { value: 1, label: "Support Camp" },
    { value: 2, label: "Savage" },
];

const SLOT_TYPES = [
    { value: "1", label: "Locked" },
    { value: "2", label: "Worker" },
    { value: "3", label: "Trader" },
    { value: "4", label: "Guard" },
    { value: "5", label: "Surveyor" },
];

const MAP_UNIT_TYPES = [
    { value: 4, label: "Militia" },
    { value: 5, label: "Commander" },
    { value: 6, label: "Knight" },
    { value: 7, label: "Priest" },
];

const MAP_UNIT_ORDER = [5, 6, 4, 7];

const MAP_UNIT_ARRAYS = {
    1: { typeArray: 6, mapArray: 7 },
    2: { typeArray: 8, mapArray: 9 },
    3: { typeArray: 10, mapArray: 11 },
    4: { typeArray: 12, mapArray: 13 },
};

const worldFromMapId = (mapId) => Math.floor(mapId / 50) + 1;

const buildOutpostsByWorld = (royalMaps) => {
    const result = {};
    toIndexedArray(royalMaps ?? []).forEach((row, mapId) => {
        if (!Array.isArray(row) || row.length < 10) return;
        const world = worldFromMapId(mapId);
        if (world < 1 || world > WORLD_COUNT) return;
        if (!result[world]) result[world] = [];
        result[world].push(mapId);
    });
    return result;
};

const DEFAULT_UNIT_COUNTS = {
    5: 1,
    6: 4,
    4: 5,
    7: 1,
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

const VANILLA_UNIT_HOME_MAPS = {
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
const formatAmount = (value) => formatNumber(Math.max(0, Math.floor(toNum(value, 0))));
const rankFieldIndex = (field) => field.index - 3;

const outpostRankRequirement = (rank, rankType) => {
    if (rankType === 4) return 100000 * Math.pow(10, rank);
    if (rankType === 2) return (50 + 50 * rank) * Math.pow(1.6, rank);
    return (10 + 5 * rank) * Math.pow(1.3, rank);
};

const getOutpostRankInfo = (xp, rankType) => {
    let rank = 0;
    const safeXp = Math.max(0, toNum(xp, 0));

    while (safeXp >= outpostRankRequirement(rank, rankType)) rank++;

    return {
        rank,
        next: outpostRankRequirement(rank, rankType),
    };
};

const selectOption = ({ value, label }, current) =>
    option({ value: String(value), selected: String(value) === String(current) }, label);

const decodeSlots = (value) =>
    String(Math.trunc(toNum(value, 111111111)))
        .padStart(9, "1")
        .slice(-9)
        .split("");
const encodeSlots = (slots) => Number(slots.join(""));
const unlockedSlotCount = (barracksLevel, glorified) =>
    Math.max(
        0,
        Math.min(9, 1 + Math.min(5, toInt(barracksLevel, { min: 0, mode: "floor" })) + (toInt(glorified) === 1 ? 1 : 0))
    );

const outpostTypeLabel = (type) =>
    OUTPOST_TYPES.find((entry) => entry.value === Number(type))?.label ?? `Outpost Type ${type}`;

const normalizeSlotsForCapacity = (slotValue, barracksLevel, glorified) => {
    const slots = decodeSlots(slotValue);
    const unlockedSlots = unlockedSlotCount(barracksLevel, glorified);

    for (let slot = 0; slot < slots.length; slot++) {
        if (slot >= unlockedSlots) {
            slots[slot] = "1";
        } else if (slots[slot] === "1") {
            slots[slot] = "2";
        }
    }

    return encodeSlots(slots);
};

const syncSlotsToCapacity = async ({ mapId, slotState, barracksLevel, glorified }) => {
    const nextValue = normalizeSlotsForCapacity(slotState.val, barracksLevel, glorified);
    if (nextValue === slotState.val) return;

    await writeVerified(`RoyalMaps[${mapId}][11]`, nextValue);
    slotState.val = nextValue;
};

const readUnitPair = async (typeArray, mapArray) => {
    const [rawTypes, rawMaps] = await Promise.all([gga(`RoyalG[${typeArray}]`), gga(`RoyalG[${mapArray}]`)]);
    return {
        types: toIndexedArray(rawTypes ?? []).slice(),
        maps: toIndexedArray(rawMaps ?? []).slice(),
    };
};

const getMapName = (mapId, mapDispNames, mapDetails) => {
    const dispName = mapDispNames?.[mapId];
    if (dispName && typeof dispName === "string" && dispName.trim()) return cleanName(dispName, `Map ${mapId}`);

    const row = toIndexedArray(mapDetails?.[mapId] ?? []);
    const candidates = row.flatMap((entry) => toIndexedArray(entry ?? []));
    const text = candidates.find((entry) => typeof entry === "string" && entry.trim());
    return cleanName(text, `Map ${mapId}`) || `Map ${mapId}`;
};

const getKillReq = (mapId, mapDetails, killReqOverrides) => {
    const overrides = unwrapH(killReqOverrides) ?? {};
    if (Object.prototype.hasOwnProperty.call(overrides, String(mapId))) return toNum(overrides[String(mapId)], 0);

    const detail = toIndexedArray(toIndexedArray(mapDetails[mapId] ?? [])[0] ?? []);
    return (
        3 *
        (25 +
            5 * mapId +
            toNum(detail[0], 0) *
                Math.pow(1.3 - 0.01 * Math.floor(mapId / 50), 0.2 * (mapId - 50 * Math.floor(mapId / 50))) *
                Math.pow(4, Math.floor(mapId / 50)) *
                (1 + 29 * Math.min(1, Math.floor(mapId / 50))))
    );
};

const rowKind = (row) => {
    if (!Array.isArray(row)) return "hidden";
    if (row.length >= BUILT_OUTPOST_LENGTH) return "built";
    if (row.length === 1 && Number.isFinite(Number(row[0]))) return "kills";
    return "hidden";
};

const getUnitTypeLabel = (type) =>
    MAP_UNIT_TYPES.find((entry) => entry.value === Number(type))?.label ?? `Unit ${type}`;

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

const buildVanillaUnitArrays = (royalG, order = []) => {
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
        const nextSlots = normalizeSlotsForCapacity(row[11], row[0], row[12]);
        if (nextSlots !== row[11]) writes.push({ path: `RoyalMaps[${mapId}][11]`, value: nextSlots });
    });

    await writeManyVerified(writes);
    await refreshRoyalGuardUnitCaches();
};

const buildDistributedUnitArrays = (royalG, wantedPerOutpost, outpostsByWorld) => {
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

const SelectWriter = ({ label, valueState, options, path, onApplied = null, className = "" }) => {
    const { status, run } = useWriteStatus();
    return div(
        { class: `outpost-select-field ${className}` },
        span({ class: "outpost-select-field__label" }, label),
        select(
            {
                class: () =>
                    `outpost-select-field__select${status.val === "success" ? " is-success" : ""}${
                        status.val === "error" ? " is-error" : ""
                    }`,
                value: () => String(valueState.val),
                onchange: (e) => {
                    const rawValue = e.target.value;
                    const value = Number.isFinite(Number(rawValue)) ? Number(rawValue) : rawValue;
                    void run(async () => {
                        await writeVerified(path, value);
                        valueState.val = value;
                        if (typeof onApplied === "function") await onApplied(value);
                    });
                },
            },
            ...options.map((entry) => selectOption(entry, valueState.val))
        )
    );
};

const OutpostSlots = ({ mapId, slotState, barracksState, glorifiedState }) => {
    const { status, run } = useWriteStatus();
    const slots = () => decodeSlots(slotState.val);
    const unlockedSlots = () => unlockedSlotCount(barracksState.val, glorifiedState.val);

    return div(
        { class: "outpost-slots" },
        span({ class: "outpost-slots__label" }, "OUTPOST SLOTS"),
        ...Array.from({ length: 9 }, (_, slot) =>
            select(
                {
                    class: () =>
                        `outpost-slot-select${status.val === "success" ? " is-success" : ""}${
                            status.val === "error" ? " is-error" : ""
                        }`,
                    value: () => slots()[slot],
                    title: `Slot ${slot + 1}`,
                    disabled: () => slot >= unlockedSlots(),
                    onchange: (e) => {
                        const nextSlots = slots();
                        nextSlots[slot] = e.target.value;
                        const nextValue = encodeSlots(nextSlots);
                        void run(async () => {
                            await writeVerified(`RoyalMaps[${mapId}][11]`, nextValue);
                            slotState.val = nextValue;
                        });
                    },
                },
                ...SLOT_TYPES.map((entry) => selectOption(entry, slots()[slot]))
            )
        )
    );
};

const MapUnitAddControl = ({ outpost, onAdded }) => {
    const arrays = MAP_UNIT_ARRAYS[outpost.world];
    const typeState = van.state(MAP_UNIT_TYPES[0].value);
    const { status, run } = useWriteStatus();

    if (!arrays)
        return span({ class: "outpost-map-units__empty" }, "Map unit arrays are not mapped for this world yet.");

    return div(
        { class: "outpost-map-unit-add" },
        div(
            { class: "outpost-select-field outpost-map-unit-add__field" },
            span({ class: "outpost-select-field__label" }, "NEW UNIT"),
            select(
                {
                    class: "outpost-select-field__select",
                    value: () => String(typeState.val),
                    onchange: (e) => {
                        typeState.val = Number(e.target.value);
                    },
                },
                ...MAP_UNIT_TYPES.map((entry) => selectOption(entry, typeState.val))
            )
        ),
        ActionButton({
            label: "ADD UNIT",
            status,
            tooltip: `Add the selected map unit to ${outpost.name}.`,
            onClick: (e) => {
                e.preventDefault();
                void run(async () => {
                    const { types, maps } = await readUnitPair(arrays.typeArray, arrays.mapArray);
                    types.push(Number(typeState.val));
                    maps.push(outpost.mapId);
                    await writeManyVerified([
                        { path: `RoyalG[${arrays.typeArray}]`, value: types },
                        { path: `RoyalG[${arrays.mapArray}]`, value: maps },
                    ]);
                    if (typeof onAdded === "function") await onAdded();
                });
            },
        })
    );
};

const MapUnitRow = ({ unit, onRemoved }) => {
    const typeState = van.state(unit.type);
    const { status, run } = useWriteStatus();

    return div(
        { class: "outpost-map-unit", title: `RoyalG[${unit.typeArray}/${unit.mapArray}] index ${unit.unitIndex}` },
        SelectWriter({
            label: "TYPE",
            valueState: typeState,
            options: MAP_UNIT_TYPES,
            path: `RoyalG[${unit.typeArray}][${unit.unitIndex}]`,
        }),
        ActionButton({
            label: "REMOVE",
            status,
            variant: "danger",
            tooltip: "Remove this map unit and close the matching type/map array indexes.",
            onClick: (e) => {
                e.preventDefault();
                void run(async () => {
                    const { types, maps } = await readUnitPair(unit.typeArray, unit.mapArray);
                    if (unit.unitIndex >= types.length || unit.unitIndex >= maps.length) {
                        throw new Error(`Map unit index ${unit.unitIndex} is no longer available.`);
                    }

                    types.splice(unit.unitIndex, 1);
                    maps.splice(unit.unitIndex, 1);

                    await writeManyVerified([
                        { path: `RoyalG[${unit.typeArray}]`, value: types },
                        { path: `RoyalG[${unit.mapArray}]`, value: maps },
                    ]);
                    if (typeof onRemoved === "function") await onRemoved();
                });
            },
        })
    );
};

const UnitCountField = ({ unitType, valueState }) =>
    div(
        { class: "outpost-unit-config__field" },
        span({ class: "outpost-unit-config__label" }, getUnitTypeLabel(unitType)),
        input({
            class: "outpost-unit-config__input",
            type: "number",
            min: "0",
            step: "1",
            value: () => String(valueState.val),
            oninput: (e) => {
                valueState.val = Math.max(0, toInt(e.target.value, { min: 0, mode: "floor" }));
            },
        })
    );

const UnitSummaryRows = ({ summaries, mapDispNames, mapDetails }) =>
    summaries.map((summary) => {
        const homeMapId = VANILLA_UNIT_HOME_MAPS[summary.world];
        const homeMapName = homeMapId ? getMapName(homeMapId, mapDispNames, mapDetails) : `W${summary.world}`;
        return div(
            { class: "outpost-vanilla-units__row" },
            span({ class: "account-row__index" }, `W${summary.world}`),
            span({ class: "outpost-vanilla-units__count" }, `${summary.total} Units`),
            span(
                { class: "outpost-vanilla-units__breakdown" },
                MAP_UNIT_ORDER.map((unitType) => `${getUnitTypeLabel(unitType)} ${summary.counts[unitType] ?? 0}`).join(
                    " | "
                )
            ),
            span(
                { class: "outpost-vanilla-units__meta" },
                summary.addedNew || summary.movedExisting
                    ? `${summary.movedExisting} moved, ${summary.addedNew} added`
                    : `Home ${homeMapName}`
            )
        );
    });

const UnitBulkPanel = ({ royalGState, onChanged, outpostsByWorld, mapDispNames, mapDetails }) => {
    const vanillaStatus = useWriteStatus();
    const customStatus = useWriteStatus();
    const countStates = new Map();
    const previewState = van.state({ mode: "custom", summaries: [] });
    const summaryList = div({ class: "outpost-vanilla-units__summary" });
    const worlds = Object.keys(outpostsByWorld).map(Number);

    worlds.forEach((world) => {
        MAP_UNIT_ORDER.forEach((unitType) => {
            countStates.set(`${world}:${unitType}`, van.state(DEFAULT_UNIT_COUNTS[unitType] ?? 0));
        });
    });

    const getWantedCounts = () =>
        Object.fromEntries(
            worlds.map((world) => [
                world,
                Object.fromEntries(
                    MAP_UNIT_ORDER.map((unitType) => [unitType, countStates.get(`${world}:${unitType}`).val])
                ),
            ])
        );

    const refreshPreview = () => {
        previewState.val = {
            mode: "custom",
            summaries: buildDistributedUnitArrays(royalGState.val ?? [], getWantedCounts(), outpostsByWorld).summaries,
        };
        summaryList.replaceChildren(
            ...UnitSummaryRows({ summaries: previewState.val.summaries, mapDispNames, mapDetails })
        );
    };

    worlds.forEach((world) => {
        MAP_UNIT_ORDER.forEach((unitType) => {
            van.derive(() => {
                countStates.get(`${world}:${unitType}`).val;
                refreshPreview();
            });
        });
    });

    van.derive(() => {
        royalGState.val;
        refreshPreview();
    });

    return div(
        { class: "outpost-vanilla-units" },
        div(
            { class: "outpost-card__header" },
            div(
                { class: "outpost-row__text" },
                span({ class: "account-row__name" }, "Bulk Map Units"),
                span(
                    { class: "outpost-row__meta" },
                    "Reset to vanilla, or populate every mapped outpost using the counts below."
                )
            ),
            div(
                { class: "outpost-unit-config__actions" },
                ActionButton({
                    label: "RESET TO VANILLA",
                    status: vanillaStatus.status,
                    variant: "danger",
                    tooltip:
                        "Rebuild RoyalG map-unit arrays from current militia and Kingdom Sovereignty upgrade levels.",
                    onClick: (e) => {
                        e.preventDefault();
                        void vanillaStatus.run(async () => {
                            await resetRoyalGuardUnitsToVanilla();
                            if (typeof onChanged === "function") await onChanged();
                        });
                    },
                }),
                ActionButton({
                    label: "POPULATE OUTPOSTS",
                    status: customStatus.status,
                    tooltip: "Move existing map units first, then add any missing units to match the selected counts.",
                    onClick: (e) => {
                        e.preventDefault();
                        void customStatus.run(async () => {
                            const rawRoyalG = await gga("RoyalG");
                            const royalG = toIndexedArray(rawRoyalG ?? []);
                            const { rebuilt } = buildDistributedUnitArrays(royalG, getWantedCounts(), outpostsByWorld);
                            const writes = [];

                            Object.values(rebuilt).forEach((entry) => {
                                writes.push({ path: `RoyalG[${entry.typeArray}]`, value: entry.types });
                                writes.push({ path: `RoyalG[${entry.mapArray}]`, value: entry.maps });
                            });

                            await writeManyVerified(writes);
                            if (typeof onChanged === "function") await onChanged();
                        });
                    },
                })
            )
        ),
        div(
            { class: "outpost-unit-config" },
            ...worlds.map((world) =>
                div(
                    { class: "outpost-unit-config__world" },
                    span({ class: "account-row__index" }, `W${world}`),
                    ...MAP_UNIT_ORDER.map((unitType) =>
                        UnitCountField({ unitType, valueState: countStates.get(`${world}:${unitType}`) })
                    )
                )
            )
        ),
        summaryList
    );
};

const BuiltOutpostRow = ({
    outpost,
    fieldStates,
    slotState,
    outpostTypeState,
    glorifiedState,
    mapUnits,
    onUnitsChanged,
}) => {
    const syncCapacity = async (nextBarracks = fieldStates.get("barracks").val, nextGlorified = glorifiedState.val) => {
        await syncSlotsToCapacity({
            mapId: outpost.mapId,
            slotState,
            barracksLevel: nextBarracks,
            glorified: nextGlorified,
        });
    };

    const fieldLabel = (field) => {
        if (field.index < 3) return field.label;

        const rankInfo = getOutpostRankInfo(fieldStates.get(field.key).val, rankFieldIndex(field));
        return [
            span({ class: "outpost-field__label-main" }, field.label),
            span({ class: "outpost-field__rank" }, `RANK ${rankInfo.rank}`),
            span({ class: "outpost-field__next" }, `NEXT ${formatAmount(rankInfo.next)}`),
        ];
    };

    const fieldControl = (field) =>
        InlineEditableNumberField({
            label: () => fieldLabel(field),
            valueState: fieldStates.get(field.key),
            path: `RoyalMaps[${outpost.mapId}][${field.index}]`,
            onApplied: field.key === "barracks" ? (value) => syncCapacity(value, glorifiedState.val) : null,
            inputMode: field.inputMode,
            normalize: (raw) =>
                resolveNumberInput(raw, {
                    formatted: true,
                    float: field.inputMode === "float",
                    min: field.min ?? 0,
                    fallback: null,
                }),
            rootClass: "outpost-field",
            labelClass: "outpost-field__label",
            inputClass: "outpost-field__set",
        });

    return div(
        { class: "outpost-card outpost-card--built" },
        div(
            { class: "outpost-card__header" },
            div(
                { class: "outpost-card__title" },
                span({ class: "account-row__index" }, `M${outpost.mapId}`),
                div(
                    { class: "outpost-row__text" },
                    span({ class: "account-row__name" }, outpost.name),
                    span({ class: "outpost-row__meta" }, () => outpostTypeLabel(outpostTypeState.val))
                )
            ),
            div(
                { class: "outpost-card__status" },
                span({ class: "outpost-row__badge" }, () => (toInt(glorifiedState.val) === 1 ? "GLORIFIED" : "OUTPOST"))
            )
        ),
        div(
            { class: "outpost-card__body" },
            div(
                { class: "outpost-card__group outpost-card__group--levels" },
                span({ class: "outpost-card__group-title" }, "UPGRADES"),
                ...OUTPOST_FIELDS.slice(0, 3).map(fieldControl)
            ),
            div(
                { class: "outpost-card__group outpost-card__group--settings" },
                span({ class: "outpost-card__group-title" }, "STATE"),
                SelectWriter({
                    label: "TYPE",
                    valueState: outpostTypeState,
                    options: OUTPOST_TYPES,
                    path: `RoyalMaps[${outpost.mapId}][10]`,
                    onApplied: (value) => {
                        outpost.type = value;
                    },
                }),
                div(
                    { class: "outpost-select-field" },
                    span({ class: "outpost-select-field__label" }, "GLORIFIED"),
                    ActionButton({
                        label: () => (toInt(glorifiedState.val) === 1 ? "GLORIFIED" : "STANDARD"),
                        tooltip: "Toggle glorified outpost status.",
                        className: "outpost-glorified-button",
                        onClick: async (e) => {
                            e.preventDefault();
                            const nextValue = toInt(glorifiedState.val) === 1 ? 0 : 1;
                            await writeVerified(`RoyalMaps[${outpost.mapId}][12]`, nextValue);
                            glorifiedState.val = nextValue;
                            outpost.glorified = nextValue;
                            await syncCapacity(fieldStates.get("barracks").val, nextValue);
                        },
                    })
                )
            ),
            div(
                { class: "outpost-card__group outpost-card__group--rank-a" },
                span({ class: "outpost-card__group-title" }, "RANK XP"),
                ...OUTPOST_FIELDS.slice(3, 6).map(fieldControl)
            ),
            div(
                { class: "outpost-card__group outpost-card__group--rank-b" },
                span({ class: "outpost-card__group-title" }, "RANK XP"),
                ...OUTPOST_FIELDS.slice(6).map(fieldControl)
            ),
            OutpostSlots({
                mapId: outpost.mapId,
                slotState,
                barracksState: fieldStates.get("barracks"),
                glorifiedState,
            }),
            div(
                { class: "outpost-map-units" },
                span({ class: "outpost-map-units__label" }, "MAP UNITS"),
                MapUnitAddControl({ outpost, onAdded: onUnitsChanged }),
                mapUnits.length
                    ? mapUnits.map((unit) => MapUnitRow({ unit, onRemoved: onUnitsChanged }))
                    : span({ class: "outpost-map-units__empty" }, "None stationed")
            )
        )
    );
};

const KillOutpostRow = ({ outpost, remainingState, onConverted }) =>
    EditableNumberRow({
        valueState: remainingState,
        normalize: (raw) => resolveFormattedIntInput(raw, null, { min: 0, max: Math.ceil(outpost.killReq) }),
        write: async (nextRemaining) => {
            const nextKills = Math.max(0, outpost.killReq - nextRemaining);
            await writeVerified(`RoyalMaps[${outpost.mapId}][0]`, nextKills);
            return nextRemaining;
        },
        renderInfo: () => [
            span({ class: "account-row__index" }, `M${outpost.mapId}`),
            div(
                { class: "outpost-row__text" },
                span({ class: "account-row__name" }, outpost.name),
                span(
                    { class: "outpost-row__meta" },
                    `Kills done ${formatAmount(outpost.kills)} / ${formatAmount(outpost.killReq)}`
                )
            ),
        ],
        renderBadge: (remaining) => `LEFT ${formatAmount(remaining)}`,
        adjustInput: (rawValue, delta, currentValue) =>
            adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0, max: Math.ceil(outpost.killReq) }),
        rowClass: "outpost-row outpost-row--kills",
        badgeClass: "outpost-row__badge",
        controlsClass: "outpost-kill-row__controls",
        inputProps: {
            formatter: largeFormatter,
            parser: largeParser,
        },
        applyLabel: "SET LEFT",
        renderExtraActions: ({ status }) =>
            ActionButton({
                label: "MAKE OUTPOST",
                status,
                tooltip: "Replace this kill-counter row with a default built outpost row.",
                onClick: (e) => {
                    e.preventDefault();
                    void (async () => {
                        await writeVerified(`RoyalMaps[${outpost.mapId}]`, [...DEFAULT_OUTPOST_ROW]);
                        onConverted();
                    })();
                },
            }),
    });

const readOutposts = async () => {
    const [rawRoyalMaps, rawMapDetails, rawKillReqOverrides, rawRoyalG, rawMapDispNames] = await Promise.all([
        gga("RoyalMaps"),
        gga("CustomLists.h.MapDetails"),
        gga("CustomMaps.h.RG_KillReq.h"),
        gga("RoyalG"),
        readCList("MapDispName"),
    ]);

    const royalMaps = toIndexedArray(rawRoyalMaps ?? []);
    const mapDetails = toIndexedArray(rawMapDetails ?? []);
    const royalG = toIndexedArray(rawRoyalG ?? []);
    const mapDispNames = toIndexedArray(rawMapDispNames ?? []);

    const mapUnitsByMapId = new Map();
    Object.entries(MAP_UNIT_ARRAYS).forEach(([world, arrays]) => {
        const types = toIndexedArray(royalG[arrays.typeArray] ?? []);
        const maps = toIndexedArray(royalG[arrays.mapArray] ?? []);
        const count = Math.max(types.length, maps.length);

        for (let unitIndex = 0; unitIndex < count; unitIndex++) {
            const mapId = toInt(maps[unitIndex], { min: 0, fallback: -1 });
            if (mapId < 0) continue;

            const unit = {
                world: Number(world),
                unitIndex,
                type: toInt(types[unitIndex], { min: 0 }),
                mapId,
                typeArray: arrays.typeArray,
                mapArray: arrays.mapArray,
            };
            if (!mapUnitsByMapId.has(mapId)) mapUnitsByMapId.set(mapId, []);
            mapUnitsByMapId.get(mapId).push(unit);
        }
    });

    const outposts = royalMaps
        .map((row, mapId) => {
            const kind = rowKind(row);
            if (kind === "hidden") return null;

            const killReq = getKillReq(mapId, mapDetails, rawKillReqOverrides);
            const world = worldFromMapId(mapId);
            const name = getMapName(mapId, mapDispNames, mapDetails);
            if (world < 1 || world > WORLD_COUNT) return null;

            if (kind === "kills") {
                const kills = toNum(row[0], 0);
                return {
                    kind,
                    mapId,
                    world,
                    name,
                    kills,
                    killReq,
                    remaining: Math.max(0, killReq - kills),
                    mapUnits: mapUnitsByMapId.get(mapId) ?? [],
                };
            }

            return {
                kind,
                mapId,
                world,
                name,
                row,
                type: toInt(row[10], { min: 0 }),
                glorified: toInt(row[12], { min: 0 }),
                mapUnits: mapUnitsByMapId.get(mapId) ?? [],
            };
        })
        .filter(Boolean);

    return { outposts, mapDispNames, mapDetails };
};

export const OutpostsTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Outposts" });
    const activeWorld = van.state(1);
    const outposts = van.state([]);
    const royalGState = van.state([]);
    const outpostsByWorldState = van.state({});
    const mapDispNamesState = van.state([]);
    const mapDetailsState = van.state([]);
    const fieldStateGroups = new Map();
    const slotStates = new Map();
    const outpostTypeStates = new Map();
    const glorifiedStates = new Map();
    const remainingStates = new Map();
    const rowNodes = new Map();
    const rowList = div({ class: "account-item-stack account-item-stack--dense outpost-list" });
    const bodyContent = div();
    const noOutposts = EmptyState({
        icon: Icons.SearchX(),
        title: "NO OUTPOST ROWS",
        subtitle: "No RoyalMaps outpost or kill-counter rows were returned for this world.",
    });

    const renderRows = () => {
        if (activeWorld.val === "units")
            return UnitBulkPanel({
                royalGState,
                onChanged: load,
                outpostsByWorld: outpostsByWorldState.val,
                mapDispNames: mapDispNamesState.val,
                mapDetails: mapDetailsState.val,
            });

        const visible = outposts.val.filter((outpost) => outpost.world === activeWorld.val);
        rowList.replaceChildren(...visible.map((outpost) => rowNodes.get(outpost.mapId)));
        return visible.length ? rowList : noOutposts;
    };

    van.derive(() => {
        activeWorld.val;
        outposts.val;
        bodyContent.replaceChildren(renderRows());
    });

    const load = () =>
        runLoad(async () => {
            const [{ outposts: nextOutposts, mapDispNames, mapDetails }, rawRoyalG, rawRoyalMaps] = await Promise.all([
                readOutposts(),
                gga("RoyalG"),
                gga("RoyalMaps"),
            ]);
            rowNodes.clear();
            royalGState.val = toIndexedArray(rawRoyalG ?? []);
            outpostsByWorldState.val = buildOutpostsByWorld(rawRoyalMaps);
            mapDispNamesState.val = mapDispNames;
            mapDetailsState.val = mapDetails;

            nextOutposts.forEach((outpost) => {
                if (outpost.kind === "kills") {
                    const remainingState = getOrCreateState(remainingStates, outpost.mapId);
                    remainingState.val = outpost.remaining;
                    rowNodes.set(
                        outpost.mapId,
                        KillOutpostRow({
                            outpost,
                            remainingState,
                            onConverted: load,
                        })
                    );
                    return;
                }

                const fieldStates = new Map();
                OUTPOST_FIELDS.forEach((field) => {
                    const state = getOrCreateState(fieldStateGroups, `${outpost.mapId}:${field.key}`);
                    state.val = toNum(outpost.row[field.index], 0);
                    fieldStates.set(field.key, state);
                });

                const slotState = getOrCreateState(slotStates, outpost.mapId, 111111111);
                const outpostTypeState = getOrCreateState(outpostTypeStates, outpost.mapId);
                const glorifiedState = getOrCreateState(glorifiedStates, outpost.mapId);
                slotState.val = toInt(outpost.row[11], { min: 0, fallback: 111111111 });
                outpostTypeState.val = outpost.type;
                glorifiedState.val = outpost.glorified;

                rowNodes.set(
                    outpost.mapId,
                    BuiltOutpostRow({
                        outpost,
                        fieldStates,
                        slotState,
                        outpostTypeState,
                        glorifiedState,
                        mapUnits: outpost.mapUnits,
                        onUnitsChanged: load,
                    })
                );
            });

            outposts.val = nextOutposts;
        });

    load();

    return PersistentAccountListPage({
        title: "OUTPOSTS",
        description: "Manage Royal Guard outposts, kill counters, ranks, slots, and stationed map units.",
        wrapActions: false,
        actions: BulkActionBar({
            refresh: {
                onClick: load,
                tooltip: "Re-read RoyalMaps and RoyalG unit arrays from the running game.",
                disabled: () => loading.val,
            },
        }),
        state: { loading, error },
        loadingText: "READING OUTPOSTS",
        errorTitle: "OUTPOSTS READ FAILED",
        initialWrapperClass: "masterclass-upgrade-scroll",
        body: div(
            { class: "masterclass-upgrade-scroll scrollable-panel" },
            AccountSection({
                title: "OUTPOST WORLDS",
                body: [
                    div(
                        { class: "masterclass-category-tabs" },
                        ...Array.from({ length: WORLD_COUNT }, (_, index) => {
                            const world = index + 1;
                            return button(
                                {
                                    type: "button",
                                    class: () =>
                                        `masterclass-category-tabs__button${
                                            activeWorld.val === world ? " is-active" : ""
                                        }`,
                                    onclick: () => {
                                        activeWorld.val = world;
                                    },
                                },
                                `W${world}`
                            );
                        }),
                        button(
                            {
                                type: "button",
                                class: () =>
                                    `masterclass-category-tabs__button${
                                        activeWorld.val === "units" ? " is-active" : ""
                                    }`,
                                onclick: () => {
                                    activeWorld.val = "units";
                                },
                            },
                            "UNITS"
                        )
                    ),
                    bodyContent,
                ],
            })
        ),
    });
};
