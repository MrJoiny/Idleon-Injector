import van from "../../../../vendor/van-1.6.0.js";
import { SimpleNumberRow } from "../SimpleNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { createStaticRowReconciler, getOrCreateState } from "../accountShared.js";
import { RefreshButton } from "./AccountPageChrome.js";
import { AccountSection } from "./AccountSection.js";
import { PersistentAccountListPage } from "./PersistentAccountListPage.js";

const { div } = van.tags;

/**
 * Single-section numeric lists. Loaders return SimpleNumberRow entries with a
 * stable key and value; row definitions stay fixed for a given key.
 */
export const SimpleAccountListPage = ({ title, description, label, sectionTitle = title, loadEntries }) => {
    const { loading, error, run } = useAccountLoad({ label });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = () =>
        run(async () => {
            entries.val = await loadEntries();
            reconcileRows(entries.val.map((entry) => entry.key).join("|"), () =>
                entries.val.map((entry) =>
                    SimpleNumberRow({ entry, valueState: getOrCreateState(valueStates, entry.key) })
                )
            );
            for (const entry of entries.val) getOrCreateState(valueStates, entry.key).val = entry.value;
        });

    load();

    return PersistentAccountListPage({
        title,
        description,
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: `READING ${label.toUpperCase()}`,
        errorTitle: `${label.toUpperCase()} READ FAILED`,
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: sectionTitle,
                note: () => `${entries.val.length} ROWS`,
                body: listNode,
            })
        ),
    });
};
