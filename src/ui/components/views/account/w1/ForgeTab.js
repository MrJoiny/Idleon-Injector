/**
 * W1 — Forge Tab
 *
 * FurnaceLevels layout (indices 0–5, index 6 = XP progress, ignored):
 *   Page 1:
 *     [0] New Forge Slot      — max 16
 *     [1] Ore Capacity Boost  — max 50
 *     [2] Forge Speed         — max 90
 *   Page 2:
 *     [3] Forge EXP Gain      — max 85
 *     [4] Bar Bonanza         — max 75
 *     [5] Puff Puff Go        — max 60
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readMany, writeAttr } from "../../../../helpers/gameHelper.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";

const { div, button, span, h3, p } = van.tags;

const PAGES = [
    {
        id: 0,
        label: "PAGE 1",
        upgrades: [
            { label: "New Forge Slot",     index: 0, max: 16 },
            { label: "Ore Capacity Boost", index: 1, max: 50 },
            { label: "Forge Speed",        index: 2, max: 90 },
        ],
    },
    {
        id: 1,
        label: "PAGE 2",
        upgrades: [
            { label: "Forge EXP Gain", index: 3, max: 85 },
            { label: "Bar Bonanza",    index: 4, max: 75 },
            { label: "Puff Puff Go",   index: 5, max: 60 },
        ],
    },
];

// ── ForgeRow ──────────────────────────────────────────────────────────────

const ForgeRow = ({ upgrade, levels, onReload }) => {
    const inputVal = van.state(String(levels.val?.[upgrade.index] ?? 0));
    const status   = van.state(null);

    van.derive(() => {
        inputVal.val = String(levels.val?.[upgrade.index] ?? 0);
    });

    const doSet = async (targetVal) => {
        const lvl = Math.min(upgrade.max, Math.max(0, Number(targetVal)));
        if (isNaN(lvl)) return;
        status.val = "loading";
        try {
            await writeAttr(`bEngine.getGameAttribute("FurnaceLevels")[${upgrade.index}] = ${lvl}`);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
            await onReload?.();
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
            span({ class: "feature-row__name" }, upgrade.label)
        ),
        span({ class: "feature-row__badge" },
            () => `LV ${levels.val?.[upgrade.index] ?? 0} / ${upgrade.max}`
        ),
        div({ class: "feature-row__controls" },
            NumberInput({
                value:       inputVal,
                oninput:     (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Math.min(upgrade.max, Number(inputVal.val) + 1))),
            }),
            withTooltip(
                button({
                    class:    () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    onclick:  () => doSet(inputVal.val),
                    disabled: () => status.val === "loading",
                }, () => (status.val === "loading" ? "..." : "SET")),
                `Set level (max ${upgrade.max})`
            ),
            withTooltip(
                button({
                    class:    "feature-btn feature-btn--danger",
                    onclick:  () => doSet(upgrade.max),
                    disabled: () => status.val === "loading",
                }, "MAX"),
                `Set to max level (${upgrade.max})`
            )
        )
    );
};

// ── ForgeTab ──────────────────────────────────────────────────────────────

export const ForgeTab = () => {
    const activePage = van.state(0);
    const levels     = van.state(null);
    const loading    = van.state(false);
    const error      = van.state(null);

    const load = async () => {
        loading.val = true;
        error.val   = null;
        try {
            const data = await readMany({
                furnaceLevels: `bEngine.getGameAttribute("FurnaceLevels")`,
            });
            const raw = data.furnaceLevels;
            levels.val = Array.isArray(raw)
                ? raw
                : Object.keys(raw).sort((a, b) => a - b).map((k) => raw[k]);
        } catch (e) {
            error.val = e.message || "Failed to read forge data";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div({ class: "world-feature scroll-container" },

        div({ class: "feature-header" },
            div(null,
                h3("FORGE"),
                p({ class: "feature-header__desc" }, "Set forge upgrade levels — each upgrade has a hard maximum")
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read forge levels from game memory"
            )
        ),

        // Page tabs
        div({ class: "feature-page-nav" },
            ...PAGES.map((pg) =>
                button({
                    class:   () => `feature-page-btn ${activePage.val === pg.id ? "active" : ""}`,
                    onclick: () => (activePage.val = pg.id),
                }, pg.label)
            )
        ),

        () => {
            if (loading.val)
                return div({ class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING FORGE" }))
                );

            if (error.val)
                return div({ class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "FORGE READ FAILED", subtitle: error.val })
                );

            if (!levels.val) return div({ class: "feature-list" });

            const page = PAGES[activePage.val];

            return div({ class: "feature-list" },
                ...page.upgrades.map((upgrade) =>
                    ForgeRow({ upgrade, levels, onReload: load })
                )
            );
        }
    );
};
