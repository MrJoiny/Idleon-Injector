import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { NumberInput, getNumberInputLiveRaw } from "../../../../NumberInput.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import { AccountSection } from "../../components/AccountSection.js";
import { AccountRow } from "../../components/AccountRow.js";
import { ActionButton } from "../../components/ActionButton.js";
import { AddFromListSection } from "../../components/AddFromListSection.js";
import { RemovableStoredRow } from "../../components/RemovableStoredRow.js";
import {
    adjustFormattedIntInput,
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    toInt,
    useWriteStatus,
    writeManyVerified,
    writeVerified,
} from "../../accountShared.js";

const { div, span } = van.tags;

const DEEPEST_LAYERS_PATH = "Spelunk[1]";
const BIGGEST_HAUL_PATH = "Spelunk[2]";
const GRAND_DISCOVERIES_PATH = "Spelunk[44]";
const DISCOVERED_OBJECTS_PATH = "Spelunk[6]";

const CAVE_METRICS = [
    {
        id: "deepest",
        label: "Deepest Layers",
        path: DEEPEST_LAYERS_PATH,
        normalize: (raw) => toInt(raw, { min: 0 }),
        format: (value) => String(toInt(value, { min: 0 })),
        adjust: (raw, delta, current) => Math.max(0, toInt(raw, current ?? 0) + delta),
        inputMode: "int",
    },
    {
        id: "haul",
        label: "Biggest Haul",
        path: BIGGEST_HAUL_PATH,
        normalize: (raw) => resolveNumberInput(raw, { formatted: true, float: true, min: 0, fallback: null }),
        format: largeFormatter,
        adjust: (raw, delta, current) => adjustFormattedIntInput(raw, delta, current ?? 0, { min: 0 }),
        inputMode: "float",
        inputProps: {
            formatter: largeFormatter,
            parser: largeParser,
        },
    },
    {
        id: "discoveries",
        label: "Grand Discoveries",
        path: GRAND_DISCOVERIES_PATH,
        normalize: (raw) => Math.min(10, toInt(raw, { min: 0 })),
        format: (value) => String(toInt(value, { min: 0 })),
        adjust: (raw, delta, current) => Math.min(10, Math.max(0, toInt(raw, current ?? 0) + delta)),
        inputMode: "int",
    },
];

const normalizeStoredNames = (raw) =>
    toIndexedArray(raw ?? [])
        .map((entry) => String(entry ?? ""))
        .filter((entry) => entry.length > 0);

const normalizeCaveText = (raw) => toIndexedArray(raw ?? []).map((entry) => String(entry ?? "").trim());

const isMeaningfulCaveDefinition = (rawName, rawDescription) => {
    const name = String(rawName ?? "").trim();
    const description = String(rawDescription ?? "").trim();
    return Boolean(name) && !/^Name\d+$/i.test(name) && Boolean(description) && !/^\d+$/.test(description);
};

const buildObjectCatalog = (rawRocksByCave, caveNames) =>
    toIndexedArray(rawRocksByCave ?? []).flatMap((rawCaveObjects, caveIndex) =>
        toIndexedArray(rawCaveObjects ?? [])
            .slice(0, -1)
            .map((rawObject, objectIndex) => {
                const definition = toIndexedArray(rawObject ?? []);
                const objectId = String(definition[0] ?? "");
                if (!objectId) return null;

                return {
                    objectId,
                    objectIndex,
                    caveIndex,
                    caveName: cleanName(caveNames[caveIndex], `Cave ${caveIndex + 1}`),
                    name: cleanName(objectId, objectId),
                };
            })
            .filter(Boolean)
    );

