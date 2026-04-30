import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../../services/api.js";
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

const BREEDING_PATH = "Breeding";
const PET_WORLD_COUNT = 4;
const WORLD_LABELS = ["World 1", "World 2", "World 3", "World 4"];
const PET_FIELDS = [
    { key: "dna", label: "DNA Level", baseIndex: 4, formatted: false },
    { key: "breedability", label: "Breedability", baseIndex: 13, formatted: true, float: true },
    { key: "shiny", label: "Shiny Days", baseIndex: 22, formatted: true, float: true },
];

const collectPetIds = (rawPetStats) =>
    Array.from(
        new Set(
            Array.from({ length: PET_WORLD_COUNT }, (_, worldIndex) => toIndexedArray(rawPetStats?.[worldIndex] ?? []))
                .flat()
                .map((rawPet) => String(toIndexedArray(rawPet ?? [])[0] ?? "").trim())
                .filter(Boolean)
        )
    );

const buildPetSections = (rawBreeding, rawPetStats, monsterDefinitions) =>
    Array.from({ length: PET_WORLD_COUNT }, (_, worldIndex) => {
        const petDefinitions = toIndexedArray(rawPetStats?.[worldIndex] ?? []);
        return {
            index: worldIndex,
            key: `world:${worldIndex}`,
            entries: petDefinitions
                .map((rawPet, petIndex) => {
                    const pet = toIndexedArray(rawPet ?? []);
                    const rawName = String(pet[0] ?? "").trim();
                    if (!rawName) return null;

                    const fields = PET_FIELDS.map((field) => {
                        const breedingIndex = field.baseIndex + worldIndex;
                        return {
                            ...field,
                            key: `pet:${worldIndex}:${petIndex}:${field.key}`,
                            path: `${BREEDING_PATH}[${breedingIndex}][${petIndex}]`,
                            value: field.formatted
                                ? resolveNumberInput(rawBreeding?.[breedingIndex]?.[petIndex] ?? 0, {
                                      formatted: true,
                                      float: field.float,
                                      min: 0,
                                      fallback: 0,
                                  })
                                : toInt(rawBreeding?.[breedingIndex]?.[petIndex], { min: 0 }),
                        };
                    });

                    return {
                        worldIndex,
                        petIndex,
                        key: `pet:${worldIndex}:${petIndex}:${rawName}`,
                        name: cleanName(
                            monsterDefinitions[rawName]?.Name ??
                                monsterDefinitions[rawName]?.displayName ??
                                monsterDefinitions[rawName]?.name ??
                                rawName,
                            `Pet ${petIndex + 1}`
                        ),
                        rawName: cleanName(rawName, `Pet ${petIndex + 1}`),
                        fields,
                    };
                })
                .filter(Boolean),
        };
    });

const PetRow = ({ entry, fieldStates }) => {
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
            span({ class: "account-row__index" }, `W${entry.worldIndex + 1}-${entry.petIndex + 1}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                span({ class: "account-row__sub-label" }, `${WORLD_LABELS[entry.worldIndex]} - ${entry.rawName}`)
            ),
        ],
        controlsClass: "account-row__controls--stack-action",
        renderControls: ({ draftStates, resetDraft, setFieldFocused }) =>
            div(
                { class: "account-stacked-fields" },
                ...fields.map((field) => StackedNumberField({ field, draftStates, setFieldFocused, resetDraft }))
            ),
        applyTooltip: "Write DNA level, breedability, and shiny days to game",
    });
};

export const PetsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Breeding pets" });
    const petSections = van.state([]);
    const petFieldStates = new Map();
    const petSectionRows = div({ class: "content-stack" });
    const reconcilePetSectionRows = createStaticRowReconciler(petSectionRows);

    const reconcileRows = () =>
        reconcilePetSectionRows(
            petSections.val.map((section) => `${section.key}:${section.entries.map((entry) => entry.key).join("|")}`).join("|"),
            () =>
                petSections.val.map((section) =>
                    AccountSection({
                        title: WORLD_LABELS[section.index].toUpperCase(),
                        note: `${section.entries.length} PETS`,
                        body: div(
                            { class: "account-item-stack account-item-stack--dense" },
                            ...section.entries.map((entry) => PetRow({ entry, fieldStates: petFieldStates }))
                        ),
                    })
                )
        );

    const load = async () =>
        run(async () => {
            const [rawBreeding, rawPetStats] = await Promise.all([gga(BREEDING_PATH), readCList("PetStats")]);
            const petIds = collectPetIds(rawPetStats);
            const monsterDefinitions = petIds.length
                ? await readGgaEntries("MonsterDefinitionsGET.h", petIds, ["Name", "displayName", "name"])
                : {};

            petSections.val = buildPetSections(rawBreeding, rawPetStats, monsterDefinitions);
            reconcileRows();

            for (const section of petSections.val) {
                for (const entry of section.entries) {
                    for (const field of entry.fields) {
                        getOrCreateState(petFieldStates, field.key).val = field.value;
                    }
                }
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "PETS",
            note: "DNA, breedability, and shiny days from Breeding W1-W4 pet arrays",
            body: petSectionRows,
        })
    );

    return PersistentAccountListPage({
        title: "BREEDING PETS",
        description: "Edit W4 Breeding pet DNA, breedability, and shiny day values.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING BREEDING PETS",
        errorTitle: "BREEDING PET READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
