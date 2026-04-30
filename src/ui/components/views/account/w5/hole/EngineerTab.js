import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    toNum,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountToggleRow } from "../../components/AccountToggleRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const buildEngineerEntries = (holes, buildings, order) => {
    const values = toIndexedArray(toIndexedArray(holes)[13]);
    const buildingRows = toIndexedArray(buildings ?? []);
    const rawOrder = toIndexedArray(order ?? []);
    const numericOrder = new Map(rawOrder.map((value, sortIndex) => [Number(value), sortIndex]));
    const nameOrder = new Map(rawOrder.map((value, sortIndex) => [cleanName(value), sortIndex]));
    const count = Math.max(values.length, buildingRows.length);

    return Array.from({ length: count }, (_, index) => {
        const building = toIndexedArray(buildingRows[index] ?? []);
        const name = cleanName(building[0]);
        if (!name) return null;

        return {
            key: `schematic-${index}`,
            index,
            name,
            path: `Holes[13][${index}]`,
            unlocked: toNum(values[index], 0) > 0 ? 1 : 0,
        };
    })
        .filter(Boolean)
        .sort((a, b) => {
            const aOrder = numericOrder.get(a.index) ?? nameOrder.get(a.name) ?? a.index + 10000;
            const bOrder = numericOrder.get(b.index) ?? nameOrder.get(b.name) ?? b.index + 10000;
            return aOrder - bOrder;
        });
};

const EngineerRow = ({ entry, unlockedState }) => {
    const writeToggle = async (enabled) => {
        const nextValue = enabled ? 1 : 0;
        const verified = await writeVerified(entry.path, nextValue);
        unlockedState.val = verified ? 1 : 0;
    };

    return AccountToggleRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => (unlockedState.val ? "UNLOCKED" : "LOCKED"),
        checked: () => Boolean(unlockedState.val),
        title: "Toggle schematic unlock",
        write: writeToggle,
    });
};

export const EngineerTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Engineer" });
    const entries = van.state([]);
    const unlockedStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [holes, [buildings, order]] = await Promise.all([
                gga("Holes"),
                Promise.all([readCList("HolesBuildings"), readCList("HolesInfo[40]")]),
            ]);
            entries.val = buildEngineerEntries(holes, buildings, order);
            reconcileRows(entries.val.map((entry) => `${entry.key}:${entry.name}`).join("|"), () =>
                entries.val.map((entry) =>
                    EngineerRow({
                        entry,
                        unlockedState: getOrCreateState(unlockedStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(unlockedStates, entry.index).val = entry.unlocked;
            }
        });

    load();

    return PersistentAccountListPage({
        title: "ENGINEER",
        description: "Toggle Engineer schematic unlock flags from Holes[13].",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING HOLE ENGINEER",
        errorTitle: "HOLE ENGINEER READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "SCHEMATICS",
                note: () => `${entries.val.length} SCHEMATICS`,
                body: listNode,
            })
        ),
    });
};