const buildDestroyedObjectState = (storedNames, catalog) => {
    const catalogById = new Map(catalog.map((entry) => [entry.objectId, entry]));
    const discoveredSet = new Set(storedNames);

    return {
        rows: storedNames.map((objectId, index) => {
            const match = catalogById.get(objectId);
            return {
                index,
                objectId,
                name: match?.name ?? cleanName(objectId, objectId),
                caveName: match?.caveName ?? "Unknown Cave",
                knownCatalogMatch: Boolean(match),
            };
        }),
        missingOptions: catalog.filter((entry) => !discoveredSet.has(entry.objectId)),
        knownCount: storedNames.filter((objectId) => catalogById.has(objectId)).length,
    };
};

const CaveMetricControl = ({ caveIndex, metric, valueState, rowStatus }) => {
    const inputValue = van.state(metric.format(valueState.val));
    const { status, run } = useWriteStatus();
    let isFocused = false;

    const syncInputToCommitted = () => {
        inputValue.val = metric.format(valueState.val);
    };

    van.derive(() => {
        valueState.val;
        if (!isFocused) syncInputToCommitted();
    });

    van.derive(() => {
        rowStatus.val = status.val;
    });

    const applyValue = async (rawValue = getNumberInputLiveRaw(inputValue) ?? inputValue.val) => {
        const nextValue = metric.normalize(rawValue);
        if (nextValue === null || nextValue === undefined || Number.isNaN(nextValue)) return;

        await run(async () => {
            await writeVerified(`${metric.path}[${caveIndex}]`, nextValue);
            valueState.val = nextValue;
            inputValue.val = metric.format(nextValue);
        });
    };

    return div(
        { class: "spelunking-cave-metric" },
        span({ class: "spelunking-cave-metric__label" }, metric.label),
        NumberInput({
            mode: metric.inputMode,
            value: inputValue,
            ...(metric.inputProps ?? {}),
            onfocus: () => {
                isFocused = true;
            },
            onblur: () => {
                isFocused = false;
                syncInputToCommitted();
            },
            onDecrement: () => {
                inputValue.val = String(
                    metric.adjust(getNumberInputLiveRaw(inputValue) ?? inputValue.val, -1, valueState.val)
                );
            },
            onIncrement: () => {
                inputValue.val = String(
                    metric.adjust(getNumberInputLiveRaw(inputValue) ?? inputValue.val, 1, valueState.val)
                );
            },
        }),
        ActionButton({
            label: "SET",
            status,
            onClick: (e) => {
                e.preventDefault();
                void applyValue();
            },
        })
    );
};

