import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableFieldsRow, StackedNumberField } from "../../EditableFieldsRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    resolveNumberInput,
    toInt,
    writeManyVerified,
} from "../../accountShared.js";

const { div, span } = van.tags;

const MEAL_LEVELS_PATH = "Meals[0]";
const MEAL_AMOUNTS_PATH = "Meals[2]";
const RIBBON_LEVELS_PATH = "Ribbon";
const MEAL_RIBBON_OFFSET = 28;
const MEAL_RIBBON_MAX_LEVEL = 20;

const MEAL_FIELDS = [
    { key: "level", label: "Level", path: MEAL_LEVELS_PATH, formatted: false },
    { key: "amount", label: "Amount", path: MEAL_AMOUNTS_PATH, formatted: true, float: true },
    { key: "ribbon", label: "Ribbon", path: RIBBON_LEVELS_PATH, formatted: false, max: MEAL_RIBBON_MAX_LEVEL },
];

const buildMealEntries = (rawMealInfo, rawLevels, rawAmounts, rawRibbons) => {
    const levels = toIndexedArray(rawLevels ?? []);
    const amounts = toIndexedArray(rawAmounts ?? []);
    const ribbons = toIndexedArray(rawRibbons ?? []);

    return toIndexedArray(rawMealInfo ?? [])
        .map((rawMeal, index) => {
            const meal = toIndexedArray(rawMeal ?? []);
            const rawName = String(meal[0] ?? "").trim();
            if (!rawName) return null;

            return {
                index,
                key: `meal:${index}:${rawName}`,
                name: cleanName(rawName, `Meal ${index + 1}`),
                fields: MEAL_FIELDS.map((field) => {
                    const dataIndex = field.key === "ribbon" ? MEAL_RIBBON_OFFSET + index : index;
                    let value = amounts[index] ?? 0;
                    if (field.key === "level") value = toInt(levels[index], { min: 0 });
                    if (field.key === "ribbon") {
                        value = Math.min(MEAL_RIBBON_MAX_LEVEL, toInt(ribbons[dataIndex], { min: 0 }));
                    }

                    return {
                        ...field,
                        key: `meal:${index}:${field.key}`,
                        path: `${field.path}[${dataIndex}]`,
                        value,
                    };
                }),
            };
        })
        .filter(Boolean);
};

const MealRow = ({ entry, fieldStates }) => {
    const fields = entry.fields.map((field) => ({
        ...field,
        valueState: getOrCreateState(fieldStates, field.key),
        toDraft: (value) => (field.formatted ? largeFormatter(value ?? 0) : String(value ?? 0)),
    }));

    return EditableFieldsRow({
        fields,
        normalize: (rawValues) => {
            const nextValues = {};
            for (const field of fields) {
                const normalized = resolveNumberInput(rawValues[field.key], {
                    formatted: field.formatted,
                    float: field.float,
                    min: 0,
                    max: field.max ?? Infinity,
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
            span({ class: "account-row__index" }, `#${entry.index}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => `LV ${getOrCreateState(fieldStates, entry.fields[0].key).val ?? 0}`,
        controlsClass: "account-row__controls--stack-action",
        renderControls: ({ draftStates, resetDraft, setFieldFocused }) =>
            div(
                { class: "account-stacked-fields" },
                ...fields.map((field) => StackedNumberField({ field, draftStates, setFieldFocused, resetDraft }))
            ),
        applyTooltip: "Write meal level, amount, and ribbon level to game",
    });
};

export const MealsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Cooking meals" });
    const mealEntries = van.state([]);
    const mealFieldStates = new Map();
    const mealRows = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileMealRows = createStaticRowReconciler(mealRows);

    const reconcileRows = () =>
        reconcileMealRows(
            mealEntries.val.map((entry) => entry.key).join("|"),
            () => mealEntries.val.map((entry) => MealRow({ entry, fieldStates: mealFieldStates }))
        );

    const load = async () =>
        run(async () => {
            const [rawMeals, rawMealInfo, rawRibbons] = await Promise.all([gga("Meals"), readCList("MealINFO"), gga("Ribbon")]);

            mealEntries.val = buildMealEntries(rawMealInfo, rawMeals?.[0], rawMeals?.[2], rawRibbons);
            reconcileRows();

            for (const entry of mealEntries.val) {
                for (const field of entry.fields) {
                    getOrCreateState(mealFieldStates, field.key).val = field.value;
                }
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "MEALS",
            note: () => `${mealEntries.val.length} NAMED MEALS FROM MealINFO`,
            body: mealRows,
        })
    );

    return PersistentAccountListPage({
        title: "COOKING MEALS",
        description: "Edit W4 Cooking meal levels, amounts, and ribbon levels.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING COOKING MEALS",
        errorTitle: "COOKING MEAL READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
