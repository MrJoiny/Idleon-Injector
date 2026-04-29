import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../../services/api.js";
import { NumberInput } from "../../../../NumberInput.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableFieldsRow } from "../../EditableFieldsRow.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    adjustFormattedIntInput,
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    toInt,
    writeManyVerified,
} from "../../accountShared.js";

const { div, span } = van.tags;

const SUSHI_RESOURCES_PATH = "Sushi[4]";
const SUSHI_PERFECT_PATH = "Sushi[5]";
const SUSHI_XP_PATH = "Sushi[6]";
const SUSHI_LEVEL_PATH = "Sushi[7]";

const RESOURCE_FIELDS = [
    { id: "fuel", index: 0, label: "Fuel", mode: "currency" },
    { id: "money", index: 3, label: "Money", mode: "currency" },
    { id: "salt", index: 5, label: "Salt Shaker", mode: "int" },
    { id: "pepper", index: 6, label: "Pepper Shaker", mode: "int" },
    { id: "saffron", index: 7, label: "Saffron Shaker", mode: "int" },
];

const KNOWLEDGE_FIELDS = [
    {
        id: "perfect",
        label: "Perfect / Unlocked",
        path: SUSHI_PERFECT_PATH,
        inputMode: "int",
        normalize: (raw) => Math.min(1, toInt(raw, { min: -1 })),
        adjust: (raw, delta, current) => Math.max(-1, Math.min(1, toInt(raw, current ?? 0) + delta)),
        format: (value) => String(Math.min(1, toInt(value, { min: -1 }))),
        clampDraft: (raw) => {
            const text = String(raw ?? "");
            if (text === "" || text === "-") return text;
            return String(Math.max(-1, Math.min(1, toInt(text, { min: -1 }))));
        },
    },
    {
        id: "xp",
        label: "Knowledge XP",
        path: SUSHI_XP_PATH,
        inputMode: "float",
        normalize: (raw) => resolveNumberInput(raw, { formatted: true, float: true, min: 0, fallback: null }),
        adjust: (raw, delta, current) => adjustFormattedIntInput(raw, delta, current ?? 0, { min: 0 }),
        format: largeFormatter,
        inputProps: {
            formatter: largeFormatter,
            parser: largeParser,
        },
    },
    {
        id: "level",
        label: "Knowledge Level",
        path: SUSHI_LEVEL_PATH,
        inputMode: "int",
        normalize: (raw) => toInt(raw, { min: 0 }),
        adjust: (raw, delta, current) => Math.max(0, toInt(raw, current ?? 0) + delta),
        format: (value) => String(toInt(value, { min: 0 })),
    },
];

const ResourceRow = ({ field, valueState }) => {
    const isCurrency = field.mode === "currency";

    return SimpleNumberRow({
        entry: {
            ...field,
            path: `${SUSHI_RESOURCES_PATH}[${field.index}]`,
            name: field.label,
            formatted: isCurrency,
            float: isCurrency,
            badge: (currentValue) => (isCurrency ? largeFormatter(currentValue ?? 0) : String(currentValue ?? 0)),
        },
        valueState,
    });
};

const KnowledgeRow = ({ entry, fieldStates }) =>
    EditableFieldsRow({
        fields: KNOWLEDGE_FIELDS.map((field) => ({
            ...field,
            key: field.id,
            valueState: getOrCreateState(fieldStates[field.id], entry.index),
            toDraft: field.format,
        })),
        normalize: (rawValues) => {
            const nextValues = {};
            for (const field of KNOWLEDGE_FIELDS) {
                const nextValue = field.normalize(rawValues[field.id]);
                if (nextValue === null || nextValue === undefined || Number.isNaN(nextValue)) return null;
                nextValues[field.id] = nextValue;
            }
            return nextValues;
        },
        write: async (nextValues) => {
            await writeManyVerified(
                KNOWLEDGE_FIELDS.map((field) => ({
                    path: `${field.path}[${entry.index}]`,
                    value: nextValues[field.id],
                }))
            );
            return nextValues;
        },
        info: [
            span({ class: "account-row__index" }, `#${entry.index}`),
            span({ class: "account-row__name" }, entry.name),
        ],
        badge: `TIER ${entry.index + 1}`,
        rowClass: "account-row--field-grid",
        controlsClass: "account-row__controls--field-grid",
        renderControls: ({ draftStates, getDraftValue, resetDraft, setFieldFocused }) =>
            KNOWLEDGE_FIELDS.map((field) => {
                const valueState = getOrCreateState(fieldStates[field.id], entry.index);
                return div(
                    { class: "account-field-metric" },
                    span({ class: "account-field-metric__label" }, field.label),
                    NumberInput({
                        mode: field.inputMode,
                        value: draftStates[field.id],
                        ...(field.inputProps ?? {}),
                        oninput: (e) => {
                            if (typeof field.clampDraft !== "function") return;
                            const nextDraft = field.clampDraft(e.target.value);
                            e.target.value = nextDraft;
                            draftStates[field.id].val = nextDraft;
                        },
                        onfocus: () => setFieldFocused(field.id, true),
                        onblur: () => {
                            setFieldFocused(field.id, false);
                            resetDraft(field.id);
                        },
                        onDecrement: () => {
                            draftStates[field.id].val = String(
                                field.adjust(getDraftValue(field.id), -1, valueState.val)
                            );
                        },
                        onIncrement: () => {
                            draftStates[field.id].val = String(
                                field.adjust(getDraftValue(field.id), 1, valueState.val)
                            );
                        },
                    })
                );
            }),
    });

