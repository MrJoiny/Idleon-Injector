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
 * Max levels via readComputed("alchemy", "CauldronLvMAX", [b, e, ""+f]).
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
import { readGga, writeGga, readComputed } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";

const { div, button, span, h3, p } = van.tags;

// ── Hardcoded column names (cannot be sourced at runtime) ──────────────────

// Brewing cauldron column headers — user-specified; match in-game names.
const BREW_CAULDRONS = [
    { label: "POWER CAULDRON",   color: "#f87171", dim: "rgba(248,113,113,0.10)" },
    { label: "QUICC CAULDRON",   color: "#4ade80", dim: "rgba(74,222,128,0.10)"  },
    { label: "HIGH-IQ CAULDRON", color: "#60a5fa", dim: "rgba(96,165,250,0.10)"  },
    { label: "KAZAM CAULDRON",   color: "#c084fc", dim: "rgba(192,132,252,0.10)" },
];

// Liquid column headers — identical constraint to LiquidTab.js.
const LIQUID_COLS = [
    { label: "WATER DROPLETS",  color: "#5ba6d3" },
    { label: "LIQUID NITROGEN", color: "#82d9f5" },
    { label: "TRENCH SEAWATER", color: "#3a9e80" },
    { label: "TOXIC MERCURY",   color: "#c084fc" },
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

// ── Helpers ────────────────────────────────────────────────────────────────

const toArr = (raw) =>
    Array.isArray(raw)
        ? raw
        : Object.keys(raw ?? {}).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);

// ── P2WRow ─────────────────────────────────────────────────────────────────

const P2WRow = ({ label, valueState, maxState, writePath }) => {
    const inputVal = van.state(String(valueState.val));
    const status   = van.state(null);

    van.derive(() => { inputVal.val = String(valueState.val); });

    const doSet = async (raw) => {
        const parsed = Math.max(0, Math.round(Number(raw)));
        if (isNaN(parsed)) return;
        const max = Number(maxState.val);
        const val = (max > 0) ? Math.min(max, parsed) : parsed;
        status.val = "loading";
        try {
            await writeGga(writePath, val);
            valueState.val = val;
            inputVal.val   = String(val);
            status.val     = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "p2w-row",
                status.val === "success" ? "p2w-row--success" : "",
                status.val === "error"   ? "p2w-row--error"   : "",
            ].filter(Boolean).join(" "),
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
                oninput:     (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => {
                    const max  = Number(maxState.val);
                    const next = Number(inputVal.val) + 1;
                    inputVal.val = String(max > 0 ? Math.min(max, next) : next);
                },
            }),
            button(
                {
                    class:    () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick:  () => doSet(inputVal.val),
                },
                () => status.val === "loading" ? "…" : "SET"
            ),
        ),
    );
};

// ── Pay2WinTab ─────────────────────────────────────────────────────────────

