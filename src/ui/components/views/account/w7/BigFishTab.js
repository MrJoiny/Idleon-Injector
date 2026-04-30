import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    toInt,
    writeVerified,
} from "../accountShared.js";

const { div, span } = van.tags;

const BIG_FISH_LEVELS_PATH = "Spelunk[11]";

const splitDefinition = (rawDefinition) =>
    Array.isArray(rawDefinition) ? toIndexedArray(rawDefinition ?? []) : String(rawDefinition ?? "").split(",");

const BigFishRow = ({ entry, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) => toInt(rawValue, { min: 0 }),
        write: async (nextValue) => writeVerified(`${BIG_FISH_LEVELS_PATH}[${entry.index}]`, nextValue),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name)
            ),
        ],
        renderBadge: (currentValue) => `LV ${toInt(currentValue, { min: 0 })}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        adjustInput: (rawValue, delta, currentValue) => Math.max(0, toInt(rawValue, currentValue ?? 0) + delta),
    });

export const BigFishTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Big Fish" });
    const entriesState = van.state([]);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const buildEntries = (rawDefinitions) =>
        toIndexedArray(rawDefinitions ?? [])
            .map((rawDefinition, index) => {
                const definition = splitDefinition(rawDefinition);
                const rawName = String(definition[0] ?? "").trim();
                if (!rawName) return null;

                return {
                    index,
                    rawName,
                    name: cleanName(rawName, `Big Fish ${index}`),
                };
            })
            .filter(Boolean);

    const reconcileBigFishRows = () => {
        reconcileRows(entriesState.val.map((entry) => entry.rawName).join("|"), () =>
            entriesState.val.map((entry) =>
                BigFishRow({
                    entry,
                    levelState: getOrCreateState(levelStates, entry.index),
                })
            )
        );
    };

    const load = async () =>
        run(async () => {
            entriesState.val = buildEntries(await readCList("Spelunky[18]"));
            reconcileBigFishRows();

            const levels = toIndexedArray((await gga(BIG_FISH_LEVELS_PATH)) ?? []);
            for (const entry of entriesState.val) {
                getOrCreateState(levelStates, entry.index).val = toInt(levels[entry.index], { min: 0 });
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "NPC BONUSES",
            note: () => `${entriesState.val.length} BIG FISH BONUSES`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "BIG FISH",
        description: "Set Big Fish NPC bonus levels from Spelunk[11]. Names and bonuses come from Spelunky[18].",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING BIG FISH",
        errorTitle: "BIG FISH READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