export function SushiGeneralTab() {
    const { loading, error, run } = useAccountLoad({ label: "Sushi General" });
    const resourceStates = new Map(RESOURCE_FIELDS.map((field) => [field.id, van.state(0)]));
    const sushiEntries = van.state([]);
    const fieldStates = {
        perfect: new Map(),
        xp: new Map(),
        level: new Map(),
    };
    const knowledgeListNode = div({ class: "account-item-stack" });
    const reconcileKnowledgeRows = createStaticRowReconciler(knowledgeListNode);

    const buildSushiEntries = (rawNames) =>
        toIndexedArray(rawNames ?? [])
            .map((rawName, index) => {
                const rawId = String(rawName ?? "").trim();
                if (!rawId) return null;

                return {
                    index,
                    rawId,
                    name: cleanName(rawId, `Sushi ${index}`),
                };
            })
            .filter(Boolean);

    const reconcileRows = () => {
        reconcileKnowledgeRows(sushiEntries.val.map((entry) => entry.rawId).join("|"), () =>
            sushiEntries.val.map((entry) => KnowledgeRow({ entry, fieldStates }))
        );
    };

    const load = async () =>
        run(async () => {
            sushiEntries.val = buildSushiEntries(await readCList("Research[30]"));
            reconcileRows();

            const [rawResources, rawPerfect, rawXp, rawLevels] = await Promise.all([
                gga(SUSHI_RESOURCES_PATH),
                gga(SUSHI_PERFECT_PATH),
                gga(SUSHI_XP_PATH),
                gga(SUSHI_LEVEL_PATH),
            ]);
            const resources = toIndexedArray(rawResources ?? []);
            const perfect = toIndexedArray(rawPerfect ?? []);
            const xp = toIndexedArray(rawXp ?? []);
            const levels = toIndexedArray(rawLevels ?? []);

            for (const field of RESOURCE_FIELDS) {
                resourceStates.get(field.id).val =
                    field.mode === "currency"
                        ? Number(resources[field.index] ?? 0)
                        : toInt(resources[field.index], { min: 0 });
            }

            for (const entry of sushiEntries.val) {
                getOrCreateState(fieldStates.perfect, entry.index).val = Math.min(
                    1,
                    toInt(perfect[entry.index], { min: -1 })
                );
                getOrCreateState(fieldStates.xp, entry.index).val = Number(xp[entry.index] ?? 0);
                getOrCreateState(fieldStates.level, entry.index).val = toInt(levels[entry.index], { min: 0 });
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "RESOURCES",
            note: "Sushi[4]",
            body: div(
                { class: "account-item-stack" },
                ...RESOURCE_FIELDS.map((field) =>
                    ResourceRow({
                        field,
                        valueState: resourceStates.get(field.id),
                    })
                )
            ),
        }),
        AccountSection({
            title: "KNOWLEDGE",
            note: () => `${sushiEntries.val.length} SUSHI TYPES`,
            body: knowledgeListNode,
        })
    );

    return PersistentAccountListPage({
        title: "SUSHI GENERAL",
        description: "Edit Sushi resources from Sushi[4], and per-tier unlock, XP, and knowledge levels.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING SUSHI GENERAL",
        errorTitle: "SUSHI GENERAL READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
}
