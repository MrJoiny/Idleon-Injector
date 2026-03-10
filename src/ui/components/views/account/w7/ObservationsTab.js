import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { RefreshErrorBanner, usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button, h3, p, span, input, label } = van.tags;

const OBSERVATION_COUNT = 80;
const cleanObservationName = (raw, fallback) => String(raw ?? fallback).replace(/_/g, " ").trim();

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

const ObservationTile = ({ index, tileState }) => {
    const { status, run } = useWriteStatus({ successMs: 900, errorMs: 1400 });
    const isDirty = van.derive(
        () =>
            Number(tileState.unlockedInput.val ? 1 : 0) !== Number(tileState.unlocked.val) ||
            Math.round(Number(tileState.insightLevelInput.val) || 0) !== Number(tileState.insightLevel.val) ||
            Math.round(Number(tileState.insightExpInput.val) || 0) !== Number(tileState.insightExp.val)
    );

    const clampInt = (raw) => {
        const numeric = Math.round(Number(raw));
        if (!Number.isFinite(numeric)) return 0;
        return Math.max(0, numeric);
    };

    const doSet = async () => {
        const nextUnlocked = tileState.unlockedInput.val ? 1 : 0;
        const nextInsightLevel = clampInt(tileState.insightLevelInput.val);
        const nextInsightExp = clampInt(tileState.insightExpInput.val);

        await run(async () => {
            await writeGga(`Research[2][${index}]`, nextUnlocked);
            await writeGga(`Research[3][${index}]`, nextInsightExp);
            await writeGga(`Research[4][${index}]`, nextInsightLevel);
            tileState.unlocked.val = nextUnlocked;
            tileState.insightLevel.val = nextInsightLevel;
            tileState.insightExp.val = nextInsightExp;
            tileState.insightLevelInput.val = String(nextInsightLevel);
            tileState.insightExpInput.val = String(nextInsightExp);
            tileState.unlockedInput.val = nextUnlocked === 1;
        });
    };

    return div(
        {
            class: () =>
                [
                    "observation-tile",
                    tileState.unlockedInput.val ? "observation-tile--unlocked" : "",
                    isDirty.val ? "observation-tile--dirty" : "",
                    status.val === "success" ? "flash-success" : "",
                    status.val === "error" ? "flash-error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
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
                            tileState.unlockedInput.val ? "observation-tile__status--unlocked" : ""
                        }`,
                },
                () => (tileState.unlockedInput.val ? "UNLOCKED" : "LOCKED")
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
                        value: tileState.insightLevelInput,
                        oninput: (e) => (tileState.insightLevelInput.val = e.target.value),
                        onDecrement: () =>
                            (tileState.insightLevelInput.val = String(
                                Math.max(0, (Number(tileState.insightLevelInput.val) || 0) - 1)
                            )),
                        onIncrement: () =>
                            (tileState.insightLevelInput.val = String(
                                Math.max(0, (Number(tileState.insightLevelInput.val) || 0) + 1)
                            )),
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
                        value: tileState.insightExpInput,
                        oninput: (e) => (tileState.insightExpInput.val = e.target.value),
                        onDecrement: () =>
                            (tileState.insightExpInput.val = String(
                                Math.max(0, (Number(tileState.insightExpInput.val) || 0) - 1)
                            )),
                        onIncrement: () =>
                            (tileState.insightExpInput.val = String(
                                Math.max(0, (Number(tileState.insightExpInput.val) || 0) + 1)
                            )),
                    }),
                    span({ class: "observation-stat__value" }, () => `CUR ${tileState.insightExp.val}`)
                )
            )
        ),
        label(
            { class: "toggle-switch observation-tile__toggle" },
            input({
                type: "checkbox",
                checked: () => tileState.unlockedInput.val,
                disabled: () => status.val === "loading",
                onchange: (e) => (tileState.unlockedInput.val = e.target.checked),
            }),
            span({ class: "slider" }),
            span({ class: "label" }, "Unlock")
        ),
        button(
            {
                class: () => `feature-btn feature-btn--apply${status.val === "loading" ? " feature-btn--loading" : ""}`,
                disabled: () => status.val === "loading" || !isDirty.val,
                onclick: doSet,
            },
            () => (status.val === "loading" ? "..." : "SET")
        )
    );
};

export const ObservationsTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    const observationStates = Array.from({ length: OBSERVATION_COUNT }, () => ({
        name: van.state(""),
        unlocked: van.state(0),
        unlockedInput: van.state(false),
        insightLevel: van.state(0),
        insightLevelInput: van.state("0"),
        insightExp: van.state(0),
        insightExpInput: van.state("0"),
    }));

    const unlockedCount = van.derive(
        () => observationStates.reduce((count, tile) => count + (tile.unlockedInput.val ? 1 : 0), 0)
    );

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;

        try {
            const [rawUnlocks, rawInsightExp, rawInsightLevels, rawOccurrences] = await Promise.all([
                readGga("Research[2]"),
                readGga("Research[3]"),
                readGga("Research[4]"),
                readGga("CustomLists.h.Occurrences").catch(() => readGga("CustomLists.Occurrences")),
            ]);

            const occurrences = toIndexedArray(rawOccurrences);

            for (let index = 0; index < OBSERVATION_COUNT; index++) {
                const tile = observationStates[index];
                const occurrence = toIndexedArray(occurrences[index]);
                const unlocked = normalizeResearchValue(rawUnlocks, index, { round: true }) ? 1 : 0;
                const insightExp = normalizeResearchValue(rawInsightExp, index, { round: true });
                const insightLevel = normalizeResearchValue(rawInsightLevels, index);
                tile.name.val = cleanObservationName(occurrence[0], `Observation ${index + 1}`);
                tile.unlocked.val = unlocked;
                tile.unlockedInput.val = unlocked === 1;
                tile.insightExp.val = insightExp;
                tile.insightExpInput.val = String(insightExp);
                tile.insightLevel.val = insightLevel;
                tile.insightLevelInput.val = String(insightLevel);
            }

            markReady();
        } catch (e) {
            const message = e?.message ?? "Failed to load observations";
            if (!initialized.val) error.val = message;
            else refreshError.val = message;
        } finally {
            loading.val = false;
        }
    };

    load();

    const renderRefreshErrorBanner = RefreshErrorBanner({ error: refreshError });

    const tileGrid = div(
        { class: () => paneClass("observations-scroll scrollable-panel") },
        div(
            { class: "observations-summary" },
            span({ class: "observations-summary__label" }, "Unlocked"),
            span({ class: "observations-summary__value" }, () => `${unlockedCount.val} / ${OBSERVATION_COUNT}`)
        ),
        div(
            { class: "observations-grid" },
            ...observationStates.map((tileState, index) => ObservationTile({ index, tileState }))
        )
    );

    return div(
        { class: "tab-container" },
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "OBSERVATIONS"),
                p({ class: "feature-header__desc" }, "Edit unlock, insight level, and insight EXP per observation tile.")
            ),
            div({ class: "feature-header__actions" }, button({ class: "btn-secondary", onclick: load }, "REFRESH"))
        ),
        div(
            { class: "warning-banner" },
            Icons.Warning(),
            " Insight level and EXP are edited as integers. Press SET on a tile to write all three values."
        ),
        renderRefreshErrorBanner,
        () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),
        () =>
            !loading.val && error.val && !initialized.val
                ? EmptyState({ icon: Icons.SearchX(), title: "OBSERVATION LOAD FAILED", subtitle: error.val })
                : null,
        tileGrid
    );
};
