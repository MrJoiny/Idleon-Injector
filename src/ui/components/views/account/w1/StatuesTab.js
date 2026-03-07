/**
 * W1 — Statues Tab
 *
 * Data sources:
 *   cList.StatueInfo[i]  → [name, bonusDesc, ...]
 *   gga.StatueLevels[i]  → [level, deposited]
 *   gga.StatueG[i]       → tier: 0=Stone, 1=Gold, 2=Onyx, 3=Zenith
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p, select, option } = van.tags;

const TIERS = [
    { value: 0, label: "Stone" },
    { value: 1, label: "Gold" },
    { value: 2, label: "Onyx" },
    { value: 3, label: "Zenith" },
];

// ── StatueRow ─────────────────────────────────────────────────────────────

const StatueRow = ({ index, name, initialLevel, initialDeposited, initialTier }) => {
    const levelInput = van.state(String(initialLevel ?? 0));
    const depositedInput = van.state(String(initialDeposited ?? 0));
    const tierInput = van.state(initialTier ?? 0);
    const { status, run } = useWriteStatus();

    // Display states — updated locally on SET so the row reflects the new value
    // without triggering a full list re-render.
    const levelDisplay = van.state(initialLevel ?? 0);
    const depositedDisplay = van.state(initialDeposited ?? 0);
    const tierDisplay = van.state(initialTier ?? 0);

    const doSet = async () => {
        const lvl = Math.max(0, Number(levelInput.val));
        const dep = Math.max(0, Number(depositedInput.val));
        const tier = Number(tierInput.val);
        if (isNaN(lvl) || isNaN(dep)) return;

        await run(async () => {
            await writeGga(`StatueLevels[${index}][0]`, lvl);
            await writeGga(`StatueLevels[${index}][1]`, dep);
            await writeGga(`StatueG[${index}]`, tier);

            // Update display states locally — no page-wide re-render needed.
            levelDisplay.val = lvl;
            depositedDisplay.val = dep;
            tierDisplay.val = tier;
        });
    };

    return div(
        {
            class: () => {
                const tier = tierDisplay.val;
                const tierClass = ["", "tier--gold", "tier--onyx", "tier--zenith"][tier] ?? "";
                return `feature-row ${tierClass} ${status.val === "success" ? "feature-row--success" : ""} ${status.val === "error" ? "feature-row--error" : ""}`;
            },
        },

        // Name + tier badge
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__name" }, name),
            span(
                {
                    class: () => `statue-tier-badge tier--${["stone", "gold", "onyx", "zenith"][tierDisplay.val]}`,
                },
                () => TIERS[tierDisplay.val]?.label ?? "Stone"
            )
        ),

        // Level badge
        span({ class: "feature-row__badge" }, () => `LV ${levelDisplay.val}`),

        // Controls — staged inputs + SET to the right
        div(
            { class: "feature-row__controls" },
            div(
                { class: "feature-row__controls--stack" },

                // Row 1: Level
                div(
                    { class: "statue-control-row" },
                    span({ class: "statue-control-label" }, "Level"),
                    NumberInput({
                        value: levelInput,
                        oninput: (e) => (levelInput.val = e.target.value),
                        onDecrement: () => (levelInput.val = String(Math.max(0, Number(levelInput.val) - 1))),
                        onIncrement: () => (levelInput.val = String(Number(levelInput.val) + 1)),
                    })
                ),

                // Row 2: Deposited
                div(
                    { class: "statue-control-row" },
                    span({ class: "statue-control-label" }, "Deposited"),
                    NumberInput({
                        mode: "int",
                        value: depositedInput,
                        oninput: (e) => (depositedInput.val = e.target.value),
                        onDecrement: () => (depositedInput.val = String(Math.max(0, Number(depositedInput.val) - 1))),
                        onIncrement: () => (depositedInput.val = String(Number(depositedInput.val) + 1)),
                    })
                ),

                // Row 3: Tier (staged, not written until SET)
                div(
                    { class: "statue-control-row" },
                    span({ class: "statue-control-label" }, "Tier"),
                    select(
                        {
                            class: "statue-tier-select select-base",
                            onchange: (e) => (tierInput.val = Number(e.target.value)),
                            disabled: () => status.val === "loading",
                        },
                        ...TIERS.map((t) =>
                            option(
                                {
                                    value: t.value,
                                    selected: () => tierInput.val === t.value,
                                },
                                t.label
                            )
                        )
                    )
                )
            ),

            // Single SET button for all fields
            withTooltip(
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick: doSet,
                        disabled: () => status.val === "loading",
                    },
                    () => (status.val === "loading" ? "..." : "SET")
                ),
                "Write level, deposited, and tier to game"
            )
        )
    );
};

// ── StatuesTab ────────────────────────────────────────────────────────────

export const StatuesTab = () => {
    const data = van.state(null);
    const loading = van.state(false);
    const error = van.state(null);

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const [rawInfo, rawLevels, rawTiers] = await Promise.all([
                readGga("CustomLists.StatueInfo"),
                readGga("StatueLevels"),
                readGga("StatueG"),
            ]);
            data.val = {
                info: toIndexedArray(rawInfo),
                levels: toIndexedArray(rawLevels),
                tiers: toIndexedArray(rawTiers),
            };
        } catch (e) {
            error.val = e.message || "Failed to read statue data";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div(
        { class: "world-feature scroll-container" },

        div(
            { class: "feature-header" },
            div(
                null,
                h3("STATUES"),
                p({ class: "feature-header__desc" }, "Set statue levels, deposited amounts, and upgrade tiers")
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read statue data from game memory"
            )
        ),

        div(
            { class: "warning-banner" },
            Icons.Warning(),
            " Tier upgrades require specific tools: ",
            span({ class: "warning-highlight-accent" }, "Guilding Tools"),
            " for Gold, ",
            span({ class: "warning-highlight-onyx" }, "Onyx Tools"),
            " for Onyx, ",
            span({ class: "warning-highlight-zenith" }, "Zenith Tools"),
            " for Zenith. Note that this is only visual to the StatueMan in W1, when set to any rarity it will give their full bonus"
        ),

        () => {
            if (loading.val)
                return div(
                    { class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING STATUES" }))
                );
            if (error.val)
                return div(
                    { class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "STATUE READ FAILED", subtitle: error.val })
                );
            if (!data.val) return div({ class: "feature-list" });

            const statues = (data.val.info ?? [])
                .map((entry, i) => ({ index: i, name: entry?.[0] }))
                .filter((s) => s.name && s.name.trim().length > 0);

            if (statues.length === 0)
                return div(
                    { class: "feature-list" },
                    EmptyState({
                        icon: Icons.SearchX(),
                        title: "NO STATUE DATA",
                        subtitle: "Ensure the game is running, then hit REFRESH",
                    })
                );

            return div(
                { class: "feature-list" },
                ...statues.map((s) =>
                    StatueRow({
                        index: s.index,
                        name: s.name,
                        initialLevel: data.val.levels?.[s.index]?.[0] ?? 0,
                        initialDeposited: data.val.levels?.[s.index]?.[1] ?? 0,
                        initialTier: data.val.tiers?.[s.index] ?? 0,
                    })
                )
            );
        }
    );
};
