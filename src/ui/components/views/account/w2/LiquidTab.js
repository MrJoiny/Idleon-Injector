/**
 * W2 — Liquid Tab (Alchemy Liquids)
 *
 * Liquid names are hardcoded — they couldn't be easily sourced from game data
 * at runtime and were taken from the IdleOn wiki / in-game descriptions:
 *   Liquid 1 (unlocked Alchemy Lv  1): Water Droplets
 *   Liquid 2 (unlocked Alchemy Lv 20): Liquid Nitrogen
 *   Liquid 3 (unlocked Alchemy Lv 35): Trench Seawater
 *   Liquid 4 (unlocked Alchemy Lv 80): Toxic Mercury
 *
 * Data paths (all within CauldronInfo):
 *   [6][i]         → current liquid amount   (i = 0..3)
 *   [8][4+i][2][1] → cap upgrade level        (i = 0..3)
 *   [8][4+i][3][1] → rate upgrade level       (i = 0..3)
 *
 * Re-render strategy:
 *   Per-liquid van.state objects are created ONCE and updated in-place on
 *   every load/refresh. The grid DOM is never torn down after first mount —
 *   only individual reactive bindings inside each LiquidControl update.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";

const { div, button, span, h3, p } = van.tags;

// ── Liquid definitions ────────────────────────────────────────────────────
// Names hardcoded — see file header comment.

const LIQUIDS = [
    { id: "water-droplets",  label: "Water Droplets",  index: 0, upgradeIndex: 4, color: "#5ba6d3", dimColor: "rgba(91,166,211,0.10)"   },
    { id: "liquid-nitrogen", label: "Liquid Nitrogen", index: 1, upgradeIndex: 5, color: "#82d9f5", dimColor: "rgba(130,217,245,0.10)"  },
    { id: "trench-seawater", label: "Trench Seawater", index: 2, upgradeIndex: 6, color: "#3a9e80", dimColor: "rgba(58,158,128,0.10)"   },
    { id: "toxic-mercury",   label: "Toxic Mercury",   index: 3, upgradeIndex: 7, color: "#c084fc", dimColor: "rgba(192,132,252,0.10)"  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

const toArr = (raw) =>
    Array.isArray(raw)
        ? raw
        : Object.keys(raw ?? {}).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);

// ── LiquidControl ─────────────────────────────────────────────────────────
// Takes a reactive `valueState` (van.state) so refresh updates the display
// in-place without recreating this element.

const LiquidControl = ({ label, valueState, writePath, mode = "int" }) => {
    const inputVal = van.state(String(valueState.val));
    const status   = van.state(null); // null | "loading" | "success" | "error"

    // Keep inputVal synced when the parent refreshes the backing state.
    van.derive(() => {
        inputVal.val = String(valueState.val);
    });

    const doSet = async (raw) => {
        const val = mode === "float"
            ? Math.max(0, Number(raw))
            : Math.max(0, Math.round(Number(raw)));
        if (isNaN(val)) return;
        status.val = "loading";
        try {
            await writeGga(writePath, val);
            valueState.val = val;   // update shared state (also refreshes display)
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
                "liquid-section",
                status.val === "success" ? "liquid-section--success" : "",
                status.val === "error"   ? "liquid-section--error"   : "",
            ].filter(Boolean).join(" "),
        },
        div(
            { class: "liquid-section__top" },
            span({ class: "liquid-section__label" }, label),
            span({ class: "liquid-section__display" }, () => valueState.val),
        ),
        div(
            { class: "liquid-section__controls" },
            NumberInput({
                mode,
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            button(
                {
                    class: () => `feature-btn feature-btn--apply liquid-section__set-btn ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => status.val === "loading" ? "…" : "SET"
            ),
        ),
    );
};

// ── LiquidColumn ──────────────────────────────────────────────────────────

const LiquidColumn = ({ liquid, states }) =>
    div(
        {
            class: "liquid-col",
            style: `--liquid-color: ${liquid.color}; --liquid-dim: ${liquid.dimColor};`,
        },
        div(
            { class: "liquid-col__header" },
            span({ class: "liquid-col__name" }, liquid.label),
        ),
        LiquidControl({
            label: "AMOUNT",
            valueState: states.amount,
            writePath: `CauldronInfo[6][${liquid.index}]`,
            mode: "float",
        }),
        LiquidControl({
            label: "CAP UPGRADE",
            valueState: states.cap,
            writePath: `CauldronInfo[8][${liquid.upgradeIndex}][2][1]`,
            mode: "int",
        }),
        LiquidControl({
            label: "RATE UPGRADE",
            valueState: states.rate,
            writePath: `CauldronInfo[8][${liquid.upgradeIndex}][3][1]`,
            mode: "int",
        }),
    );

// ── LiquidTab ─────────────────────────────────────────────────────────────

export const LiquidTab = () => {
    const loading     = van.state(true);
    const error       = van.state(null);
    const initialized = van.state(false); // stays true after first successful load

    // Per-liquid reactive states — created once, updated in-place on refresh.
    // Columns are never rebuilt; only their internal bindings react.
    const liquidStates = LIQUIDS.map(() => ({
        amount: van.state(0),
        cap:    van.state(0),
        rate:   van.state(0),
    }));

    const load = async () => {
        loading.val = true;
        error.val   = null;
        try {
            const raw         = await readGga("CauldronInfo");
            const amounts     = toArr(raw?.[6] ?? []);
            const upgradesRaw = toArr(raw?.[8] ?? []);

            LIQUIDS.forEach((liq, i) => {
                const upgRow  = toArr(upgradesRaw[liq.upgradeIndex] ?? []);
                const capRow  = toArr(upgRow[2] ?? []);
                const rateRow = toArr(upgRow[3] ?? []);
                liquidStates[i].amount.val = Number(amounts[liq.index] ?? 0);
                liquidStates[i].cap.val    = Number(capRow[1]  ?? 0);
                liquidStates[i].rate.val   = Number(rateRow[1] ?? 0);
            });

            initialized.val = true;
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            loading.val = false;
        }
    };

    load();

    // Grid is built once here and permanently lives in the DOM.
    // Concealed via CSS class until the first load completes.
    const grid = div(
        { class: () => `liquid-grid grid-4col scrollable-panel${initialized.val ? "" : " liquid-grid--hidden"}` },
        ...LIQUIDS.map((liq, i) =>
            LiquidColumn({ liquid: liq, states: liquidStates[i] })
        )
    );

    return div(
        { class: "liquid-tab tab-container" },

        // Header
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "ALCHEMY — LIQUID"),
                p({ class: "feature-header__desc" }, "Edit current liquid amounts and cap / rate upgrade levels."),
            ),
            div(
                { class: "feature-header__actions" },
                button({ class: "feature-btn", onclick: load }, Icons.Refresh(), " REFRESH"),
            ),
        ),

        // Loader — only shown before the first successful load
        () => (loading.val && !initialized.val)
            ? div({ class: "feature-loader" }, Loader())
            : null,

        // Error — only shown when the initial load fails
        () => (!loading.val && error.val && !initialized.val)
            ? EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", desc: error.val })
            : null,

        // Grid — always in DOM; hidden via CSS until first load completes,
        // then states update in-place on every subsequent refresh.
        grid,
    );
};
