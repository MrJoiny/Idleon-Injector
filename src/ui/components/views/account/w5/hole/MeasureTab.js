import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { cleanNameEffect, createStaticRowReconciler, getOrCreateState, toNum } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div } = van.tags;

const MeasureRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry,
        valueState,
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
                        badge: (currentValue) => `LV ${currentValue ?? 0}`,
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
