/**
 * W1 — Anvil Tab
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
import { readMany, writeAttr } from "../../../../helpers/gameHelper.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";

const { div, button, span, h3, p } = van.tags;

const CATEGORIES = [
    { label: "Money Points",          index: 1, max: 600  },
    { label: "Monster Part Points",   index: 2, max: 700  },
    { label: "Bonus Exp",             index: 3, max: null },
    { label: "Speed/hr",              index: 4, max: null },
    { label: "Capacity",              index: 5, max: null },
];

// ── AnvilRow ──────────────────────────────────────────────────────────────

const AnvilRow = ({ category, getStats, onReload }) => {
    const inputVal = van.state(String(getStats()?.[category.index] ?? 0));
    const status   = van.state(null);

    const doSet = async (targetVal) => {
        const raw = Number(targetVal);
        if (isNaN(raw)) return;
        const pts = Math.max(0, category.max !== null ? Math.min(category.max, raw) : raw);
        status.val = "loading";
        try {
            await writeAttr(`bEngine.getGameAttribute("AnvilPAstats")[${category.index}] = ${pts}`);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
            // Small delay so the game has time to commit the write before we re-read
            await new Promise((resolve) => setTimeout(resolve, 300));
            const fresh = await onReload?.();
            inputVal.val = String(fresh?.[category.index] ?? pts);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () =>
                `feature-row ${status.val === "success" ? "feature-row--success" : ""} ${
                    status.val === "error" ? "feature-row--error" : ""
                }`,
        },
        div({ class: "feature-row__info" },
            span({ class: "feature-row__name" }, category.label),
            category.max !== null
                ? span({ class: "feature-row__index" }, `max ${category.max}`)
                : null
        ),
        span({ class: "feature-row__badge" },
            () => {
                const val = getStats()?.[category.index] ?? 0;
                return category.max !== null ? `${val} / ${category.max}` : `${val} pts`;
            }
        ),
        div({ class: "feature-row__controls" },
            NumberInput({
                value:       inputVal,
                oninput:     (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            withTooltip(
                button({
                    class:    () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    onclick:  () => doSet(inputVal.val),
                    disabled: () => status.val === "loading",
                }, () => (status.val === "loading" ? "..." : "SET")),
                category.max !== null
                    ? `Set value (clamped to max ${category.max})`
                    : `Set allocated points for ${category.label}`
            ),
            category.max !== null
                ? withTooltip(
                    button({
                        class:    "feature-btn feature-btn--danger",
                        onclick:  () => doSet(category.max),
                        disabled: () => status.val === "loading",
                    }, "MAX"),
                    `Set to maximum (${category.max})`
                )
                : withTooltip(
                    button({
                        class:    "feature-btn feature-btn--danger",
                        onclick:  () => doSet(0),
                        disabled: () => status.val === "loading",
                    }, "RESET"),
                    `Reset ${category.label} to 0`
                )
        )
    );
};

// ── AnvilTab ──────────────────────────────────────────────────────────────

export const AnvilTab = () => {
    const stats   = van.state(null);
    const loading = van.state(false);
    const error   = van.state(null);

    // Returns fresh array from game, also updates reactive stats
    const load = async () => {
        loading.val = true;
        error.val   = null;
        try {
            const data = await readMany({
                anvilStats: `bEngine.getGameAttribute("AnvilPAstats")`,
            });
            const raw = data.anvilStats;
            const arr = Array.isArray(raw)
                ? raw
                : Object.keys(raw).sort((a, b) => a - b).map((k) => raw[k]);
            stats.val = arr;
            return arr;
        } catch (e) {
            error.val = e.message || "Failed to read anvil data";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div({ class: "world-feature scroll-container" },

        div({ class: "feature-header" },
            div(null,
                h3("ANVIL"),
                p({ class: "feature-header__desc" }, "Manage point allocation for Bonus Exp, Speed/hr, and Capacity")
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read anvil stats from game memory"
            )
        ),

        div({ class: "warning-banner" },
            "⚠ You must have a character selected in-game for point changes to take effect. ",
            "Open the Anvil in-game at least once per session for Points Remaining to load correctly."
        ),

        () => {
            if (loading.val)
                return div({ class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING ANVIL" }))
                );

            if (error.val)
                return div({ class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "ANVIL READ FAILED", subtitle: error.val })
                );

            if (!stats.val) return div({ class: "feature-list" });

            return div({ class: "feature-list" },

                // Points remaining — always read from game (index 0)
                div({ class: "feature-row feature-row--info" },
                    div({ class: "feature-row__info" },
                        span({ class: "feature-row__name" }, "Points Remaining"),

                    ),
                    span({ class: "feature-row__badge feature-row__badge--highlight" },
                        () => `${stats.val?.[0] ?? 0} pts`
                    )
                ),

                ...CATEGORIES.map((cat) =>
                    AnvilRow({
                        category: cat,
                        getStats: () => stats.val,
                        onReload: load,
                    })
                )
            );
        }
    );
};
