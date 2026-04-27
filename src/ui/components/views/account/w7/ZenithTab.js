import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    adjustFormattedIntInput,
    cleanName,
    cleanNameEffect,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveFormattedIntInput,
    toInt,
    writeVerified,
} from "../accountShared.js";

const { div, span } = van.tags;

const ZENITH_LEVELS_PATH = "Spelunk[45]";
const ZENITH_CLUSTERS_PATH = "OptionsListAccount[486]";

const ZenithRow = ({ entry, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `${ZENITH_LEVELS_PATH}[${entry.index}]`,
        max: entry.maxLevel,
        integerMode: "round",
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                entry.effect ? span({ class: "account-row__sub-label" }, entry.effect) : null
            ),
        ],
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        maxAction: true,
    });

const ZenithClustersRow = ({ valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveFormattedIntInput(rawValue, null, { min: 0 }),
        write: async (nextValue) => writeVerified(ZENITH_CLUSTERS_PATH, nextValue),
        renderInfo: () => [
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, "Zenith Clusters"),
                span({ class: "account-row__sub-label" }, "Currency for Zenith Market upgrades")
            ),
        ],
        renderBadge: (currentValue) => largeFormatter(currentValue ?? 0),
        adjustInput: (rawValue, delta, currentValue) =>
            adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 }),
        controlsClass: "account-row__controls--xl",
        inputProps: {
            formatter: largeFormatter,
            parser: largeParser,
        },
    });

export const ZenithTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Zenith" });
    const entriesState = van.state([]);
    const clusterState = van.state(0);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const buildEntries = (rawDefinitions) =>
        toIndexedArray(rawDefinitions ?? [])
            .map((rawDefinition, index) => {
                const definition = toIndexedArray(rawDefinition ?? []);
                const rawName = String(definition[0] ?? "").trim();
                if (!rawName) return null;

                return {
                    index,
                    rawName,
                    name: cleanName(rawName, `Zenith ${index}`),
                    maxLevel: toInt(definition[3], { min: 0 }),
                    effect: cleanNameEffect(definition[6]),
                };
            })
            .filter(Boolean);

    const reconcileZenithRows = () => {
        reconcileRows(entriesState.val.map((entry) => entry.rawName).join("|"), () =>
            entriesState.val.map((entry) =>
                ZenithRow({
                    entry,
                    levelState: getOrCreateState(levelStates, entry.index),
                })
            )
        );
    };

    const load = async () =>
        run(async () => {
            entriesState.val = buildEntries(await readCList("ZenithMarket"));
            reconcileZenithRows();

            const [rawLevels, rawClusters] = await Promise.all([gga(ZENITH_LEVELS_PATH), gga(ZENITH_CLUSTERS_PATH)]);
            const levels = toIndexedArray(rawLevels ?? []);
            clusterState.val = toInt(rawClusters, { min: 0 });
            for (const entry of entriesState.val) {
                getOrCreateState(levelStates, entry.index).val = Math.min(
                    entry.maxLevel,
                    toInt(levels[entry.index], { min: 0 })
                );
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "CURRENCY",
            note: "OptionsListAccount[486]",
            body: div({ class: "account-item-stack" }, ZenithClustersRow({ valueState: clusterState })),
        }),
        AccountSection({
            title: "ZENITH UPGRADES",
            note: () => `${entriesState.val.length} MARKET UPGRADES`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "ZENITH",
        description: "Set W7 Zenith market levels from Spelunk[45]. Max levels come from ZenithMarket definitions.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING ZENITH",
        errorTitle: "ZENITH READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
