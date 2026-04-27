import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { cleanNameEffect, createStaticRowReconciler, getOrCreateState, toInt } from "../accountShared.js";

const { div, span } = van.tags;

const CORAL_LEVELS_PATH = "Spelunk[13]";
const CORAL_FIELDS = [
    { index: 0, name: "Brain Coral" },
    { index: 2, name: "Anemone Coral" },
    { index: 3, name: "Pillar Coral" },
    { index: 4, name: "Paragorgia Coral" },
];

const CoralRow = ({ entry, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `${CORAL_LEVELS_PATH}[${entry.index}]`,
        max: entry.maxLevel,
        integerMode: "round",
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                entry.description ? span({ class: "account-row__sub-label" }, entry.description) : null
            ),
        ],
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        maxAction: true,
    });

export const CoralTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Coral Reef" });
    const entriesState = van.state([]);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const buildEntries = (rawDefinitions) => {
        const definitions = toIndexedArray(rawDefinitions ?? []);

        return CORAL_FIELDS.map((field) => {
            const definition = toIndexedArray(definitions[field.index] ?? []);

            return {
                ...field,
                maxLevel: toInt(definition[1], { min: 0 }),
                description: cleanNameEffect(definition[0]),
            };
        });
    };

    const reconcileCoralRows = () => {
        reconcileRows(entriesState.val.map((entry) => entry.index).join("|"), () =>
            entriesState.val.map((entry) =>
                CoralRow({
                    entry,
                    levelState: getOrCreateState(levelStates, entry.index),
                })
            )
        );
    };

    const load = async () =>
        run(async () => {
            entriesState.val = buildEntries(await readCList("CoralReef"));
            reconcileCoralRows();

            const levels = toIndexedArray((await gga(CORAL_LEVELS_PATH)) ?? []);
            for (const entry of entriesState.val) {
                getOrCreateState(levelStates, entry.index).val = Math.min(
                    entry.maxLevel,
                    toInt(levels[entry.index], { min: 0 })
                );
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "CORAL LEVELS",
            note: () => `${entriesState.val.length} IMPLEMENTED CORALS`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "CORAL REEF",
        description: "Set W7 Coral Reef levels from Spelunk[13]. Max levels come from CoralReef definitions.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING CORAL REEF",
        errorTitle: "CORAL REEF READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
