import van from "../../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableFieldsRow } from "../../EditableFieldsRow.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    cleanName,
    createIndexedStateGetter,
    createStaticRowReconciler,
    getOrCreateState,
    readLevelDefinitions,
    toInt,
    writeManyVerified,
} from "../../accountShared.js";

const { div, option, select, span } = van.tags;

const CHIP_AMOUNTS_PATH = "Lab[15]";
const PLAYER_CHIP_START = 1;
const PLAYER_COUNT = 10;
const CHIP_SLOT_COUNT = 7;

const readChipEntries = () =>
    readLevelDefinitions({
        levelsPath: CHIP_AMOUNTS_PATH,
        definitionsPath: "ChipDesc",
        mapEntry: ({ index, definition, rawLevel }) => {
            const rawName = String(definition[0] ?? "").trim();
            if (!rawName) return null;

            return {
                index,
                key: `chip:${index}:${rawName}`,
                name: cleanName(rawName, `Chip ${index + 1}`),
                path: `${CHIP_AMOUNTS_PATH}[${index}]`,
                value: toInt(rawLevel, { min: 0 }),
                formatted: false,
                badge: (currentValue) => `${currentValue ?? 0} OWNED`,
            };
        },
    });

const buildChipOptions = (chipEntries) => [
    { value: -1, label: "Empty" },
    ...chipEntries.map((entry) => ({ value: entry.index, label: entry.name })),
];

const buildPlayerChipEntries = (rawLab, chipOptions) =>
    Array.from({ length: PLAYER_COUNT }, (_, index) => {
        const playerIndex = PLAYER_CHIP_START + index;
        const rawSlots = toIndexedArray(rawLab?.[playerIndex] ?? []);
        const maxChipIndex = Math.max(-1, ...chipOptions.map((choice) => choice.value));
        return {
            playerNumber: index + 1,
            key: `player:${index + 1}`,
            optionSignature: chipOptions.map((choice) => `${choice.value}:${choice.label}`).join("|"),
            fields: Array.from({ length: CHIP_SLOT_COUNT }, (_, slotIndex) => ({
                key: `player:${index + 1}:slot:${slotIndex}`,
                label: `Slot ${slotIndex + 1}`,
                path: `Lab[${playerIndex}][${slotIndex}]`,
                value: toInt(rawSlots[slotIndex], { min: -1 }),
                min: -1,
                max: maxChipIndex,
                options: chipOptions,
            })),
        };
    });

const ChipSlotSelect = ({ field, draftStates, status }) =>
    div(
        { class: "account-stacked-field" },
        span({ class: "account-stacked-field__label" }, field.label),
        select(
            {
                class: "select-base",
                disabled: () => status.val === "loading",
                onchange: (e) => (draftStates[field.key].val = Number(e.target.value)),
            },
            ...field.options.map((choice) =>
                option(
                    {
                        value: choice.value,
                        selected: () => Number(draftStates[field.key].val) === choice.value,
                    },
                    choice.label
                )
            )
        )
    );

const PlayerChipsRow = ({ entry, fieldStates }) => {
    const fields = entry.fields.map((field) => ({
        ...field,
        valueState: getOrCreateState(fieldStates, field.key),
        toDraft: (value) => toInt(value, { min: field.min }),
    }));

    return EditableFieldsRow({
        fields,
        normalize: (rawValues) => {
            const nextValues = {};
            for (const field of fields) {
                const nextValue = Math.min(field.max, toInt(rawValues[field.key], { min: field.min }));
                if (Number.isNaN(nextValue)) return null;
                nextValues[field.key] = nextValue;
            }
            return nextValues;
        },
        write: async (nextValues) => {
            await writeManyVerified(fields.map((field) => ({ path: field.path, value: nextValues[field.key] })));
            return nextValues;
        },
        info: [
            span({ class: "account-row__index" }, `#${entry.playerNumber}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, `Player ${entry.playerNumber}`)
            ),
        ],
        badge: () =>
            `${entry.fields.filter((field) => toInt(getOrCreateState(fieldStates, field.key).val, { min: -1 }) >= 0).length} EQUIPPED`,
        controlsClass: "account-row__controls--stack-action",
        renderControls: ({ draftStates, status }) =>
            div(
                { class: "account-stacked-fields" },
                ...fields.map((field) => ChipSlotSelect({ field, draftStates, status }))
            ),
        applyTooltip: "Write all equipped chip ids for this player",
    });
};

export const ChipsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Lab chips" });
    const chipEntries = van.state([]);
    const playerChipEntries = van.state([]);
    const getChipState = createIndexedStateGetter(0);
    const playerChipStates = new Map();
    const chipRows = div({ class: "account-item-stack account-item-stack--dense" });
    const playerChipRows = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileChipRows = createStaticRowReconciler(chipRows);
    const reconcilePlayerChipRows = createStaticRowReconciler(playerChipRows);

    const reconcileRows = () => {
        reconcileChipRows(
            chipEntries.val.map((entry) => entry.key).join("|"),
            () => chipEntries.val.map((entry) => SimpleNumberRow({ entry, valueState: getChipState(entry.index) }))
        );
        reconcilePlayerChipRows(
            playerChipEntries.val.map((entry) => `${entry.key}:${entry.optionSignature}`).join("|"),
            () => playerChipEntries.val.map((entry) => PlayerChipsRow({ entry, fieldStates: playerChipStates }))
        );
    };

    const load = async () =>
        run(async () => {
            const [rawLab, chips] = await Promise.all([gga("Lab"), readChipEntries()]);
            const chipOptions = buildChipOptions(chips);

            chipEntries.val = chips;
            playerChipEntries.val = buildPlayerChipEntries(rawLab, chipOptions);
            reconcileRows();

            for (const entry of chipEntries.val) getChipState(entry.index).val = entry.value;
            for (const entry of playerChipEntries.val) {
                for (const field of entry.fields) {
                    getOrCreateState(playerChipStates, field.key).val = field.value;
                }
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "CHIPS",
            note: () => `${chipEntries.val.length} CHIP AMOUNTS FROM Lab[15]`,
            body: chipRows,
        }),
        AccountSection({
            title: "PLAYER CHIPS",
            note: "Lab[1-10], seven equipped chip ids per player",
            body: playerChipRows,
        })
    );

    return PersistentAccountListPage({
        title: "LAB CHIPS",
        description: "Edit W4 Lab chip amounts and equipped player chip ids.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING LAB CHIPS",
        errorTitle: "LAB CHIP READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
