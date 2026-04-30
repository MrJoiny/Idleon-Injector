import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableFieldsRow, StackedNumberField } from "../../EditableFieldsRow.js";
import { InlineEditableNumberField } from "../../components/InlineEditableNumberField.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanNameEffect,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    resolveNumberInput,
    toInt,
    writeManyVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, option, select, span } = van.tags;

const BOATS_PATH = "Boats";
const CAPTAINS_PATH = "Captains";
const BOAT_FIELDS = [
    { key: "loot", label: "Loot Value", index: 3 },
    { key: "speed", label: "Speed", index: 5 },
];
const CAPTAIN_NUMBER_FIELDS = [
    { key: "rarity", label: "Rarity", index: 0, max: 6 },
    { key: "level", label: "Level", index: 3 },
    { key: "xp", label: "XP", index: 4, formatted: true, float: true },
];
const CAPTAIN_AMOUNT_FIELDS = [
    { key: "amount1", label: "Bonus I Amount", index: 5, typeIndex: 1 },
    { key: "amount2", label: "Bonus II Amount", index: 6, typeIndex: 2 },
];

const resolveInput = (rawValue, field) =>
    resolveNumberInput(rawValue, {
        formatted: field.formatted,
        float: field.float,
        min: 0,
        max: field.max ?? Infinity,
        fallback: null,
    });

const fieldValue = (rawValues, index, field) =>
    field.formatted
        ? resolveNumberInput(rawValues[index], { formatted: true, float: field.float, min: 0, fallback: 0 })
        : Math.min(field.max ?? Infinity, toInt(rawValues[index], { min: 0 }));

