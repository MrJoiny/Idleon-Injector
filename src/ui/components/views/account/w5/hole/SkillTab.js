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

const SKILL_SECTIONS = [
    {
        key: "motherlode",
        title: "MOTHERLODE",
        fields: [
            { key: "current-ore", index: 0, name: "Current Ore Mined", path: "Holes[11][0]", group: 11 },
            { key: "layers", index: 1, name: "Layers Completed", path: "Holes[11][1]", group: 11 },
        ],
    },
    {
        key: "hive",
        title: "HIVE",
        fields: [
            { key: "current-bugs", index: 2, name: "Current Fractal Fly Bugs Caught", path: "Holes[11][2]", group: 11 },
            { key: "harvests", index: 3, name: "Harvests Completed", path: "Holes[11][3]", group: 11 },
        ],
    },
    {
        key: "evertree",
        title: "EVERTREE",
        fields: [
            { key: "everlog", index: 4, name: "Current Everlog Chopped", path: "Holes[11][4]", group: 11 },
            { key: "trunks", index: 5, name: "Trunks Whittled", path: "Holes[11][5]", group: 11 },
        ],
    },
    {
        key: "trench",
        title: "TRENCH",
        fields: [
            { key: "fish", index: 6, name: "Current Trench Fish Caught", path: "Holes[11][6]", group: 11 },
            { key: "layers", index: 7, name: "Fish Layers Completed", path: "Holes[11][7]", group: 11 },
        ],
    },
];

const SkillRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry,
        valueState,
    });

export const SkillTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Skill" });
    const sectionEntries = new Map(SKILL_SECTIONS.map((section) => [section.key, van.state([])]));
    const sectionNodes = new Map(SKILL_SECTIONS.map((section) => [section.key, div({ class: "account-item-stack" })]));
    const reconcilers = new Map(
        SKILL_SECTIONS.map((section) => [section.key, createStaticRowReconciler(sectionNodes.get(section.key))])
    );
    const valueStates = new Map();

    const load = async () =>
        run(async () => {
            const holes = await gga("Holes");

            for (const section of SKILL_SECTIONS) {
                const entries = section.fields.map((field) => ({
                    key: `${section.key}-${field.key}`,
                    index: field.index,
                    name: field.name,
                    path: field.path,
                    value: toNum(toIndexedArray(toIndexedArray(holes)[field.group])[field.index], 0),
                }));
                sectionEntries.get(section.key).val = entries;
                reconcilers.get(section.key)(entries.map((entry) => entry.key).join("|"), () =>
                    entries.map((entry) => SkillRow({ entry, valueState: getOrCreateState(valueStates, entry.key) }))
                );

                for (const entry of entries) getOrCreateState(valueStates, entry.key).val = entry.value;
            }
        });

    load();

    return PersistentAccountListPage({
        title: "SKILL",
        description: "Edit Motherlode, Hive, Evertree, and Trench counters from Holes[11].",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING HOLE SKILL",
        errorTitle: "HOLE SKILL READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            ...SKILL_SECTIONS.map((section) =>
                AccountSection({
                    title: section.title,
                    note: () => `${sectionEntries.get(section.key).val.length} ROWS`,
                    body: sectionNodes.get(section.key),
                })
            )
        ),
    });
};
