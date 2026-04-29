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

const MeasureRow = ({ entry, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveNumberInput(rawValue, { formatted: true, min: 0, fallback: null }),
        write: (nextValue) => writeVerified(entry.path, nextValue),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0}`,
        adjustInput: (rawValue, delta, currentValue) =>
            adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 }),
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        inputProps: { formatter: largeFormatter, parser: largeParser },
    });

export const MeasureTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Measure" });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [holes, effects] = await Promise.all([gga("Holes"), readCList("HolesInfo[54]")]);
            const values = toIndexedArray(toIndexedArray(holes)[22]);
            const names = toIndexedArray(effects ?? []);
            entries.val = values
                .map((value, index) => {
                    const name = cleanNameEffect(names[index], "")
                        .replace(/\u8bbf/g, "&")
                        .trim();
                    if (!name) return null;
                    return {
                        key: `measure-${index}`,
                        index,
                        name,
                        path: `Holes[22][${index}]`,
                        value: toNum(value, 0),
                    };
                })
                .filter(Boolean);

            reconcileRows(entries.val.map((entry) => entry.key).join("|"), () =>
                entries.val.map((entry) => MeasureRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
            );

            for (const entry of entries.val) getOrCreateState(valueStates, entry.key).val = entry.value;
        });

    load();

    return PersistentAccountListPage({
        title: "MEASURE",
        description: "Edit Villager Measure upgrade levels from Holes[22].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE MEASURE",
        errorTitle: "HOLE MEASURE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "MEASURE UPGRADES",
                note: () => `${entries.val.length} ROWS`,
                body: listNode,
            })
        ),
    });
};
