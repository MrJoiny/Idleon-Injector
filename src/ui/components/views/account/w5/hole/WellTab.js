import van from "../../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    adjustFormattedIntInput,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    toNum,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const WELL_ORE_NAMES = [
    "Gravel",
    "Goldust",
    "Redstone",
    "Mythril",
    "Cobaltine",
    "Bruntine",
    "Freezium",
    "Sweetium",
    "Rad Coral",
    "Hyper Coral",
];

const WellRow = ({ entry, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveNumberInput(rawValue, { formatted: true, min: 0, fallback: null }),
        write: (nextValue) => writeVerified(entry.path, nextValue),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) =>
            typeof entry.badge === "function" ? entry.badge(currentValue) : largeFormatter(currentValue ?? 0),
        adjustInput: (rawValue, delta, currentValue) =>
            adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 }),
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        inputProps: { formatter: largeFormatter, parser: largeParser },
    });

export const WellTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Well" });
    const barEntries = van.state([]);
    const oreEntries = van.state([]);
    const valueStates = new Map();
    const barsNode = div({ class: "account-item-stack" });
    const oresNode = div({ class: "account-item-stack" });
    const reconcileBars = createStaticRowReconciler(barsNode);
    const reconcileOres = createStaticRowReconciler(oresNode);

    const reconcile = (entries, reconciler) => {
        reconciler(entries.map((entry) => entry.key).join("|"), () =>
            entries.map((entry) => WellRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
        );
        for (const entry of entries) getOrCreateState(valueStates, entry.key).val = entry.value;
    };

    const load = async () =>
        run(async () => {
            const holes = await gga("Holes");
            const bars = toIndexedArray(toIndexedArray(holes)[8]);
            const ores = toIndexedArray(toIndexedArray(holes)[9]);
            barEntries.val = bars.map((value, index) => ({
                key: `well-bar-${index}`,
                index,
                name: `${WELL_ORE_NAMES[index] ?? `Ore ${index + 1}`} Bars Filled`,
                path: `Holes[8][${index}]`,
                value: toNum(value, 0),
                badge: (currentValue) => `LV ${currentValue ?? 0}`,
            }));
            oreEntries.val = WELL_ORE_NAMES.map((name, index) => ({
                key: `well-ore-${index}`,
                index,
                name,
                path: `Holes[9][${index}]`,
                value: toNum(ores[index], 0),
            }));
            reconcile(barEntries.val, reconcileBars);
            reconcile(oreEntries.val, reconcileOres);
        });

    load();

    return PersistentAccountListPage({
        title: "THE WELL",
        description: "Edit Well bars and ores from Holes[8] and Holes[9].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE WELL",
        errorTitle: "HOLE WELL READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "THE WELL",
                note: () => `${barEntries.val.length} ROWS`,
                body: barsNode,
            }),
            AccountSection({
                title: "ORES",
                note: () => `${oreEntries.val.length} ROWS`,
                body: oresNode,
            })
        ),
    });
};
