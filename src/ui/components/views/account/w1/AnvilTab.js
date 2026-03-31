/**
 * W1 - Anvil Tab
 *
 * AnvilPAstats layout:
 *   [0] = points remaining  (read from game after every change)
 *   [1] = Points bought with money        (max 600)
 *   [2] = Points bought with monster parts (max 700)
 *   [3] = Bonus Exp  (allocated)
 *   [4] = Speed/hr   (allocated)
 *   [5] = Capacity   (allocated)
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { RefreshErrorBanner, usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

const CATEGORIES = [
    { label: "Money Points", index: 1, max: 600 },
    { label: "Monster Part Points", index: 2, max: 700 },
    { label: "Bonus Exp", index: 3, max: null },
    { label: "Speed/hr", index: 4, max: null },
    { label: "Capacity", index: 5, max: null },
];

const AnvilRow = ({ category, valueState, onSetApplied }) => {
    const inputVal = van.state(String(valueState.val ?? 0));
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(valueState.val ?? 0);
    });

    const doSet = async (targetVal) => {
        const raw = Number(targetVal);
        if (isNaN(raw)) return;
        const pts = Math.max(0, category.max !== null ? Math.min(category.max, raw) : raw);

        await run(async () => {
            const path = `AnvilPAstats[${category.index}]`;
            await writeGga(path, pts);
            const verified = Math.max(0, Math.round(Number(await readGga(path))));
            if (verified !== pts) throw new Error(`Write mismatch at ${path}: expected ${pts}, got ${verified}`);
            await onSetApplied?.(category.index, verified);
            inputVal.val = String(valueState.val ?? verified);
        });
    };

    return div(
        {
            class: () =>
                `feature-row ${status.val === "success" ? "feature-row--success" : ""} ${
                    status.val === "error" ? "feature-row--error" : ""
                }`,
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__name" }, category.label),
            category.max !== null ? span({ class: "feature-row__index" }, `max ${category.max}`) : null
        ),
        span({ class: "feature-row__badge" }, () => {
            const val = valueState.val ?? 0;
            return category.max !== null ? `${val} / ${category.max}` : `${val} pts`;
        }),
        div(
            { class: "feature-row__controls" },
            NumberInput({
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            withTooltip(
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick: () => doSet(inputVal.val),
                        disabled: () => status.val === "loading",
                    },
                    () => (status.val === "loading" ? "..." : "SET")
                ),
                category.max !== null
                    ? `Set value (clamped to max ${category.max})`
                    : `Set allocated points for ${category.label}`
            ),
            category.max !== null
                ? withTooltip(
                      button(
                          {
                              class: "feature-btn feature-btn--danger",
                              onclick: () => doSet(category.max),
                              disabled: () => status.val === "loading",
                          },
                          "MAX"
                      ),
                      `Set to maximum (${category.max})`
                  )
                : withTooltip(
                      button(
                          {
                              class: "feature-btn feature-btn--danger",
                              onclick: () => doSet(0),
                              disabled: () => status.val === "loading",
                          },
                          "RESET"
                      ),
                      `Reset ${category.label} to 0`
                  )
        )
    );
};

export const AnvilTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const statStates = Array.from({ length: 6 }, () => van.state(0));
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        try {
            const raw = await readGga("AnvilPAstats");
            const arr = toIndexedArray(raw);
            for (let i = 0; i < statStates.length; i++) {
                statStates[i].val = Number(arr[i] ?? 0);
            }
            markReady();
        } catch (e) {
            const message = e.message || "Failed to read anvil data";
            if (!initialized.val) error.val = message;
            else refreshError.val = message;
        } finally {
            loading.val = false;
        }
    };

    const applyStatUpdate = async (index, value) => {
        statStates[index].val = value;

        // Keep "Points Remaining" fresh without forcing a list rebuild.
        try {
            const remainingRaw = await readGga("AnvilPAstats[0]");
            const remaining = Number(remainingRaw);
            if (Number.isFinite(remaining)) statStates[0].val = remaining;
        } catch {
            // Best-effort refresh only; keep optimistic state if read fails.
        }
    };

    load();

    const rowList = div(
        { class: () => paneClass("feature-list") },
        div(
            { class: "feature-row feature-row--info" },
            span({ class: "feature-row__name" }, "Points Remaining"),
            span({ class: "feature-row__badge feature-row__badge--highlight" }, () => `${statStates[0].val ?? 0} pts`)
        ),
        ...CATEGORIES.map((cat) =>
            AnvilRow({
                category: cat,
                valueState: statStates[cat.index],
                onSetApplied: applyStatUpdate,
            })
        )
    );
    const renderRefreshErrorBanner = RefreshErrorBanner({ error: refreshError });

    return div(
        { class: "world-feature scroll-container" },
        div(
            { class: "feature-header" },
            div(
                null,
                h3("ANVIL"),
                p({ class: "feature-header__desc" }, "Manage point allocation for Bonus Exp, Speed/hr, and Capacity")
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read anvil stats from game memory"
            )
        ),
        div(
            { class: "warning-banner" },
            Icons.Warning(),
            " You must have a character selected in-game for point changes to take effect. ",
            "Open the Anvil in-game or points won't update properly."
        ),
        renderRefreshErrorBanner,
        () =>
            loading.val && !initialized.val
                ? div({ class: "feature-list" }, div({ class: "feature-loader" }, Loader({ text: "READING ANVIL" })))
                : null,
        () =>
            !loading.val && error.val && !initialized.val
                ? div(
                      { class: "feature-list" },
                      EmptyState({ icon: Icons.SearchX(), title: "ANVIL READ FAILED", subtitle: error.val })
                  )
                : null,
        rowList
    );
};
