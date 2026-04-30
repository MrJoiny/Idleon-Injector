import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { InlineEditableNumberField } from "../../components/InlineEditableNumberField.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toNum } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const buildVillagerEntries = (holes, rawNames) => {
    const names = toIndexedArray(rawNames ?? []);
    const levels = toIndexedArray(toIndexedArray(holes)[1]);
    const xp = toIndexedArray(toIndexedArray(holes)[2]);
    const opals = toIndexedArray(toIndexedArray(holes)[3]);
    const count = Math.max(names.length, levels.length, xp.length, opals.length);

    return Array.from({ length: count }, (_, index) => ({
        index,
        key: `villager-${index}`,
        name: cleanName(String(names[index] ?? `Villager ${index + 1}`).split("_@___@_")[0], `Villager ${index + 1}`),
        fields: {
            level: { key: `villager-${index}-level`, path: `Holes[1][${index}]`, value: toNum(levels[index], 0) },
            xp: { key: `villager-${index}-xp`, path: `Holes[2][${index}]`, value: toNum(xp[index], 0) },
            opals: { key: `villager-${index}-opals`, path: `Holes[3][${index}]`, value: toNum(opals[index], 0) },
        },
    }));
};

const VillagerRow = ({ entry, valueStates }) =>
    AccountRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => `LV ${getOrCreateState(valueStates, entry.fields.level.key).val ?? 0}`,
        controlsClass: "account-row__controls--stack",
        controls: [
            InlineEditableNumberField({
                label: "Level",
                valueState: getOrCreateState(valueStates, entry.fields.level.key),
                path: entry.fields.level.path,
            }),
            InlineEditableNumberField({
                label: "XP",
                valueState: getOrCreateState(valueStates, entry.fields.xp.key),
                path: entry.fields.xp.path,
            }),
            InlineEditableNumberField({
                label: "Opals Given",
                valueState: getOrCreateState(valueStates, entry.fields.opals.key),
                path: entry.fields.opals.path,
            }),
        ],
    });

export const VillagersTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Villagers" });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [holes, names] = await Promise.all([gga("Holes"), readCList("HolesInfo[20]")]);
            entries.val = buildVillagerEntries(holes, names);
            reconcileRows(entries.val.map((entry) => `${entry.key}:${entry.name}`).join("|"), () =>
                entries.val.map((entry) => VillagerRow({ entry, valueStates }))
            );

            for (const entry of entries.val) {
                for (const field of Object.values(entry.fields)) {
                    getOrCreateState(valueStates, field.key).val = field.value;
                }
            }
        });

    load();

    return PersistentAccountListPage({
        title: "VILLAGERS",
        description: "Edit villager levels, XP, and opals from Holes[1], Holes[2], and Holes[3].",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING HOLE VILLAGERS",
        errorTitle: "HOLE VILLAGERS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "VILLAGERS",
                note: () => `${entries.val.length} VILLAGERS`,
                body: listNode,
            })
        ),
    });
};
