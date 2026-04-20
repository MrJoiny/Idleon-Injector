/**
 * W1 — Statues Tab
 *
 * Data sources:
 *   cList.StatueInfo[i]  → [name, bonusDesc, ...]
 *   gga.StatueLevels[i]  → [level, deposited]
 *   gga.StatueG[i]       → tier: 0=Stone, 1=Gold, 2=Onyx, 3=Zenith
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { useAccountLoadState } from "../accountLoadPolicy.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { AsyncFeatureBody, useWriteStatus, writeVerified } from "../featureShared.js";

const { div, button, span, select, option } = van.tags;

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
            const levelPath = `StatueLevels[${index}][0]`;
            const depPath = `StatueLevels[${index}][1]`;
            const tierPath = `StatueG[${index}]`;
            await writeVerified(levelPath, lvl);
            await writeVerified(depPath, dep);
            await writeVerified(tierPath, tier);

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
    const { loading, error, run } = useAccountLoadState({ label: "Statues" });

    const load = async () =>
        run(async () => {
            const [rawInfo, rawLevels, rawTiers] = await Promise.all([
                readCList("StatueInfo"),
                gga("StatueLevels"),
                gga("StatueG"),
            ]);
            data.val = {
                info: toIndexedArray(rawInfo),
                levels: toIndexedArray(rawLevels),
                tiers: toIndexedArray(rawTiers),
            };
        });

    load();

    return AccountPageShell({
        rootClass: "world-feature scroll-container feature-tab-frame",
        header: FeatureTabHeader({
            title: "STATUES",
            description: "Set statue levels, deposited amounts, and upgrade tiers",
            actions: withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read statue data from game memory"
            ),
        }),
        topNotices: div(
            { class: "warning-banner" },
            Icons.Warning(),
            " Tier upgrades require specific tools: ",
            span({ class: "warning-highlight-accent" }, "Guilding Tools"),
            " for Gold, ",
            span({ class: "warning-highlight-onyx" }, "Onyx Tools"),
            " for Onyx, ",
            span({ class: "warning-highlight-zenith" }, "Zenith Tools"),
            " for Zenith. Note that this is only visual to the StatueMan in W1; when set to any rarity it will give their full bonus"
        ),
        body: AsyncFeatureBody({
            loading,
            error,
            data,
            isEmpty: (resolved) =>
                !(resolved.info ?? [])
                    .map((entry, index) => ({ index, name: entry?.[0] }))
                    .filter((statue) => statue.name && statue.name.trim().length > 0).length,
            renderEmpty: () =>
                EmptyState({
                    icon: Icons.SearchX(),
                    title: "NO STATUE DATA",
                    subtitle: "Ensure the game is running, then hit REFRESH",
                }),
            renderContent: (resolved) => {
                const statues = (resolved.info ?? [])
                    .map((entry, index) => ({ index, name: entry?.[0] }))
                    .filter((statue) => statue.name && statue.name.trim().length > 0);

                return div(
                    { class: "feature-list" },
                    ...statues.map((statue) =>
                        StatueRow({
                            index: statue.index,
                            name: statue.name,
                            initialLevel: resolved.levels?.[statue.index]?.[0] ?? 0,
                            initialDeposited: resolved.levels?.[statue.index]?.[1] ?? 0,
                            initialTier: resolved.tiers?.[statue.index] ?? 0,
                        })
                    )
                );
            },
        }),
    });
};
