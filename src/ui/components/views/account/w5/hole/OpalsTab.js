import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toNum } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div } = van.tags;

const OpalRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry,
        valueState,
    });

export const OpalsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Opals" });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [holes, caves] = await Promise.all([gga("Holes"), readCList("HolesInfo[68]")]);
            const values = toIndexedArray(toIndexedArray(holes)[7]);
            const names = toIndexedArray(caves ?? []);
            entries.val = values
                .map((value, index) => {
                    const name = cleanName(names[index], "");
                    if (!name || name.toLowerCase() === "bruh") return null;
                    return {
                        key: `opal-${index}`,
                        index,
                        name,
                        path: `Holes[7][${index}]`,
                        value: toNum(value, 0),
                    };
                })
                .filter(Boolean);

            reconcileRows(entries.val.map((entry) => entry.key).join("|"), () =>
                entries.val.map((entry) => OpalRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
            );
            for (const entry of entries.val) getOrCreateState(valueStates, entry.key).val = entry.value;
        });

    load();

    return PersistentAccountListPage({
        title: "OPALS",
        description: "Edit opals found per cavern from Holes[7].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE OPALS",
        errorTitle: "HOLE OPALS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "OPALS FOUND",
                note: () => `${entries.val.length} ROWS`,
                body: listNode,
            })
        ),
    });
};
