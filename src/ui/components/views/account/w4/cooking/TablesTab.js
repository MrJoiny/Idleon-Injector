import van from "../../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableFieldsRow, StackedNumberField } from "../../EditableFieldsRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    toInt,
    writeManyVerified,
} from "../../accountShared.js";

const { div, span } = van.tags;

const COOKING_PATH = "Cooking";
const KITCHEN_FIELDS = [
    { key: "speed", label: "Speed", index: 6 },
    { key: "fire", label: "Fire", index: 7 },
    { key: "luck", label: "Luck", index: 8 },
];

const buildKitchenEntries = (rawCooking) =>
    toIndexedArray(rawCooking ?? []).map((rawKitchen, kitchenIndex) => {
        const kitchen = toIndexedArray(rawKitchen ?? []);
        const fields = KITCHEN_FIELDS.map((field) => ({
            ...field,
            key: `kitchen:${kitchenIndex}:${field.key}`,
            path: `${COOKING_PATH}[${kitchenIndex}][${field.index}]`,
            value: toInt(kitchen[field.index], { min: 0 }),
        }));

        return {
            index: kitchenIndex,
            key: `kitchen:${kitchenIndex}`,
            name: `Kitchen ${kitchenIndex + 1}`,
            fields,
        };
    });

const KitchenRow = ({ entry, fieldStates }) => {
    const fields = entry.fields.map((field) => ({
        ...field,
        valueState: getOrCreateState(fieldStates, field.key),
    }));

    return EditableFieldsRow({
        fields,
        normalize: (rawValues) => {
            const nextValues = {};
            for (const field of fields) {
                const normalized = resolveNumberInput(rawValues[field.key], {
                    min: 0,
                    fallback: null,
                });
                if (normalized === null || normalized === undefined || Number.isNaN(normalized)) return null;
                nextValues[field.key] = normalized;
            }
            return nextValues;
        },
        write: async (nextValues) => {
            await writeManyVerified(fields.map((field) => ({ path: field.path, value: nextValues[field.key] })));
            return nextValues;
        },
        info: [
            span({ class: "account-row__index" }, `#${entry.index + 1}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        controlsClass: "account-row__controls--stack-action",
        renderControls: ({ draftStates, resetDraft, setFieldFocused }) =>
            div(
                { class: "account-stacked-fields" },
                ...fields.map((field) => StackedNumberField({ field, draftStates, setFieldFocused, resetDraft }))
            ),
        applyTooltip: "Write all kitchen upgrade levels to game",
    });
};

export const TablesTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Cooking tables" });
    const kitchenEntries = van.state([]);
    const kitchenFieldStates = new Map();
    const kitchenRows = div({ class: "account-item-stack" });
    const reconcileKitchenRows = createStaticRowReconciler(kitchenRows);

    const reconcileRows = () =>
        reconcileKitchenRows(
            kitchenEntries.val.map((entry) => entry.key).join("|"),
            () => kitchenEntries.val.map((entry) => KitchenRow({ entry, fieldStates: kitchenFieldStates }))
        );

    const load = async () =>
        run(async () => {
            kitchenEntries.val = buildKitchenEntries(await gga(COOKING_PATH));
            reconcileRows();

            for (const entry of kitchenEntries.val) {
                for (const field of entry.fields) {
                    getOrCreateState(kitchenFieldStates, field.key).val = field.value;
                }
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "KITCHEN TABLES",
            note: () => `${kitchenEntries.val.length} KITCHENS FROM Cooking[i][6-8]`,
            body: kitchenRows,
        })
    );

    return PersistentAccountListPage({
        title: "COOKING TABLES",
        description: "Edit W4 Cooking kitchen table upgrade levels.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING COOKING TABLES",
        errorTitle: "COOKING TABLE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