export const Pay2WinTab = () => {
    const loading     = van.state(true);
    const error       = van.state(null);
    const initialized = van.state(false);

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

    // Player boosts: 2 rows
    const playerVal = Array.from({ length: 2 }, () => van.state(0));
    const playerMax = Array.from({ length: 2 }, () => van.state(0));

    // ── Load ───────────────────────────────────────────────────────────────

    const load = async () => {
        loading.val = true;
        error.val   = null;
        try {
            const rawP2W = await readGga("CauldronP2W");
            const p2w    = toArr(rawP2W ?? []);
            const brew0  = toArr(p2w[0] ?? []);
            const liq1   = toArr(p2w[1] ?? []);
            const via2   = toArr(p2w[2] ?? []);
            const plr3   = toArr(p2w[3] ?? []);

            // Fill values
            for (let e = 0; e < 4; e++)
                for (let f = 0; f < 3; f++)
                    brewVal[e][f].val = Number(brew0[f + 3 * e] ?? 0);

            for (let e = 0; e < 4; e++)
                for (let f = 0; f < 2; f++)
                    liqVal[e][f].val = Number(liq1[f + 2 * e] ?? 0);

            for (let e = 0; e < 2; e++) {
                vialsUpgVal[e].val = Number(via2[e] ?? 0);
                playerVal[e].val   = Number(plr3[e] ?? 0);
            }

            // Fetch max levels in parallel
            const maxJobs = [];

            for (let e = 0; e < 4; e++) {
                for (let f = 0; f < 3; f++) {
                    const ce = e, cf = f;
                    maxJobs.push(
                        readComputed("alchemy", "CauldronLvMAX", [0, ce, "" + cf])
                            .then((v) => { brewMax[ce][cf].val = Number(v ?? 0); })
                            .catch(() => {})
                    );
                }
            }
            for (let e = 0; e < 4; e++) {
                for (let f = 0; f < 2; f++) {
                    const ce = e, cf = f;
                    maxJobs.push(
                        readComputed("alchemy", "CauldronLvMAX", [1, ce, "" + cf])
                            .then((v) => { liqMax[ce][cf].val = Number(v ?? 0); })
                            .catch(() => {})
                    );
                }
            }
            for (let e = 0; e < 2; e++) {
                const ce = e;
                maxJobs.push(
                    readComputed("alchemy", "CauldronLvMAX", [2, ce, "0"])
                        .then((v) => { vialsUpgMax[ce].val = Number(v ?? 0); })
                        .catch(() => {})
                );
                maxJobs.push(
                    readComputed("alchemy", "CauldronLvMAX", [3, ce, "0"])
                        .then((v) => { playerMax[ce].val = Number(v ?? 0); })
                        .catch(() => {})
                );
            }

            await Promise.all(maxJobs);
            initialized.val = true;

        } catch (e) {
            error.val = e?.message ?? "Failed to load";
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
            note ? span({ class: "p2w-section__note" }, note) : null,
        );

    // Cauldron-style 4-column grid
    const buildCauldronSection = (title, note, cols, rowLabels, valGrid, maxGrid, b, stride) =>
        div(
            { class: "p2w-section" },
            SectionHeader(title, note),
            div(
                { class: "p2w-cauldron-grid" },
                ...cols.map((col, e) =>
                    div(
                        {
                            class: "p2w-col",
                            style: `--col-color: ${col.color}; --col-dim: ${col.dim ?? "transparent"};`,
                        },
                        div(
                            { class: "p2w-col__header" },
                            span({ class: "p2w-col__name" }, col.label),
                        ),
                        div(
                            { class: "p2w-col__rows" },
                            ...rowLabels.map((label, f) =>
                                P2WRow({
                                    label,
                                    valueState: valGrid[e][f],
                                    maxState:   maxGrid[e][f],
                                    writePath:  `CauldronP2W[${b}][${f + stride * e}]`,
                                })
                            ),
                        ),
                    )
                ),
            ),
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
                        maxState:   maxs[e],
                        writePath:  `CauldronP2W[${b}][${e}]`,
                    })
                ),
            ),
        );

    const scroll = div(
        { class: () => `p2w-scroll${initialized.val ? "" : " p2w-scroll--hidden"}` },

        buildCauldronSection(
            "BREWING CAULDRONS", "P2W upgrade levels per cauldron",
            BREW_CAULDRONS, BREW_ROW_LABELS, brewVal, brewMax, 0, 3,
        ),

        buildCauldronSection(
            "LIQUID CAULDRONS", "P2W upgrade levels per liquid",
            LIQUID_COLS, LIQ_ROW_LABELS, liqVal, liqMax, 1, 2,
        ),

        buildSimpleSection(
            "VIALS UPGRADES", "P2W vial upgrade levels",
            VIALS_UPG_LABELS, vialsUpgVal, vialsUpgMax, 2,
        ),

        buildSimpleSection(
            "PLAYER BOOSTS", "P2W player alchemy boosts",
            PLAYER_LABELS, playerVal, playerMax, 3,
        ),
    );

    return div(
        { class: "p2w-tab" },

        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "ALCHEMY — PAY 2 WIN"),
                p({ class: "feature-header__desc" }, "Edit P2W upgrades for cauldrons, liquids, vials and player boosts."),
            ),
            div(
                { class: "feature-header__actions" },
                button({ class: "feature-btn", onclick: load }, Icons.Refresh(), " REFRESH"),
            ),
        ),

        () => (loading.val && !initialized.val)
            ? div({ class: "feature-loader" }, Loader())
            : null,

        () => (!loading.val && error.val && !initialized.val)
            ? EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", desc: error.val })
            : null,

        scroll,
    );
};
