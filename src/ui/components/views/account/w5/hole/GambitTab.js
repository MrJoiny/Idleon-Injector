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

const GAMBIT_FIELDS = [
    { index: 65, name: "King's Gambit Time" },
    { index: 66, name: "Horsey's Gambit Time" },
    { index: 67, name: "Bishop's Gambit Time" },
    { index: 68, name: "Queen's Gambit Time" },
    { index: 69, name: "Castle's Gambit Time" },
    { index: 70, name: "Noob's Gambit Time" },
];

const GambitRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry,
        valueState,
    });

export const GambitTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Gambit" });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const holes = await gga("Holes");
            const stats = toIndexedArray(toIndexedArray(holes)[11]);
            entries.val = GAMBIT_FIELDS.map((field) => ({
                key: `gambit-${field.index}`,
                index: field.index,
                name: field.name,
                path: `Holes[11][${field.index}]`,
                value: toNum(stats[field.index], 0),
            }));

            reconcileRows(entries.val.map((entry) => entry.key).join("|"), () =>
                entries.val.map((entry) => GambitRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
            );

            for (const entry of entries.val) getOrCreateState(valueStates, entry.key).val = entry.value;
        });

    load();

    return PersistentAccountListPage({
        title: "GAMBIT",
        description: "Edit Gambit times from Holes[11][65] through Holes[11][70].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE GAMBIT",
        errorTitle: "HOLE GAMBIT READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "THE GAMBIT",
                note: () => `${entries.val.length} ROWS`,
                body: listNode,
            })
        ),
    });
};
