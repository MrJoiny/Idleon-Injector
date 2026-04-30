import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { EditableFieldsRow } from "../EditableFieldsRow.js";
import { cleanName, writeManyVerified } from "../accountShared.js";

const { div, span, input, label } = van.tags;

const OBSERVATION_COUNT = 80;
const OBSERVATION_FIELDS = [
    {
        key: "unlocked",
        label: "Unlock",
        toDraft: (value) => Number(value ?? 0) === 1,
    },
    {
        key: "insightLevel",
        label: "Insight Lv",
        toDraft: (value) => String(value ?? 0),
    },
    {
        key: "insightExp",
        label: "Insight EXP",
        toDraft: (value) => String(value ?? 0),
    },
];

const normalizeResearchValue = (raw, index, { round = false } = {}) => {
    const values = toIndexedArray(raw);
    let resolved;

    if (values.length > 0) {
        resolved = values[index] ?? values[0] ?? 0;
    } else {
        resolved = raw ?? 0;
    }

    const numeric = Number(resolved ?? 0);
    if (!Number.isFinite(numeric)) return 0;
    return round ? Math.round(numeric) : numeric;
};

const isMeaningfulObservationName = (rawName) => {
    const name = String(rawName ?? "").trim();
    return Boolean(name) && !/^Name\d*$/i.test(name);
};

const ObservationTile = ({ index, tileState }) => {
    const clampInt = (raw) => {
        const numeric = Math.round(Number(raw));
        if (!Number.isFinite(numeric)) return 0;
        return Math.max(0, numeric);
    };

    return EditableFieldsRow({
        fields: OBSERVATION_FIELDS.map((field) => ({
            ...field,
            valueState: tileState[field.key],
        })),
        normalize: (rawValues) => ({
            unlocked: rawValues.unlocked ? 1 : 0,
            insightLevel: clampInt(rawValues.insightLevel),
            insightExp: clampInt(rawValues.insightExp),
        }),
        write: async (nextValues) => {
            await writeManyVerified([
                { path: `Research[2][${index}]`, value: nextValues.unlocked },
                { path: `Research[3][${index}]`, value: nextValues.insightExp },
                { path: `Research[4][${index}]`, value: nextValues.insightLevel },
            ]);
            return nextValues;
        },
        info: null,
        rowClass: () =>
            ["observation-tile", tileState.unlocked.val === 1 ? "observation-tile--unlocked" : ""]
                .filter(Boolean)
                .join(" "),
        controlsClass: "observation-tile__body",
        renderControls: ({ draftStates, resetDraft, setFieldFocused, status }) => [
            div(
                { class: "observation-tile__header" },
                div(
                    { class: "observation-tile__title-group" },
                    span({ class: "observation-tile__name" }, () => tileState.name.val)
                ),
                span(
                    {
                        class: () =>
                            `observation-tile__status ${
                                tileState.unlocked.val === 1 ? "observation-tile__status--unlocked" : ""
                            }`,
                    },
                    () => (tileState.unlocked.val === 1 ? "UNLOCKED" : "LOCKED")
                ),
                label(
                    { class: "toggle-switch observation-tile__toggle", title: "Toggle unlock" },
                    input({
                        type: "checkbox",
                        checked: () => Boolean(draftStates.unlocked.val),
                        disabled: () => status.val === "loading",
                        onchange: (e) => (draftStates.unlocked.val = e.target.checked),
                    }),
                    span({ class: "slider" })
                )
            ),
            div(
                { class: "observation-tile__stats" },
                div(
                    { class: "observation-stat" },
                    span({ class: "observation-stat__label" }, "Insight Lv"),
                    div(
                        { class: "observation-stat__controls" },
                        NumberInput({
                            mode: "int",
                            value: draftStates.insightLevel,
                            onfocus: () => setFieldFocused("insightLevel", true),
                            onblur: () => {
                                setFieldFocused("insightLevel", false);
                                resetDraft("insightLevel");
                            },
                            onDecrement: () =>
                                (draftStates.insightLevel.val = String(
                                    Math.max(0, clampInt(draftStates.insightLevel.val) - 1)
                                )),
                            onIncrement: () =>
                                (draftStates.insightLevel.val = String(clampInt(draftStates.insightLevel.val) + 1)),
                        }),
                        span({ class: "observation-stat__value" }, () => `CUR ${tileState.insightLevel.val}`)
                    )
                ),
                div(
                    { class: "observation-stat" },
                    span({ class: "observation-stat__label" }, "Insight EXP"),
                    div(
                        { class: "observation-stat__controls" },
                        NumberInput({
                            mode: "int",
                            value: draftStates.insightExp,
                            onfocus: () => setFieldFocused("insightExp", true),
                            onblur: () => {
                                setFieldFocused("insightExp", false);
                                resetDraft("insightExp");
                            },
                            onDecrement: () =>
                                (draftStates.insightExp.val = String(
                                    Math.max(0, clampInt(draftStates.insightExp.val) - 1)
                                )),
                            onIncrement: () =>
                                (draftStates.insightExp.val = String(clampInt(draftStates.insightExp.val) + 1)),
                        }),
                        span({ class: "observation-stat__value" }, () => `CUR ${tileState.insightExp.val}`)
                    )
                )
            ),
        ],
    });
};

export const ObservationsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Observations" });

    const observationStates = Array.from({ length: OBSERVATION_COUNT }, () => ({
        name: van.state(""),
        hasName: van.state(false),
        unlocked: van.state(0),
        insightLevel: van.state(0),
        insightExp: van.state(0),
    }));

    const load = async () =>
        run(async () => {
            const [rawUnlocks, rawInsightExp, rawInsightLevels, rawOccurrences] = await Promise.all([
                gga("Research[2]"),
                gga("Research[3]"),
                gga("Research[4]"),
                readCList("Occurrences"),
            ]);

            const occurrences = toIndexedArray(rawOccurrences);

            for (let index = 0; index < OBSERVATION_COUNT; index++) {
                const tile = observationStates[index];
                const occurrence = toIndexedArray(occurrences[index]);
                const unlocked = normalizeResearchValue(rawUnlocks, index, { round: true }) ? 1 : 0;
                const insightExp = normalizeResearchValue(rawInsightExp, index, { round: true });
                const insightLevel = normalizeResearchValue(rawInsightLevels, index);
                const rawName = String(occurrence[0] ?? "").trim();
                tile.hasName.val = isMeaningfulObservationName(rawName);
                tile.name.val = cleanName(rawName);
                tile.unlocked.val = unlocked;
                tile.insightExp.val = insightExp;
                tile.insightLevel.val = insightLevel;
            }
        });

    load();

    const tileGrid = div({ class: "scrollable-panel content-stack" }, () => {
        const tiles = observationStates
            .map((tileState, index) => ({ tileState, index }))
            .filter(({ tileState }) => tileState.hasName.val);

        return tiles.length === 0
            ? div({ class: "tab-empty" }, "No named observations were found.")
            : div(
                  { class: "observations-grid" },
                  ...tiles.map(({ tileState, index }) => ObservationTile({ index, tileState }))
              );
    });

    return PersistentAccountListPage({
        title: "OBSERVATIONS",
        description: "Edit unlock, insight level, and insight EXP per observation tile.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING OBSERVATIONS",
        errorTitle: "OBSERVATION READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: tileGrid,
    });
};
