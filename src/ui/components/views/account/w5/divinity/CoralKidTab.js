import van from "../../../../../vendor/van-1.6.0.js";
import { readCList, readGgaEntries } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanNameEffect,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    toInt,
    writeManyVerified,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountToggleRow } from "../../components/AccountToggleRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const UNLOCK_OPTION_KEYS = [426, 433];
const CORAL_KID_FIELDS = [
    { index: 427, name: "Divinity XP Bonus Level", descriptionIndex: 0 },
    { index: 428, name: "Max Blessing Level", descriptionIndex: 1 },
    { index: 429, name: "God Rank Class XP Level", descriptionIndex: 2 },
    { index: 430, name: "Divinity Minor Link Bonus Level", descriptionIndex: 3 },
    { index: 431, name: "Divinity Pts Coral Reef Bonus Level", descriptionIndex: 4 },
    { index: 432, name: "Daily Coral Reef Bonus Level", descriptionIndex: 5 },
];

const UnlockRow = ({ unlockedState }) => {
    const writeToggle = async (enabled) => {
        const nextValue = enabled ? 1 : 0;
        await writeManyVerified(
            UNLOCK_OPTION_KEYS.map((index) => ({ path: `OptionsListAccount[${index}]`, value: nextValue }))
        );
        unlockedState.val = nextValue;
    };

    return AccountToggleRow({
        info: [
            span({ class: "account-row__index" }, "426+433"),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, "Coral Kid Unlock"),
                span({ class: "account-row__sub-label" }, "NPC unlock and secret W5 move flag")
            ),
        ],
        badge: () => (unlockedState.val ? "UNLOCKED" : "LOCKED"),
        rowClass: "divinity-toggle-row",
        checked: () => Boolean(unlockedState.val),
        title: "Toggle Coral Kid unlock and secret unlock",
        write: writeToggle,
    });
};

const CoralKidLevelRow = ({ entry, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                min: 0,
                fallback: null,
            }),
        write: (nextLevel) => writeVerified(`OptionsListAccount[${entry.index}]`, nextLevel),
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                span({ class: "account-row__sub-label" }, entry.description)
            ),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });

const buildCoralKidEntries = (rawOptions, rawDescriptions) =>
    CORAL_KID_FIELDS.map((field) => ({
        ...field,
        key: String(field.index),
        description: cleanNameEffect(rawDescriptions?.[field.descriptionIndex], field.name),
        level: toInt(rawOptions[String(field.index)] ?? 0, { min: 0 }),
    }));

export const CoralKidTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Coral Kid" });
    const entries = van.state([]);
    const unlockedState = van.state(0);
    const levelStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const optionKeys = [...UNLOCK_OPTION_KEYS, ...CORAL_KID_FIELDS.map((field) => field.index)].map(String);
            const [rawOptions, rawDescriptions] = await Promise.all([
                readGgaEntries("OptionsListAccount", optionKeys),
                readCList("Spelunky[25]"),
            ]);
            unlockedState.val = UNLOCK_OPTION_KEYS.every((index) => Number(rawOptions[String(index)] ?? 0) === 1)
                ? 1
                : 0;
            entries.val = buildCoralKidEntries(rawOptions, toIndexedArray(rawDescriptions ?? []));
            reconcileRows(entries.val.map((entry) => entry.key).join("|"), () =>
                entries.val.map((entry) =>
                    CoralKidLevelRow({
                        entry,
                        levelState: getOrCreateState(levelStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(levelStates, entry.index).val = entry.level;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "UNLOCK",
            note: "OptionsListAccount[426] + [433]",
            body: div({ class: "account-item-stack" }, UnlockRow({ unlockedState })),
        }),
        AccountSection({
            title: "UPGRADES",
            note: "OptionsListAccount[427-432]",
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: "CORAL KID",
        description: "Toggle Coral Kid unlock flags and edit Coral Kid upgrade levels from OptionsListAccount.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING CORAL KID",
        errorTitle: "CORAL KID READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
