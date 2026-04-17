/**
 * W2 — Pay 2 Win Tab (Alchemy P2W)
 *
 * Data paths (all within CauldronP2W):
 *   [0][f + 3*e]   → Brewing cauldrons  (e = cauldron 0..3, f = upgrade 0..2)
 *   [1][f + 2*e]   → Liquid cauldrons   (e = liquid 0..3,   f = upgrade 0..1)
 *   [2][e]         → Vials upgrades     (e = 0..1)
 *   [3][e]         → Player boosts      (e = 0..1)
 *
 * Sigils (CauldronP2W[4]) are managed in SigilTab.
 * CauldronP2W[5] is intentionally omitted (not a valid P2W category).
 *
 * Max levels via readComputedMany("alchemy", "CauldronLvMAX", [[b, e, ""+f], ...]).
 *
 * Row labels — hardcoded (no accessible runtime source for these strings):
 *   Brewing:        Speed / New Bubble / Boost Req  (f = 0 / 1 / 2)
 *   Liquid:         Regen / Capacity                (f = 0 / 1)
 *   Vials upgrades: Attempts / RNG                  (e = 0 / 1)
 *   Player boosts:  Alch Spd / Extra EXP            (e = 0 / 1)
 *
 * Hardcoded column names (cannot be sourced at runtime):
 *   Brewing cauldron names — user-specified.
 *   Liquid column names    — same constraint as LiquidTab.js.
 *
 * Re-render strategy:
 *   All states created once; load() updates them in-place.
 *   DOM built once, hidden via CSS until first load.
 *   Individual SET operations never trigger a re-render.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readComputedMany } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button, span } = van.tags;

// ── Hardcoded column names (cannot be sourced at runtime) ──────────────────

// Brewing cauldron column headers — user-specified; match in-game names.
const BREW_CAULDRONS = [
    { label: "POWER CAULDRON", tone: "brew-power" },
    { label: "QUICC CAULDRON", tone: "brew-quicc" },
    { label: "HIGH-IQ CAULDRON", tone: "brew-high-iq" },
    { label: "KAZAM CAULDRON", tone: "brew-kazam" },
];

// Liquid column headers — identical constraint to LiquidTab.js.
const LIQUID_COLS = [
    { label: "WATER DROPLETS", tone: "liquid-water-droplets" },
    { label: "LIQUID NITROGEN", tone: "liquid-nitrogen" },
    { label: "TRENCH SEAWATER", tone: "liquid-trench-seawater" },
    { label: "TOXIC MERCURY", tone: "liquid-toxic-mercury" },
];

// ── Hardcoded row labels ────────────────────────────────────────────────────
// No accessible runtime path for these strings; values confirmed in-game.

// Brewing: f = 0 → Speed,  f = 1 → New Bubble,  f = 2 → Boost Req
const BREW_ROW_LABELS = ["SPEED", "NEW BUBBLE", "BOOST REQ"];

// Liquid: f = 0 → Regen,  f = 1 → Capacity
const LIQ_ROW_LABELS = ["REGEN", "CAPACITY"];

// Vials P2W: e = 0 → Attempts,  e = 1 → RNG
const VIALS_UPG_LABELS = ["ATTEMPTS", "RNG"];

// Player boosts: e = 0 → Alch Spd,  e = 1 → Extra EXP
const PLAYER_LABELS = ["ALCH SPD", "EXTRA EXP"];
const DRACONIC_LABELS = ["COUNT"];

// ── Helpers ────────────────────────────────────────────────────────────────

// ── P2WRow ─────────────────────────────────────────────────────────────────

const P2WRow = ({ label, valueState, maxState, writePath }) => {
    const inputVal = van.state(String(valueState.val));
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(valueState.val);
    });

    const doSet = async (raw) => {
        const parsed = Math.max(0, Math.round(Number(raw)));
        if (isNaN(parsed)) return;
        const max = Number(maxState.val);
        const val = max > 0 ? Math.min(max, parsed) : parsed;
        await run(async () => {
            const ok = await gga(writePath, val);
            if (!ok) throw new Error(`Write mismatch at ${writePath}: expected ${val}`);
            valueState.val = val;
            inputVal.val = String(val);
        });
    };

    return div(
        {
            class: () =>
                [
                    "p2w-row",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        span({ class: "p2w-row__label" }, label),
        span({ class: "p2w-row__badge" }, () => {
            const cur = valueState.val;
            const max = maxState.val;
            return max > 0 ? `${cur} / ${max}` : String(cur);
        }),
        div(
            { class: "p2w-row__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => {
                    const max = Number(maxState.val);
                    const next = Number(inputVal.val) + 1;
                    inputVal.val = String(max > 0 ? Math.min(max, next) : next);
                },
            }),
            button(
                {
                    class: () =>
                        `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => (status.val === "loading" ? "…" : "SET")
            )
        )
    );
};

// ── Pay2WinTab ─────────────────────────────────────────────────────────────

export const Pay2WinTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    // ── Value & max states — created once, updated in-place ───────────────

    // Brewing: 4 cauldrons × 3 upgrades
    const brewVal = Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => van.state(0)));
    const brewMax = Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => van.state(0)));

    // Liquid: 4 liquids × 2 upgrades
    const liqVal = Array.from({ length: 4 }, () => Array.from({ length: 2 }, () => van.state(0)));
    const liqMax = Array.from({ length: 4 }, () => Array.from({ length: 2 }, () => van.state(0)));

    // Vials upgrades: 2 rows
    const vialsUpgVal = Array.from({ length: 2 }, () => van.state(0));
    const vialsUpgMax = Array.from({ length: 2 }, () => van.state(0));

    // Draconic cauldrons (OptionsListAccount[123]): fixed range 0..4
    const draconicVal = van.state(0);
    const draconicMax = van.state(4);

    // Player boosts: 2 rows
    const playerVal = Array.from({ length: 2 }, () => van.state(0));
    const playerMax = Array.from({ length: 2 }, () => van.state(0));

    // ── Load ───────────────────────────────────────────────────────────────

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        try {
            const [rawP2W, rawDraconic] = await Promise.all([gga("CauldronP2W"), gga("OptionsListAccount[123]")]);
            const p2w = toIndexedArray(rawP2W ?? []);
            const brew0 = toIndexedArray(p2w[0] ?? []);
            const liq1 = toIndexedArray(p2w[1] ?? []);
            const via2 = toIndexedArray(p2w[2] ?? []);
            const plr3 = toIndexedArray(p2w[3] ?? []);
            const draconicRaw = Number(rawDraconic ?? 0);
            const draconic = Number.isFinite(draconicRaw) ? Math.min(4, Math.max(0, draconicRaw)) : 0;

            // Fill values
            for (let e = 0; e < 4; e++) for (let f = 0; f < 3; f++) brewVal[e][f].val = Number(brew0[f + 3 * e] ?? 0);

            for (let e = 0; e < 4; e++) for (let f = 0; f < 2; f++) liqVal[e][f].val = Number(liq1[f + 2 * e] ?? 0);

            for (let e = 0; e < 2; e++) {
                vialsUpgVal[e].val = Number(via2[e] ?? 0);
                playerVal[e].val = Number(plr3[e] ?? 0);
            }
            draconicVal.val = draconic;

            // Reset max states before computed reads so stale maxima never survive a failed refresh.
            for (let e = 0; e < 4; e++) {
                for (let f = 0; f < 3; f++) {
                    brewMax[e][f].val = 0;
                }
            }
            for (let e = 0; e < 4; e++) {
                for (let f = 0; f < 2; f++) {
                    liqMax[e][f].val = 0;
                }
            }
            for (let e = 0; e < 2; e++) {
                vialsUpgMax[e].val = 0;
                playerMax[e].val = 0;
            }

            const maxTargets = [];

            for (let e = 0; e < 4; e++) {
                for (let f = 0; f < 3; f++) {
                    maxTargets.push({
                        args: [0, e, String(f)],
                        apply: (value) => {
                            brewMax[e][f].val = Number(value ?? 0);
                        },
                    });
                }
            }
            for (let e = 0; e < 4; e++) {
                for (let f = 0; f < 2; f++) {
                    maxTargets.push({
                        args: [1, e, String(f)],
                        apply: (value) => {
                            liqMax[e][f].val = Number(value ?? 0);
                        },
                    });
                }
            }
            for (let e = 0; e < 2; e++) {
                maxTargets.push({
                    args: [2, e, "0"],
                    apply: (value) => {
                        vialsUpgMax[e].val = Number(value ?? 0);
                    },
                });
                maxTargets.push({
                    args: [3, e, "0"],
                    apply: (value) => {
                        playerMax[e].val = Number(value ?? 0);
                    },
                });
            }

            let maxResults = null;
            try {
                maxResults = await readComputedMany(
                    "alchemy",
                    "CauldronLvMAX",
                    maxTargets.map((entry) => entry.args)
                );
            } catch {
                // Batch read unavailable - keep all max states at 0.
            }

            maxTargets.forEach((entry, i) => {
                entry.apply(maxResults?.[i]?.ok ? maxResults[i].value : 0);
            });
            markReady();
        } catch (e) {
            const message = e?.message ?? "Failed to load";
            if (!initialized.val) error.val = message;
            else refreshError.val = message;
        } finally {
            loading.val = false;
        }
    };

    load();

    // ── Build DOM (once) ───────────────────────────────────────────────────

    const SectionHeader = (title, note) =>
        div(
            { class: "p2w-section__header" },
            span({ class: "p2w-section__title" }, title),
            note ? span({ class: "p2w-section__note" }, note) : null
        );

    // Cauldron 4-column grid
    const buildCauldronSection = (title, note, cols, rowLabels, valGrid, maxGrid, b, stride) =>
        div(
            { class: "p2w-section" },
            SectionHeader(title, note),
            div(
                { class: "grid-4col" },
                ...cols.map((col, e) =>
                    div(
                        {
                            class: `p2w-col ${col.tone ? `p2w-col--${col.tone}` : ""}`,
                        },
                        div({ class: "p2w-col__header" }, span({ class: "p2w-col__name" }, col.label)),
                        div(
                            { class: "p2w-col__rows" },
                            ...rowLabels.map((label, f) =>
                                P2WRow({
                                    label,
                                    valueState: valGrid[e][f],
                                    maxState: maxGrid[e][f],
                                    writePath: `CauldronP2W[${b}][${f + stride * e}]`,
                                })
                            )
                        )
                    )
                )
            )
        );

    // Simple flat list
    const buildSimpleSection = (title, note, labels, vals, maxs, b) =>
        div(
            { class: "p2w-section" },
            SectionHeader(title, note),
            div(
                { class: "p2w-simple-rows" },
                ...labels.map((label, e) =>
                    P2WRow({
                        label,
                        valueState: vals[e],
                        maxState: maxs[e],
                        writePath: `CauldronP2W[${b}][${e}]`,
                    })
                )
            )
        );

    const scroll = div(
        { class: () => paneClass("p2w-scroll scrollable-panel") },

        buildCauldronSection(
            "BREWING CAULDRONS",
            "P2W upgrade levels per cauldron",
            BREW_CAULDRONS,
            BREW_ROW_LABELS,
            brewVal,
            brewMax,
            0,
            3
        ),

        buildCauldronSection(
            "LIQUID CAULDRONS",
            "P2W upgrade levels per liquid",
            LIQUID_COLS,
            LIQ_ROW_LABELS,
            liqVal,
            liqMax,
            1,
            2
        ),

        div(
            { class: "p2w-section" },
            SectionHeader("DRACONIC CAULDRONS", "Number of draconic liquid cauldrons (0-4)"),
            div(
                { class: "p2w-simple-rows" },
                P2WRow({
                    label: DRACONIC_LABELS[0],
                    valueState: draconicVal,
                    maxState: draconicMax,
                    writePath: "OptionsListAccount[123]",
                })
            )
        ),

        buildSimpleSection("VIALS UPGRADES", "P2W vial upgrade levels", VIALS_UPG_LABELS, vialsUpgVal, vialsUpgMax, 2),

        buildSimpleSection("PLAYER BOOSTS", "P2W player alchemy boosts", PLAYER_LABELS, playerVal, playerMax, 3)
    );

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "ALCHEMY - PAY 2 WIN",
            description: "Edit P2W upgrades for cauldrons, liquids, draconic count, vials and player boosts.",
            actions: button({ class: "btn-secondary", onclick: load }, "REFRESH"),
        }),
        refreshError: () =>
            !loading.val && refreshError.val
                ? div(
                      { class: "warning-banner" },
                      Icons.Warning(),
                      " Refresh failed. Showing last loaded values. ",
                      refreshError.val
                  )
                : null,
        initialState: [
            () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),
            () =>
                !loading.val && error.val && !initialized.val
                    ? EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val })
                    : null,
        ],
        body: scroll,
    });
};
