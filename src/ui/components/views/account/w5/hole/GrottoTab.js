import van from "../../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { createStaticRowReconciler, getOrCreateState, toNum } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div } = van.tags;

const GROTTO_FIELDS = [
    { key: "colonies", index: 26, name: "Colonies Cleared" },
    { key: "current-gloomies", index: 27, name: "Current Gloomies Killed" },
    { key: "total-gloomies", index: 28, name: "Total Gloomies Killed" },
];

const GrottoRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry,
        valueState,
    });

export const GrottoTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Grotto" });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const holes = await gga("Holes");
            const stats = toIndexedArray(toIndexedArray(holes)[11]);
            entries.val = GROTTO_FIELDS.map((field) => ({
                key: `grotto-${field.key}`,
                index: field.index,
                name: field.name,
                path: `Holes[11][${field.index}]`,
                value: toNum(stats[field.index], 0),
            }));

            reconcileRows(entries.val.map((entry) => entry.key).join("|"), () =>
                entries.val.map((entry) => GrottoRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
            );

            for (const entry of entries.val) getOrCreateState(valueStates, entry.key).val = entry.value;
        });

    load();

    return PersistentAccountListPage({
        title: "GROTTO",
        description: "Edit Grotto clears and Gloomies from Holes[11].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE GROTTO",
        errorTitle: "HOLE GROTTO READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "GROTTO",
                note: () => `${entries.val.length} ROWS`,
                body: listNode,
            })
        ),
    });
};