const CaveRow = ({ row, metricStates }) => {
    const rowStatus = van.state(null);

    return AccountRow({
        status: rowStatus,
        info: [
            span({ class: "account-row__index" }, `#${row.index + 1}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, row.name)
            ),
        ],
        badge: "CAVE",
        controlsClass: "account-row__controls--stack",
        controls: CAVE_METRICS.map((metric) =>
            CaveMetricControl({
                caveIndex: row.index,
                metric,
                valueState: getOrCreateState(metricStates[metric.id], row.index),
                rowStatus,
            })
        ),
    });
};

const DestroyedObjectRow = ({ row, onRemove }) =>
    RemovableStoredRow({
        index: row.index,
        primaryLabel: row.name,
        fallbackLabel: row.objectId,
        badge: row.knownCatalogMatch ? "DISCOVERED" : "UNKNOWN",
        nameGroupClass: "account-row__name-group",
        onRemove,
        isBusy: onRemove.isBusy,
    });

export function SpelunkingCavesTab() {
    const { loading, error, run } = useAccountLoad({ label: "Spelunking Caves" });
    const metricStates = {
        deepest: new Map(),
        haul: new Map(),
        discoveries: new Map(),
    };
    const caveRowsState = van.state([]);
    const storedObjectNames = van.state([]);
    const destroyedRows = van.state([]);
    const missingObjectOptions = van.state([]);
    const selectedObjectId = van.state("");
    const discoveredCount = van.state(0);
    const knownDiscoveredCount = van.state(0);
    const totalObjectCount = van.state(0);
    const mutating = van.state(false);
    const { status: addStatus, run: runAdd } = useWriteStatus();
    const caveListNode = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileCaveRows = createStaticRowReconciler(caveListNode);
    let caveNamesCache = [];
    let objectCatalogCache = [];
    let scrollEl = null;

    const withPreservedScroll = (fn) => {
        const prevTop = scrollEl?.scrollTop ?? 0;
        fn();
        requestAnimationFrame(() => {
            if (scrollEl) scrollEl.scrollTop = prevTop;
        });
    };

    const applyDestroyedObjects = (nextNames) => {
        const normalizedNames = normalizeStoredNames(nextNames);
        const result = buildDestroyedObjectState(normalizedNames, objectCatalogCache);

        storedObjectNames.val = normalizedNames;
        destroyedRows.val = result.rows;
        missingObjectOptions.val = result.missingOptions;
        discoveredCount.val = normalizedNames.length;
        knownDiscoveredCount.val = result.knownCount;
        totalObjectCount.val = objectCatalogCache.length;

        if (!result.missingOptions.some((entry) => entry.objectId === selectedObjectId.val)) {
            selectedObjectId.val = result.missingOptions[0]?.objectId ?? "";
        }
    };

    const reconcileCaves = () => {
        reconcileCaveRows(caveRowsState.val.map((row) => row.rawName).join("|"), () =>
            caveRowsState.val.map((row) => CaveRow({ row, metricStates }))
        );
    };

    const load = async () =>
        run(async () => {
            const [rawCaveNames, rawCaveDescriptions, rawObjectDefinitions] = await Promise.all([
                readCList("Spelunky[6]"),
                readCList("Spelunky[14]"),
                readCList("SpelunkRocks"),
            ]);
            caveNamesCache = normalizeCaveText(rawCaveNames);
            const caveDescriptions = normalizeCaveText(rawCaveDescriptions);
            objectCatalogCache = buildObjectCatalog(rawObjectDefinitions, caveNamesCache);
            caveRowsState.val = caveNamesCache
                .map((rawName, index) => ({
                    index,
                    rawName,
                    rawDescription: caveDescriptions[index],
                    name: cleanName(rawName, `Cave ${index + 1}`),
                }))
                .filter((row) => isMeaningfulCaveDefinition(row.rawName, row.rawDescription));
            reconcileCaves();

            const [rawDeepestLayers, rawBiggestHauls, rawGrandDiscoveries, rawDestroyedObjects] = await Promise.all([
                gga(DEEPEST_LAYERS_PATH),
                gga(BIGGEST_HAUL_PATH),
                gga(GRAND_DISCOVERIES_PATH),
                gga(DISCOVERED_OBJECTS_PATH),
            ]);
            const deepestLayers = toIndexedArray(rawDeepestLayers ?? []);
            const biggestHauls = toIndexedArray(rawBiggestHauls ?? []);
            const grandDiscoveries = toIndexedArray(rawGrandDiscoveries ?? []);

            for (const row of caveRowsState.val) {
                getOrCreateState(metricStates.deepest, row.index).val = toInt(deepestLayers[row.index], { min: 0 });
                getOrCreateState(metricStates.haul, row.index).val = resolveNumberInput(biggestHauls[row.index] ?? 0, {
                    formatted: true,
                    float: true,
                    min: 0,
                    fallback: 0,
                });
                getOrCreateState(metricStates.discoveries, row.index).val = Math.min(
                    10,
                    toInt(grandDiscoveries[row.index], { min: 0 })
                );
            }

            applyDestroyedObjects(rawDestroyedObjects);
        });

    const appendDestroyedObjects = async (currentNames, objectIds) => {
        const baseNames = normalizeStoredNames(currentNames);
        await writeManyVerified([
            ...objectIds.map((objectId, offset) => ({
                path: `${DISCOVERED_OBJECTS_PATH}[${baseNames.length + offset}]`,
                value: objectId,
            })),
            { path: `${DISCOVERED_OBJECTS_PATH}.length`, value: baseNames.length + objectIds.length },
        ]);
    };

    const removeObjectAtIndex = async (index) => {
        if (mutating.val) return;
        const currentNames = [...storedObjectNames.val];
        if (index < 0 || index >= currentNames.length) return;

        mutating.val = true;
        try {
            const nextNames = [...currentNames];
            nextNames.splice(index, 1);
            await writeVerified(DISCOVERED_OBJECTS_PATH, nextNames);
            withPreservedScroll(() => applyDestroyedObjects(nextNames));
        } finally {
            mutating.val = false;
        }
    };
    removeObjectAtIndex.isBusy = () => mutating.val;

    const addSelectedObject = async () => {
        const objectId = selectedObjectId.val;
        if (!objectId || mutating.val) return;

        await runAdd(async () => {
            mutating.val = true;
            try {
                const currentNames = [...storedObjectNames.val];
                if (currentNames.includes(objectId)) return;

                const nextNames = [...currentNames, objectId];
                await appendDestroyedObjects(currentNames, [objectId]);
                withPreservedScroll(() => applyDestroyedObjects(nextNames));
            } finally {
                mutating.val = false;
            }
        });
    };

    const addAllObjects = async () => {
        if (mutating.val || missingObjectOptions.val.length === 0) return;

        await runAdd(async () => {
            mutating.val = true;
            try {
                const currentNames = [...storedObjectNames.val];
                const toAdd = missingObjectOptions.val
                    .map((entry) => entry.objectId)
                    .filter((objectId) => !currentNames.includes(objectId));
                if (toAdd.length === 0) return;

                const nextNames = [...currentNames, ...toAdd];
                await appendDestroyedObjects(currentNames, toAdd);
                withPreservedScroll(() => applyDestroyedObjects(nextNames));
            } finally {
                mutating.val = false;
            }
        });
    };

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "CAVES",
            note: () => `${caveRowsState.val.length} CAVES`,
            body: caveListNode,
        }),
        AddFromListSection({
            title: "ADD DESTROYED OBJECT",
            note: () => `${missingObjectOptions.val.length} AVAILABLE TO ADD`,
            selectLabel: "SELECT OBJECT",
            selectedValue: selectedObjectId,
            options: missingObjectOptions,
            emptyOptionLabel: "No destroyed objects left to add",
            getOptionValue: (entry) => entry.objectId,
            getOptionLabel: (entry) => `${entry.caveName}: ${entry.name} (${entry.objectId})`,
            addStatus,
            addDisabled: () => mutating.val || !selectedObjectId.val || missingObjectOptions.val.length === 0,
            addAllDisabled: () => mutating.val || missingObjectOptions.val.length === 0,
            onAdd: addSelectedObject,
            onAddAll: addAllObjects,
        }),
        AccountSection({
            title: "DISCOVERED DESTROYED OBJECTS",
            note: () =>
                `${discoveredCount.val} DISCOVERED, ${knownDiscoveredCount.val}/${totalObjectCount.val} KNOWN OBJECTS`,
            body: () => {
                const rows = destroyedRows.val;
                return rows.length === 0
                    ? div({ class: "tab-empty" }, "No destroyed objects are currently discovered.")
                    : div(
                          { class: "account-item-stack account-item-stack--dense" },
                          ...rows.map((row) =>
                              DestroyedObjectRow({
                                  row,
                                  onRemove: removeObjectAtIndex,
                              })
                          )
                      );
            },
        })
    );
    scrollEl = body;

    load();

    return PersistentAccountListPage({
        title: "SPELUNKING CAVES",
        description:
            "Edit cave records from Spelunk[1], Spelunk[2], and Spelunk[44], and manage discovered destroyed objects from Spelunk[6].",
        actions: RefreshButton({
            onRefresh: () => {
                if (mutating.val) return;
                load();
            },
            disabled: () => loading.val || mutating.val,
        }),
        state: { loading, error },
        loadingText: "READING SPELUNKING CAVES",
        errorTitle: "SPELUNKING READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
}
