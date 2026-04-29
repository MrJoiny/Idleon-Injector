import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    adjustFormattedIntInput,
    cleanNameEffect,
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

const BellRow = ({ entry, valueState }) =>
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

const buildImprovementEntries = (holes, improvements) => {
    const values = toIndexedArray(toIndexedArray(holes)[16]);
    return toIndexedArray(improvements ?? [])
        .map((rawName, index) => {
            const name = cleanNameEffect(rawName, "");
            if (!name) return null;
            return {
                key: `bell-improvement-${index}`,
                index,
                name,
                path: `Holes[16][${index}]`,
                value: toNum(values[index], 0),
            };
        })
        .filter(Boolean);
};

const buildRandomEntries = (holes, randomBonuses) => {
    const values = toIndexedArray(toIndexedArray(holes)[17]);
    const names = toIndexedArray(randomBonuses ?? []);
    return Array.from({ length: Math.floor(names.length / 2) }, (_, index) => {
        const effect = cleanNameEffect(names[index * 2], "");
        if (!effect) return null;
        return {
            key: `bell-random-${index}`,
            index,
            name: effect,
            path: `Holes[17][${index}]`,
            value: toNum(values[index], 0),
            badge: (currentValue) => `LV ${currentValue ?? 0}`,
        };
    }).filter(Boolean);
};

export const BellTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Bell" });
    const improvementEntries = van.state([]);
    const randomEntries = van.state([]);
    const valueStates = new Map();
    const improvementNode = div({ class: "account-item-stack" });
    const randomNode = div({ class: "account-item-stack" });
    const reconcileImprovements = createStaticRowReconciler(improvementNode);
    const reconcileRandom = createStaticRowReconciler(randomNode);

    const reconcile = (entries, reconciler) => {
        reconciler(entries.map((entry) => entry.key).join("|"), () =>
            entries.map((entry) => BellRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
        );
        for (const entry of entries) getOrCreateState(valueStates, entry.key).val = entry.value;
    };

    const load = async () =>
        run(async () => {
            const [holes, randomBonuses, improvements] = await Promise.all([
                gga("Holes"),
                readCList("HolesInfo[59]"),
                readCList("HolesInfo[60]"),
            ]);
            improvementEntries.val = buildImprovementEntries(holes, improvements);
            randomEntries.val = buildRandomEntries(holes, randomBonuses);
            reconcile(improvementEntries.val, reconcileImprovements);
            reconcile(randomEntries.val, reconcileRandom);
        });

    load();

    return PersistentAccountListPage({
        title: "THE BELL",
        description: "Edit Bell improvement methods and random bonus levels from Holes[16] and Holes[17].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE BELL",
        errorTitle: "HOLE BELL READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "IMPROVEMENT METHODS",
                note: () => `${improvementEntries.val.length} ROWS`,
                body: improvementNode,
            }),
            AccountSection({
                title: "RANDOM BONUSES",
                note: () => `${randomEntries.val.length} ROWS`,
                body: randomNode,
            })
        ),
    });
};
