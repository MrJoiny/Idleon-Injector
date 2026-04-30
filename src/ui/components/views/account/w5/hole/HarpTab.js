import van from "../../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { InlineEditableNumberField } from "../../components/InlineEditableNumberField.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { createStaticRowReconciler, getOrCreateState, largeFormatter, toNum } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const NOTE_AMOUNT_NAMES = [
    "Crotchet Note",
    "Natural Note",
    "Bass Note",
    "Treble Note",
    "Eighth Note",
    "Quaver Note",
    "Sharp Note",
    "(F)Clef Note",
    "(G)Clef Note",
    "Sixteenth Note",
];
const NOTE_LEVEL_NAMES = ["C", "D", "E", "F", "G", "A"];

const buildAmountEntries = (holes) => {
    const values = toIndexedArray(toIndexedArray(holes)[9]);
    return NOTE_AMOUNT_NAMES.map((name, index) => ({
        key: `harp-amount-${index}`,
        index,
        name,
        path: `Holes[9][${10 + index}]`,
        value: toNum(values[10 + index], 0),
    }));
};

const buildLevelEntries = (holes) => {
    const values = toIndexedArray(toIndexedArray(holes)[19]);
    return NOTE_LEVEL_NAMES.map((name, index) => ({
        key: `harp-note-${index}`,
        index,
        name,
        fields: {
            level: {
                key: `harp-note-${index}-level`,
                path: `Holes[19][${index * 2}]`,
                value: toNum(values[index * 2], 0),
            },
            exp: {
                key: `harp-note-${index}-exp`,
                path: `Holes[19][${index * 2 + 1}]`,
                value: toNum(values[index * 2 + 1], 0),
            },
        },
    }));
};

const AmountRow = ({ entry, valueState }) =>
    AccountRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => largeFormatter(valueState.val ?? 0),
        controlsClass: "account-row__controls--stack",
        controls: InlineEditableNumberField({
            label: "Amount",
            valueState,
            path: entry.path,
        }),
    });

const NoteRow = ({ entry, valueStates }) =>
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
                label: "EXP",
                valueState: getOrCreateState(valueStates, entry.fields.exp.key),
                path: entry.fields.exp.path,
            }),
        ],
    });

export const HarpTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hole Harp" });
    const amountEntries = van.state([]);
    const noteEntries = van.state([]);
    const valueStates = new Map();
    const amountNode = div({ class: "account-item-stack" });
    const noteNode = div({ class: "account-item-stack" });
    const reconcileAmountRows = createStaticRowReconciler(amountNode);
    const reconcileNoteRows = createStaticRowReconciler(noteNode);

    const load = async () =>
        run(async () => {
            const holes = await gga("Holes");
            amountEntries.val = buildAmountEntries(holes);
            noteEntries.val = buildLevelEntries(holes);
            reconcileAmountRows(amountEntries.val.map((entry) => entry.key).join("|"), () =>
                amountEntries.val.map((entry) =>
                    AmountRow({ entry, valueState: getOrCreateState(valueStates, entry.key) })
                )
            );
            reconcileNoteRows(noteEntries.val.map((entry) => entry.key).join("|"), () =>
                noteEntries.val.map((entry) => NoteRow({ entry, valueStates }))
            );

            for (const entry of amountEntries.val) getOrCreateState(valueStates, entry.key).val = entry.value;
            for (const entry of noteEntries.val) {
                for (const field of Object.values(entry.fields))
                    getOrCreateState(valueStates, field.key).val = field.value;
            }
        });

    load();

    return PersistentAccountListPage({
        title: "THE HARP",
        description: "Edit Harp note amounts, note levels, and EXP from Holes[9] and Holes[19].",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING HOLE HARP",
        errorTitle: "HOLE HARP READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "NOTE AMOUNTS",
                note: () => `${amountEntries.val.length} NOTES`,
                body: amountNode,
            }),
            AccountSection({
                title: "NOTE LEVELS",
                note: () => `${noteEntries.val.length} LETTERED NOTES`,
                body: noteNode,
            })
        ),
    });
};
