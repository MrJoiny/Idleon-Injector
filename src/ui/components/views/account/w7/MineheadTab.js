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

const MINEHEAD_STATS_PATH = "Research[7]";
const MINEHEAD_UPGRADES_PATH = "Research[8]";
const MINEHEAD_STATS = [
    { id: "tries", index: 8, label: "Tries Left", mode: "int" },
    { id: "currency", index: 5, label: "Minehead Currency", mode: "currency" },
    { id: "opponents", index: 4, label: "Opponents Beaten", mode: "int" },
];

const MineheadStatRow = ({ stat, valueState }) => {
    const isCurrency = stat.mode === "currency";

    return EditableNumberRow({
        valueState,
        normalize: (rawValue) =>
            isCurrency ? resolveFormattedIntInput(rawValue, null, { min: 0 }) : toInt(rawValue, { min: 0 }),
        write: async (nextValue) => writeVerified(`${MINEHEAD_STATS_PATH}[${stat.index}]`, nextValue),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${stat.index}`),
            span({ class: "account-row__name" }, stat.label),
        ],
        renderBadge: (currentValue) => (isCurrency ? largeFormatter(currentValue ?? 0) : String(currentValue ?? 0)),
        adjustInput: (rawValue, delta, currentValue) =>
            isCurrency
                ? adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 })
                : Math.max(0, toInt(rawValue, currentValue ?? 0) + delta),
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        inputProps: isCurrency
            ? {
                  formatter: largeFormatter,
                  parser: largeParser,
              }
            : {},
    });
};

const MineheadUpgradeRow = ({ entry, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `${MINEHEAD_UPGRADES_PATH}[${entry.index}]`,
        max: entry.maxLevel,
        integerMode: "round",
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                entry.description ? span({ class: "account-row__sub-label" }, entry.description) : null
            ),
        ],
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        maxAction: true,
    });

export const MineheadTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Minehead" });
    const statStates = new Map(MINEHEAD_STATS.map((stat) => [stat.id, van.state(0)]));
    const upgradeEntries = van.state([]);
    const upgradeStates = new Map();
    const upgradeListNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(upgradeListNode);

    const buildUpgradeEntries = (rawDefinitions) =>
        toIndexedArray(rawDefinitions ?? [])
            .map((rawDefinition, index) => {
                const definition = toIndexedArray(rawDefinition ?? []);
                const rawName = String(definition[0] ?? "").trim();
                if (!rawName) return null;

                return {
                    index,
                    rawName,
                    name: cleanName(rawName, `Minehead ${index}`),
                    maxLevel: toInt(definition[1], { min: 0 }),
                    description: cleanNameEffect(definition[5]),
                };
            })
            .filter(Boolean);

    const reconcileUpgradeRows = () => {
        reconcileRows(upgradeEntries.val.map((entry) => entry.rawName).join("|"), () =>
            upgradeEntries.val.map((entry) =>
                MineheadUpgradeRow({
                    entry,
                    levelState: getOrCreateState(upgradeStates, entry.index),
                })
            )
        );
    };

    const load = async () =>
        run(async () => {
            upgradeEntries.val = buildUpgradeEntries(await readCList("MineheadUPG"));
            reconcileUpgradeRows();

            const [rawStats, rawLevels] = await Promise.all([gga(MINEHEAD_STATS_PATH), gga(MINEHEAD_UPGRADES_PATH)]);
            const stats = toIndexedArray(rawStats ?? []);
            const levels = toIndexedArray(rawLevels ?? []);

            for (const stat of MINEHEAD_STATS) {
                statStates.get(stat.id).val =
                    stat.mode === "currency" ? Number(stats[stat.index] ?? 0) : toInt(stats[stat.index], { min: 0 });
            }

            for (const entry of upgradeEntries.val) {
                getOrCreateState(upgradeStates, entry.index).val = Math.min(
                    entry.maxLevel,
                    toInt(levels[entry.index], { min: 0 })
                );
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "MINEHEAD STATS",
            note: "Research[7]",
            body: div(
                { class: "account-item-stack" },
                ...MINEHEAD_STATS.map((stat) =>
                    MineheadStatRow({
                        stat,
                        valueState: statStates.get(stat.id),
                    })
                )
            ),
        }),
        AccountSection({
            title: "MINEHEAD UPGRADES",
            note: () => `${upgradeEntries.val.length} UPGRADES`,
            body: upgradeListNode,
        })
    );

    return PersistentAccountListPage({
        title: "MINEHEAD",
        description: "Set Minehead stats from Research[7] and upgrade levels from Research[8].",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING MINEHEAD",
        errorTitle: "MINEHEAD READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
