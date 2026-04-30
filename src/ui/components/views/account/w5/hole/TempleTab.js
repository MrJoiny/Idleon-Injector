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

const TEMPLE_FIELDS = [
    { index: 55, name: "Centurions Killed" },
    { index: 56, name: "Current Torches" },
    { index: 57, name: "Illuminate Upgrades Purchased" },
    { index: 58, name: "Search Upgrade Level" },
    { index: 59, name: "Amplify Upgrades Purchased" },
    { index: 63, name: "Total Golems Killed" },
];

const TempleRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry,
        valueState,
    });

export const TempleTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Temple" });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const holes = await gga("Holes");
            const stats = toIndexedArray(toIndexedArray(holes)[11]);
            entries.val = TEMPLE_FIELDS.map((field) => ({
                key: `temple-${field.index}`,
                index: field.index,
                name: field.name,
                path: `Holes[11][${field.index}]`,
                value: toNum(stats[field.index], 0),
            }));

            reconcileRows(entries.val.map((entry) => entry.key).join("|"), () =>
                entries.val.map((entry) => TempleRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
            );

            for (const entry of entries.val) getOrCreateState(valueStates, entry.key).val = entry.value;
        });

    load();

    return PersistentAccountListPage({
        title: "TEMPLE",
        description: "Edit Temple counters from Holes[11].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE TEMPLE",
        errorTitle: "HOLE TEMPLE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "THE TEMPLE",
                note: () => `${entries.val.length} ROWS`,
                body: listNode,
            })
        ),
    });
};
