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
import { gga } from "../../../../services/api.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { runPersistentAccountLoad } from "../accountLoadPolicy.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { usePersistentPaneReady } from "../featureShared.js";

const { div, button, span } = van.tags;

const CATEGORIES = [
    { label: "Money Points", index: 1, max: 600 },
    { label: "Monster Part Points", index: 2, max: 700 },
    { label: "Bonus Exp", index: 3, max: null },
    { label: "Speed/hr", index: 4, max: null },
    { label: "Capacity", index: 5, max: null },
];

const AnvilRow = ({ category, valueState, onSetApplied }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => {
            const raw = Number(rawValue);
            if (Number.isNaN(raw)) return null;
            return Math.max(0, category.max !== null ? Math.min(category.max, raw) : raw);
        },
        write: async (nextValue) => {
            const path = `AnvilPAstats[${category.index}]`;
            const ok = await gga(path, nextValue);
            if (!ok) throw new Error(`Write mismatch at ${path}`);
            await onSetApplied?.(category.index, nextValue);
            return valueState.val ?? nextValue;
        },
        renderInfo: () => [
            span({ class: "feature-row__name" }, category.label),
            category.max !== null ? span({ class: "feature-row__index" }, `max ${category.max}`) : null,
        ],
        renderBadge: (currentValue) =>
            category.max !== null ? `${currentValue ?? 0} / ${category.max}` : `${currentValue ?? 0} pts`,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const next = Number.isFinite(base) ? base : Number(currentValue ?? 0);
            const adjusted = next + delta;
            return Math.max(0, category.max !== null ? Math.min(category.max, adjusted) : adjusted);
        },
        wrapApplyButton: (applyButton) =>
            withTooltip(
                applyButton,
                category.max !== null
                    ? `Set value (clamped to max ${category.max})`
                    : `Set allocated points for ${category.label}`
            ),
        maxAction: category.max !== null ? { value: category.max, tooltip: `Set to maximum (${category.max})` } : null,
        resetAction: category.max === null ? { tooltip: `Reset ${category.label} to 0` } : null,
    });

export const AnvilTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const statStates = Array.from({ length: 6 }, () => van.state(0));
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    const load = async () =>
        runPersistentAccountLoad(
            {
                loading,
                error,
                refreshError,
                initialized,
                markReady,
                label: "Anvil",
                fallbackMessage: "Failed to read anvil data",
            },
            async () => {
            const raw = await gga("AnvilPAstats");
            const arr = toIndexedArray(raw);
            for (let i = 0; i < statStates.length; i++) {
                statStates[i].val = Number(arr[i] ?? 0);
            }
        }
        );

    const applyStatUpdate = async (index, value) => {
        statStates[index].val = value;

        // Keep "Points Remaining" fresh without forcing a list rebuild.
        try {
            const remainingRaw = await gga("AnvilPAstats[0]");
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
    return AccountPageShell({
        rootClass: "world-feature scroll-container feature-tab-frame",
        header: FeatureTabHeader({
            title: "ANVIL",
            description: "Manage point allocation for Bonus Exp, Speed/hr, and Capacity",
            actions: withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read anvil stats from game memory"
            ),
        }),
        topNotices: div(
            { class: "warning-banner" },
            Icons.Warning(),
            " You must have a character selected in-game for point changes to take effect. ",
            "Open the Anvil in-game or points won't update properly."
        ),
        persistentState: { loading, error, refreshError, initialized },
        persistentLoadingText: "READING ANVIL",
        persistentErrorTitle: "ANVIL READ FAILED",
        persistentInitialWrapperClass: "feature-list",
        body: rowList,
    });
};
