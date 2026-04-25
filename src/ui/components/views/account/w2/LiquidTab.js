/**
 * W2 - Liquid Tab (Alchemy Liquids)
 *
 * Liquid names are hardcoded - they couldn't be easily sourced from game data
 * at runtime and were taken from the IdleOn wiki / in-game descriptions:
 *   Liquid 1 (unlocked Alchemy Lv  1): Water Droplets
 *   Liquid 2 (unlocked Alchemy Lv 20): Liquid Nitrogen
 *   Liquid 3 (unlocked Alchemy Lv 35): Trench Seawater
 *   Liquid 4 (unlocked Alchemy Lv 80): Toxic Mercury
 *
 * Data paths (all within CauldronInfo):
 *   [6][i]         -> current liquid amount   (i = 0..3)
 *   [8][4+i][2][1] -> cap upgrade level       (i = 0..3)
 *   [8][4+i][3][1] -> rate upgrade level      (i = 0..3)
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { writeVerified } from "../accountShared.js";

const { div, span } = van.tags;

const LIQUIDS = [
    {
        id: "water-droplets",
        label: "Water Droplets",
        index: 0,
        upgradeIndex: 4,
    },
    {
        id: "liquid-nitrogen",
        label: "Liquid Nitrogen",
        index: 1,
        upgradeIndex: 5,
    },
    {
        id: "trench-seawater",
        label: "Trench Seawater",
        index: 2,
        upgradeIndex: 6,
    },
    {
        id: "toxic-mercury",
        label: "Toxic Mercury",
        index: 3,
        upgradeIndex: 7,
    },
];

const LiquidControl = ({ label, valueState, writePath, mode = "int" }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => {
            const next = Math.max(0, Math.round(Number(rawValue)));
            return Number.isNaN(next) ? null : next;
        },
        write: async (nextValue) => {
            await writeVerified(writePath, nextValue, {
                message: `Write mismatch at ${writePath}: expected ${nextValue}`,
            });
            return nextValue;
        },
        renderInfo: () => span({ class: "account-row__name liquid-row__label" }, label),
        renderBadge: (currentValue) => String(currentValue ?? 0),
        rowClass: "liquid-row",
        badgeClass: "liquid-row__badge",
        controlsClass: "liquid-row__controls",
        inputMode: mode,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const next = Number.isFinite(base) ? base : Number(currentValue ?? 0);
            return Math.max(0, next + delta);
        },
    });

const LiquidColumn = ({ liquid, states }) =>
    div(
        {
            class: `liquid-col liquid-col--${liquid.id}`,
        },
        div({ class: "col-header" }, span({ class: "col-header__name" }, liquid.label)),
        LiquidControl({
            label: "AMOUNT",
            valueState: states.amount,
            writePath: `CauldronInfo[6][${liquid.index}]`,
            mode: "int",
        }),
        LiquidControl({
            label: "CAP UPGRADE",
            valueState: states.cap,
            writePaths: [
                `CauldronInfo[8][${liquid.upgradeIndex}][2][1]`,
                `OptionsListAccount[${371 + 2 * liquid.index}]`,
            ],
            mode: "int",
        }),
        LiquidControl({
            label: "RATE UPGRADE",
            valueState: states.rate,
            writePaths: [
                `CauldronInfo[8][${liquid.upgradeIndex}][3][1]`,
                `OptionsListAccount[${372 + 2 * liquid.index}]`,
            ],
            mode: "int",
        })
    );

export const LiquidTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Liquid" });

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

            LIQUIDS.forEach((liquid, i) => {
                const upgRow = toIndexedArray(upgradesRaw[liquid.upgradeIndex] ?? []);
                const capRow = toIndexedArray(upgRow[2] ?? []);
                const rateRow = toIndexedArray(upgRow[3] ?? []);
                liquidStates[i].amount.val = Math.max(0, Math.round(Number(amounts[liquid.index] ?? 0)));
                liquidStates[i].cap.val = Number(capRow[1] ?? 0);
                liquidStates[i].rate.val = Number(rateRow[1] ?? 0);
            });
        });

    load();

    const grid = div(
        { class: "liquid-grid grid-4col" },
        ...LIQUIDS.map((liquid, i) => LiquidColumn({ liquid, states: liquidStates[i] }))
    );

    return PersistentAccountListPage({
        title: "ALCHEMY - LIQUID",
        description: "Edit current liquid amounts and cap / rate upgrade levels.",
        actions: RefreshButton({ onRefresh: load }),
        state: { loading, error },
        body: div({ class: "scrollable-panel" }, grid),
    });
};
