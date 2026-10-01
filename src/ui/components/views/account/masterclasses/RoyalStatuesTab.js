import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { SimpleNumberRow } from "../SimpleNumberRow.js";
import { cleanName, createStaticRowReconciler, getOrCreateState } from "../accountShared.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";

const { div } = van.tags;
const ROYAL_STATUE_COUNT = 7;

/**
 * Edit the seven selectable Royal Statue levels.
 * @returns {HTMLElement} Persistent account editor page.
 */
export const RoyalStatuesTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Royal Statues" });
    const royalStates = new Map();
    const royalList = div({ class: "account-item-stack" });
    const reconcileRoyalRows = createStaticRowReconciler(royalList);

    const load = async () =>
        run(async () => {
            const [rawRoyalNames, rawRoyalLevels] = await Promise.all([readCList("Research[40]"), gga("RoyalG[0]")]);
            const royalLevels = toIndexedArray(rawRoyalLevels);
            const royalEntries = toIndexedArray(rawRoyalNames)
                .slice(0, ROYAL_STATUE_COUNT)
                .map((rawName, index) => {
                    const name = cleanName(String(rawName).replace(/^.*千/, ""));
                    return { index, name: /^\d+$/.test(name) ? `Royal Statue ${index + 1}` : name };
                })
                .filter((entry) => entry.name && entry.index < royalLevels.length);

            reconcileRoyalRows(royalEntries.map((entry) => `${entry.index}:${entry.name}`).join("|"), () =>
                royalEntries.map((entry) =>
                    SimpleNumberRow({
                        entry: {
                            ...entry,
                            path: `RoyalG[0][${entry.index}]`,
                            formatted: false,
                            max: Number.MAX_SAFE_INTEGER,
                            badge: (level) => (level > 0 ? `LV ${level}` : "LOCKED"),
                        },
                        valueState: getOrCreateState(royalStates, entry.index),
                    })
                )
            );
            for (const entry of royalEntries) {
                getOrCreateState(royalStates, entry.index).val = Number(royalLevels[entry.index]);
            }
        });

    load();

    return PersistentAccountListPage({
        title: "ROYAL STATUES",
        description: "Set Royal Statue levels.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        topNotices: WarningBanner("Royal level 0 locks a statue; level 1 unlocks it."),
        state: { loading, error },
        loadingText: "READING ROYAL STATUES",
        errorTitle: "ROYAL STATUES READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({ title: "ROYAL STATUES", body: royalList })
        ),
    });
};
