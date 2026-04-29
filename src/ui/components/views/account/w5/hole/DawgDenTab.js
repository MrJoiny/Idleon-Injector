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

const DawgDenRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry,
        valueState,
    });

export const DawgDenTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Dawg Den" });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const holes = await gga("Holes");
            const stats = toIndexedArray(toIndexedArray(holes)[11]);
            entries.val = [
                {
                    key: "dawg-den-highscore",
                    index: 8,
                    name: "Highscore",
                    path: "Holes[11][8]",
                    value: toNum(stats[8], 0),
                },
            ];

            reconcileRows(entries.val.map((entry) => entry.key).join("|"), () =>
                entries.val.map((entry) =>
                    DawgDenRow({
                        entry,
                        valueState: getOrCreateState(valueStates, entry.key),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(valueStates, entry.key).val = entry.value;
            }
        });

    load();

    return PersistentAccountListPage({
        title: "DAWG DEN",
        description: "Edit Dawg Den highscore from Holes[11][8].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE DAWG DEN",
        errorTitle: "HOLE DAWG DEN READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "DAWG DEN",
                note: () => `${entries.val.length} ROWS`,
                body: listNode,
            })
        ),
    });
};
