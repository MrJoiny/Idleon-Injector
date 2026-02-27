/**
 * W1 — Statues Tab
 *
 * Data sources:
 *   cList.StatueInfo[i]  → [name, bonusDesc, ...]
 *   gga.StatueLevels[i]  → [level, deposited]
 *   gga.StatueG[i]       → tier: 0=Stone, 1=Gold, 2=Onyx, 3=Zenith
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readMany, writeAttr } from "../../../../helpers/gameHelper.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";

const { div, button, span, h3, p, select, option } = van.tags;

const TIERS = [
    { value: 0, label: "Stone"  },
    { value: 1, label: "Gold"   },
    { value: 2, label: "Onyx"   },
    { value: 3, label: "Zenith" },
];

// ── StatueRow ─────────────────────────────────────────────────────────────

const StatueRow = ({ index, name, getData, onReload }) => {
    const levelInput     = van.state(String(getData()?.levels?.[index]?.[0] ?? 0));
    const depositedInput = van.state(String(getData()?.levels?.[index]?.[1] ?? 0));
    const status         = van.state(null);

    const write = async (expr) => {
        await writeAttr(expr);
        await new Promise((r) => setTimeout(r, 300));
        return onReload?.();
    };

    const doSetLevel = async (targetVal) => {
        const lvl = Math.max(0, Number(targetVal));
        if (isNaN(lvl)) return;
        status.val = "loading";
        try {
            const fresh = await write(`gga.StatueLevels[${index}][0] = ${lvl}`);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
            levelInput.val = String(fresh?.levels?.[index]?.[0] ?? lvl);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    const doSetDeposited = async (targetVal) => {
        const amt = Math.max(0, Number(targetVal));
        if (isNaN(amt)) return;
        status.val = "loading";
        try {
            const fresh = await write(`gga.StatueLevels[${index}][1] = ${amt}`);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
            depositedInput.val = String(fresh?.levels?.[index]?.[1] ?? amt);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    const doSetTier = async (tierVal) => {
        const tier = Number(tierVal);
        status.val = "loading";
        try {
            await write(`gga.StatueG[${index}] = ${tier}`);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => {
                const tier = getData()?.tiers?.[index] ?? 0;
                const tierClass = ["", "tier--gold", "tier--onyx", "tier--zenith"][tier] ?? "";
                return `feature-row ${tierClass} ${status.val === "success" ? "feature-row--success" : ""} ${status.val === "error" ? "feature-row--error" : ""}`;
            },
        },

        // Name + tier badge
        div({ class: "feature-row__info" },
            span({ class: "feature-row__name" }, name),
            span({
                class: () => `statue-tier-badge tier--${["stone","gold","onyx","zenith"][getData()?.tiers?.[index] ?? 0]}`
            }, () => TIERS[getData()?.tiers?.[index] ?? 0]?.label ?? "Stone")
        ),

        // Level badge
        span({ class: "feature-row__badge" },
            () => `LV ${getData()?.levels?.[index]?.[0] ?? 0}`
        ),

        // Controls — two input groups stacked
        div({ class: "feature-row__controls feature-row__controls--stack" },

            // Row 1: Level
            div({ class: "statue-control-row" },
                span({ class: "statue-control-label" }, "Level"),
                NumberInput({
                    value:       levelInput,
                    oninput:     (e) => (levelInput.val = e.target.value),
                    onDecrement: () => (levelInput.val = String(Math.max(0, Number(levelInput.val) - 1))),
                    onIncrement: () => (levelInput.val = String(Number(levelInput.val) + 1)),
                }),
                withTooltip(
                    button({
                        class:    () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick:  () => doSetLevel(levelInput.val),
                        disabled: () => status.val === "loading",
                    }, () => (status.val === "loading" ? "..." : "SET")),
                    "Set statue level"
                ),
            ),

            // Row 2: Deposited
            div({ class: "statue-control-row" },
                span({ class: "statue-control-label" }, "Deposited"),
                NumberInput({
                    value:       depositedInput,
                    oninput:     (e) => (depositedInput.val = e.target.value),
                    onDecrement: () => (depositedInput.val = String(Math.max(0, Number(depositedInput.val) - 1))),
                    onIncrement: () => (depositedInput.val = String(Number(depositedInput.val) + 1)),
                }),
                withTooltip(
                    button({
                        class:    () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick:  () => doSetDeposited(depositedInput.val),
                        disabled: () => status.val === "loading",
                    }, () => (status.val === "loading" ? "..." : "SET")),
                    "Set amount deposited"
                ),
            ),

            // Row 3: Tier
            div({ class: "statue-control-row" },
                span({ class: "statue-control-label" }, "Tier"),
                select({
                    class:    "statue-tier-select",
                    onchange: (e) => doSetTier(e.target.value),
                    disabled: () => status.val === "loading",
                },
                    ...TIERS.map((t) =>
                        option({
                            value:    t.value,
                            selected: () => (getData()?.tiers?.[index] ?? 0) === t.value,
                        }, t.label)
                    )
                )
            )
        )
    );
};

// ── StatuesTab ────────────────────────────────────────────────────────────

export const StatuesTab = () => {
    const data    = van.state(null);
    const loading = van.state(false);
    const error   = van.state(null);

    const load = async () => {
        loading.val = true;
        error.val   = null;
        try {
            const result = await readMany({
                info:   `cList.StatueInfo`,
                levels: `gga.StatueLevels`,
                tiers:  `gga.StatueG`,
            });
            const toArr = (raw) => Array.isArray(raw)
                ? raw
                : Object.keys(raw).sort((a, b) => a - b).map((k) => raw[k]);
            data.val = {
                info:   toArr(result.info),
                levels: toArr(result.levels),
                tiers:  toArr(result.tiers),
            };
            return data.val;
        } catch (e) {
            error.val = e.message || "Failed to read statue data";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div({ class: "world-feature scroll-container" },

        div({ class: "feature-header" },
            div(null,
                h3("STATUES"),
                p({ class: "feature-header__desc" }, "Set statue levels, deposited amounts, and upgrade tiers")
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read statue data from game memory"
            )
        ),

        div({ class: "warning-banner" },
            "⚠ Tier upgrades require specific tools: ",
            span({ style: "color:var(--c-accent);font-weight:700;" }, "Guilding Tools"),
            " for Gold, ",
            span({ style: "color:#b06aff;font-weight:700;" }, "Onyx Tools"),
            " for Onyx, ",
            span({ style: "color:#00e5ff;font-weight:700;" }, "Zenith Tools"),
            " for Zenith. Use the Power statue first — it unlocks the tier for all others."
        ),

        () => {
            if (loading.val)
                return div({ class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING STATUES" }))
                );
            if (error.val)
                return div({ class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "STATUE READ FAILED", subtitle: error.val })
                );
            if (!data.val) return div({ class: "feature-list" });

            const statues = (data.val.info ?? [])
                .map((entry, i) => ({ index: i, name: entry?.[0] }))
                .filter((s) => s.name && s.name.trim().length > 0);

            if (statues.length === 0)
                return div({ class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "NO STATUE DATA", subtitle: "Ensure the game is running, then hit REFRESH" })
                );

            return div({ class: "feature-list" },
                ...statues.map((s) =>
                    StatueRow({ index: s.index, name: s.name, getData: () => data.val, onReload: load })
                )
            );
        }
    );
};
