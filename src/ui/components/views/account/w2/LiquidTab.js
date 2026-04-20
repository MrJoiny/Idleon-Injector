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
import { gga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { useWriteStatus, writeVerified } from "../accountShared.js";

const { div, button, span } = van.tags;

// ── Liquid definitions ────────────────────────────────────────────────────
// Names hardcoded — see file header comment.

const LIQUIDS = [
    {
        id: "water-droplets",
        label: "Water Droplets",
        index: 0,
        upgradeIndex: 4,
        color: "#5ba6d3",
        dimColor: "rgba(91,166,211,0.10)",
    },
    {
        id: "liquid-nitrogen",
        label: "Liquid Nitrogen",
        index: 1,
        upgradeIndex: 5,
        color: "#82d9f5",
        dimColor: "rgba(130,217,245,0.10)",
    },
    {
        id: "trench-seawater",
        label: "Trench Seawater",
        index: 2,
        upgradeIndex: 6,
        color: "#3a9e80",
        dimColor: "rgba(58,158,128,0.10)",
    },
    {
        id: "toxic-mercury",
        label: "Toxic Mercury",
        index: 3,
        upgradeIndex: 7,
        color: "#c084fc",
        dimColor: "rgba(192,132,252,0.10)",
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────

const roundTo2 = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

// ── LiquidControl ─────────────────────────────────────────────────────────
// Takes a reactive `valueState` (van.state) so refresh updates the display
// in-place without recreating this element.

const LiquidControl = ({ label, valueState, writePath, mode = "int" }) => {
    const inputVal = van.state(String(valueState.val));
    const { status, run } = useWriteStatus();

    // Keep inputVal synced when the parent refreshes the backing state.
    van.derive(() => {
        inputVal.val = String(valueState.val);
    });

    const doSet = async (raw) => {
        const val = mode === "float" ? Math.max(0, roundTo2(raw)) : Math.max(0, Math.round(Number(raw)));
        if (isNaN(val)) return;
        await run(async () => {
            await writeVerified(writePath, val, { message: `Write mismatch at ${writePath}: expected ${val}` });
            valueState.val = val;
            inputVal.val = String(val);
        });
    };

    return div(
        {
            class: () =>
                [
                    "liquid-section",
                    status.val === "success" ? "account-row--success" : "",
                    status.val === "error" ? "account-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "liquid-section__top" },
            span({ class: "liquid-section__label" }, label),
            span({ class: "liquid-section__display" }, () =>
                mode === "float" ? roundTo2(valueState.val).toFixed(2) : String(valueState.val)
            )
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
                    class: () =>
                        `account-btn account-btn--apply liquid-section__set-btn ${status.val === "loading" ? "account-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => (status.val === "loading" ? "…" : "SET")
            )
        )
    );
};

// ── LiquidColumn ──────────────────────────────────────────────────────────

const LiquidColumn = ({ liquid, states }) =>
    div(
        {
            class: `liquid-col liquid-col--${liquid.id}`,
        },
        div({ class: "liquid-col__header" }, span({ class: "liquid-col__name" }, liquid.label)),
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
        })
    );

// ── LiquidTab ─────────────────────────────────────────────────────────────

export const LiquidTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Liquid" });

    // Per-liquid reactive states — created once, updated in-place on refresh.
    // Columns are never rebuilt; only their internal bindings react.
    const liquidStates = LIQUIDS.map(() => ({
        amount: van.state(0),
        cap: van.state(0),
        rate: van.state(0),
    }));

    const load = async () =>
        run(async () => {
            const raw = await gga("CauldronInfo");
            const amounts = toIndexedArray(raw?.[6] ?? []);
            const upgradesRaw = toIndexedArray(raw?.[8] ?? []);

            LIQUIDS.forEach((liq, i) => {
                const upgRow = toIndexedArray(upgradesRaw[liq.upgradeIndex] ?? []);
                const capRow = toIndexedArray(upgRow[2] ?? []);
                const rateRow = toIndexedArray(upgRow[3] ?? []);
                liquidStates[i].amount.val = roundTo2(amounts[liq.index] ?? 0);
                liquidStates[i].cap.val = Number(capRow[1] ?? 0);
                liquidStates[i].rate.val = Number(rateRow[1] ?? 0);
            });
        });

    load();

    // Grid is built once here and permanently lives in the DOM.
    // Concealed via CSS class until the first load completes.
    const grid = div(
        { class: "liquid-grid grid-4col scrollable-panel" },
        ...LIQUIDS.map((liq, i) => LiquidColumn({ liquid: liq, states: liquidStates[i] }))
    );
    return AccountPageShell({
        header: AccountTabHeader({
            title: "ALCHEMY — LIQUID",
            description: "Edit current liquid amounts and cap / rate upgrade levels.",
            actions: RefreshButton({ onRefresh: load }),
        }),
        persistentState: { loading, error },
        body: grid,
    });
};


