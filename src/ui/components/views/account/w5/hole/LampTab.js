import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    toNum,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div } = van.tags;

const LampRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry,
        valueState,
    });

export const LampTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Lamp" });
    const bonusEntries = van.state([]);
    const wishEntries = van.state([]);
    const valueStates = new Map();
    const bonusNode = div({ class: "account-item-stack" });
    const wishNode = div({ class: "account-item-stack" });
    const reconcileBonusRows = createStaticRowReconciler(bonusNode);
    const reconcileWishRows = createStaticRowReconciler(wishNode);

    const load = async () =>
        run(async () => {
            const [holes, wishes] = await Promise.all([gga("Holes"), readCList("LampWishes")]);
            const lampBonuses = toIndexedArray(toIndexedArray(holes)[11]);
            bonusEntries.val = [
                {
                    key: "lamp-bonuses-unlocked",
                    index: 24,
                    name: "Current Bonuses Unlocked",
                    path: "Holes[11][24]",
                    value: toNum(lampBonuses[24], 0),
                    max: 11,
                },
            ];

            const wishValues = toIndexedArray(toIndexedArray(holes)[21]);
            wishEntries.val = toIndexedArray(wishes ?? [])
                .map((rawWish, index) => {
                    const wish = toIndexedArray(rawWish ?? []);
                    const name = cleanName(wish[0]);
                    if (!name) return null;
                    return {
                        key: `lamp-wish-${index}`,
                        index,
                        name,
                        path: `Holes[21][${index}]`,
                        value: toNum(wishValues[index], 0),
                    };
                })
                .filter(Boolean);

            reconcileBonusRows(bonusEntries.val.map((entry) => entry.key).join("|"), () =>
                bonusEntries.val.map((entry) =>
                    LampRow({ entry, valueState: getOrCreateState(valueStates, entry.key) })
                )
            );
            reconcileWishRows(wishEntries.val.map((entry) => `${entry.key}:${entry.name}`).join("|"), () =>
                wishEntries.val.map((entry) => LampRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
            );

            for (const entry of [...bonusEntries.val, ...wishEntries.val]) {
                getOrCreateState(valueStates, entry.key).val = entry.value;
            }
        });

    load();

    return PersistentAccountListPage({
        title: "THE LAMP",
        description: "Edit Lamp wishes and unlocked bonus count from Holes[21] and Holes[11][24].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE LAMP",
        errorTitle: "HOLE LAMP READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "LAMP BONUSES",
                note: () => `${bonusEntries.val.length} ROWS`,
                body: bonusNode,
            }),
            AccountSection({
                title: "WISHES",
                note: () => `${wishEntries.val.length} WISHES`,
                body: wishNode,
            })
        ),
    });
};