const BoatRow = ({ entry, valueStates }) =>
    AccountRow({
        info: [
            span({ class: "account-row__index" }, `#${entry.index + 1}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () =>
            `LOOT ${getOrCreateState(valueStates, entry.fields.loot.key).val ?? 0} / SPEED ${
                getOrCreateState(valueStates, entry.fields.speed.key).val ?? 0
            }`,
        controlsClass: "account-row__controls--stack",
        controls: BOAT_FIELDS.map((field) =>
            InlineEditableNumberField({
                label: field.label,
                valueState: getOrCreateState(valueStates, entry.fields[field.key].key),
                path: entry.fields[field.key].path,
                normalize: (rawValue) => resolveInput(rawValue, field),
                rootClass: "account-stacked-field",
                labelClass: "account-stacked-field__label",
            })
        ),
    });

const CaptainRow = ({ entry, valueStates, bonusTypes }) => {
    const fields = Object.values(entry.fields).map((field) => ({
        key: field.key,
        valueState: getOrCreateState(valueStates, field.key),
        toDraft: (value) => (field.formatted ? largeFormatter(value ?? 0) : String(value ?? 0)),
    }));
    const fieldByKey = entry.fields;

    const normalizeCaptain = (rawValues) => {
        const next = {};
        for (const field of Object.values(fieldByKey)) {
            const normalized = resolveInput(rawValues[field.key], field);
            if (normalized === null || normalized === undefined || Number.isNaN(normalized)) return null;
            next[field.key] = normalized;
        }
        return next;
    };

    const writeCaptain = async (nextValues) => {
        await writeManyVerified(
            Object.values(fieldByKey).map((field) => ({ path: field.path, value: nextValues[field.key] }))
        );
        return nextValues;
    };

    return EditableFieldsRow({
        fields,
        normalize: normalizeCaptain,
        write: writeCaptain,
        info: [
            span({ class: "account-row__index" }, `#${entry.index + 1}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        badge: () => `LV ${getOrCreateState(valueStates, fieldByKey.level.key).val ?? 0}`,
        controlsClass: "account-row__controls--stack-action",
        renderControls: ({ draftStates, getDraftValue, resetDraft, setFieldFocused, status }) =>
            div(
                { class: "account-stacked-fields" },
                ...CAPTAIN_NUMBER_FIELDS.map((field) =>
                    StackedNumberField({
                        field: fieldByKey[field.key],
                        draftStates,
                        getDraftValue,
                        setFieldFocused,
                        resetDraft,
                    })
                ),
                div(
                    { class: "account-stacked-field" },
                    span({ class: "account-stacked-field__label" }, "Bonus Type I"),
                    select(
                        {
                            class: "select-base",
                            onchange: (e) => (draftStates[fieldByKey.bonusType1.key].val = Number(e.target.value)),
                            disabled: () => status.val === "loading",
                        },
                        ...bonusTypes.map((bonus) =>
                            option(
                                {
                                    value: bonus.index,
                                    selected: () => toInt(draftStates[fieldByKey.bonusType1.key].val) === bonus.index,
                                },
                                bonus.effect
                            )
                        )
                    )
                ),
                StackedNumberField({
                    field: {
                        ...fieldByKey.amount1,
                        label: () =>
                            `${bonusTypes[toInt(draftStates[fieldByKey.bonusType1.key].val)]?.effect ?? "Bonus I"}`,
                    },
                    draftStates,
                    getDraftValue,
                    setFieldFocused,
                    resetDraft,
                }),
                div(
                    { class: "account-stacked-field" },
                    span({ class: "account-stacked-field__label" }, "Bonus Type II"),
                    select(
                        {
                            class: "select-base",
                            onchange: (e) => (draftStates[fieldByKey.bonusType2.key].val = Number(e.target.value)),
                            disabled: () => status.val === "loading",
                        },
                        ...bonusTypes.map((bonus) =>
                            option(
                                {
                                    value: bonus.index,
                                    selected: () => toInt(draftStates[fieldByKey.bonusType2.key].val) === bonus.index,
                                },
                                bonus.effect
                            )
                        )
                    )
                ),
                StackedNumberField({
                    field: {
                        ...fieldByKey.amount2,
                        label: () =>
                            `${bonusTypes[toInt(draftStates[fieldByKey.bonusType2.key].val)]?.effect ?? "Bonus II"}`,
                    },
                    draftStates,
                    getDraftValue,
                    setFieldFocused,
                    resetDraft,
                })
            ),
        applyTooltip: "Write all captain fields to game",
    });
};

const buildBonusTypes = (rawCaptainBonuses) =>
    toIndexedArray(rawCaptainBonuses ?? []).map((rawBonus, index) => {
        const bonus = toIndexedArray(rawBonus ?? []);
        return {
            index,
            effect: cleanNameEffect(bonus[3], `Bonus Type ${index}`),
        };
    });

const buildBoatEntries = (rawBoats) =>
    toIndexedArray(rawBoats ?? []).map((rawBoat, boatIndex) => {
        const boat = toIndexedArray(rawBoat ?? []);
        const fields = Object.fromEntries(
            BOAT_FIELDS.map((field) => [
                field.key,
                {
                    ...field,
                    key: `boat:${boatIndex}:${field.key}`,
                    path: `${BOATS_PATH}[${boatIndex}][${field.index}]`,
                    value: fieldValue(boat, field.index, field),
                },
            ])
        );

        return {
            index: boatIndex,
            key: `boat:${boatIndex}`,
            name: `Boat ${boatIndex + 1}`,
            fields,
        };
    });

const buildCaptainEntries = (rawCaptains, bonusTypes) =>
    toIndexedArray(rawCaptains ?? []).map((rawCaptain, captainIndex) => {
        const captain = toIndexedArray(rawCaptain ?? []);
        const typeMax = Math.max(0, bonusTypes.length - 1);
        const fields = Object.fromEntries(
            [
                ...CAPTAIN_NUMBER_FIELDS,
                { key: "bonusType1", label: "Bonus Type I", index: 1, max: typeMax },
                { key: "bonusType2", label: "Bonus Type II", index: 2, max: typeMax },
                ...CAPTAIN_AMOUNT_FIELDS,
            ].map((field) => [
                field.key,
                {
                    ...field,
                    key: `captain:${captainIndex}:${field.key}`,
                    path: `${CAPTAINS_PATH}[${captainIndex}][${field.index}]`,
                    value: fieldValue(captain, field.index, field),
                },
            ])
        );

        return {
            index: captainIndex,
            key: `captain:${captainIndex}`,
            name: `Captain ${captainIndex + 1}`,
            fields,
        };
    });

export const BoatsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Sailing Boats" });
    const boatEntries = van.state([]);
    const captainEntries = van.state([]);
    const bonusTypes = van.state([]);
    const valueStates = new Map();
    const boatListNode = div({ class: "account-item-stack" });
    const captainListNode = div({ class: "account-item-stack" });
    const reconcileBoatRows = createStaticRowReconciler(boatListNode);
    const reconcileCaptainRows = createStaticRowReconciler(captainListNode);

    const updateFieldStates = (entries) => {
        for (const entry of entries) {
            for (const field of Object.values(entry.fields)) {
                getOrCreateState(valueStates, field.key).val = field.value;
            }
        }
    };

    const reconcileRows = () => {
        reconcileBoatRows(boatEntries.val.map((entry) => entry.key).join("|"), () =>
            boatEntries.val.map((entry) => BoatRow({ entry, valueStates }))
        );
        reconcileCaptainRows(
            `${bonusTypes.val.map((bonus) => `${bonus.index}:${bonus.effect}`).join("|")}::${captainEntries.val
                .map((entry) => entry.key)
                .join("|")}`,
            () => captainEntries.val.map((entry) => CaptainRow({ entry, valueStates, bonusTypes: bonusTypes.val }))
        );
    };

    const load = async () =>
        run(async () => {
            const [rawBoats, rawCaptains, rawCaptainBonuses] = await Promise.all([
                gga(BOATS_PATH),
                gga(CAPTAINS_PATH),
                readCList("CaptainBonuses"),
            ]);

            bonusTypes.val = buildBonusTypes(rawCaptainBonuses);
            boatEntries.val = buildBoatEntries(rawBoats);
            captainEntries.val = buildCaptainEntries(rawCaptains, bonusTypes.val);
            reconcileRows();
            updateFieldStates([...boatEntries.val, ...captainEntries.val]);
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "BOATS",
            note: () => `${boatEntries.val.length} BOATS`,
            body: boatListNode,
        }),
        AccountSection({
            title: "CAPTAINS",
            note: () => `${captainEntries.val.length} CAPTAINS`,
            body: captainListNode,
        })
    );

    return PersistentAccountListPage({
        title: "BOATS",
        description:
            "Edit Sailing boat loot/speed levels and captain fields. Captain bonus labels come from CaptainBonuses.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SAILING BOATS",
        errorTitle: "SAILING BOATS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
