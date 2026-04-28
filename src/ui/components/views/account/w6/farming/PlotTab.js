import van from "../../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { EditableNumberRow } from "../../EditableNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import {
    adjustFormattedIntInput,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    toInt,
    writeVerified,
} from "../../accountShared.js";

const { div, span } = van.tags;

const FARM_RANK_PATH = "FarmRank";
const PLOT_WIDTH = 9;
const PLOT_HEIGHT = 4;
const PLOT_COUNT = PLOT_WIDTH * PLOT_HEIGHT;

const getPlotStyle = (index) => {
    const column = (index % PLOT_WIDTH) + 1;
    const rowFromBottom = Math.floor(index / PLOT_WIDTH);
    const row = PLOT_HEIGHT - rowFromBottom;
    return `grid-column:${column}; grid-row:${row};`;
};

const PlotFieldRow = ({ label, valueState, writePath, float = false }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                formatted: float,
                float,
                min: 0,
                fallback: null,
            }),
        write: (nextValue) => writeVerified(writePath, nextValue),
        renderInfo: () => span({ class: "account-row__name" }, label),
        renderBadge: (currentValue) => (float ? largeFormatter(currentValue ?? 0) : `LV ${currentValue ?? 0}`),
        rowClass: "farming-grid-field-row",
        controlsClass: "account-row__controls--xl",
        inputMode: float ? "float" : "int",
        inputProps: float
            ? {
                  formatter: largeFormatter,
                  parser: largeParser,
              }
            : {},
        adjustInput: (rawValue, delta, currentValue) =>
            float
                ? adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 })
                : Math.max(0, toInt(rawValue, { min: 0 }) + delta),
    });

const PlotTile = ({ entry, levelState, expState }) =>
    div(
        {
            class: "farming-grid-tile feature-card",
            style: getPlotStyle(entry.index),
        },
        div(
            { class: "farming-grid-tile__header" },
            span({ class: "farming-grid-tile__title" }, `PLOT ${entry.index + 1}`),
            span({ class: "farming-grid-tile__coord" }, `R${entry.row + 1} C${entry.column + 1}`)
        ),
        PlotFieldRow({
            label: "Level",
            valueState: levelState,
            writePath: `${FARM_RANK_PATH}[0][${entry.index}]`,
        }),
        PlotFieldRow({
            label: "EXP",
            valueState: expState,
            writePath: `${FARM_RANK_PATH}[1][${entry.index}]`,
            float: true,
        })
    );

export const PlotTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Farming Plots" });
    const plotEntries = van.state([]);
    const levelStates = new Map();
    const expStates = new Map();
    const gridNode = div({ class: "farming-grid farming-plot-grid" });
    const reconcileGrid = createStaticRowReconciler(gridNode);

    const load = async () =>
        run(async () => {
            const rawFarmRank = toIndexedArray((await gga(FARM_RANK_PATH)) ?? []);
            const levels = toIndexedArray(rawFarmRank[0] ?? []);
            const exp = toIndexedArray(rawFarmRank[1] ?? []);
            const plots = Array.from({ length: PLOT_COUNT }, (_, index) => ({
                index,
                row: Math.floor(index / PLOT_WIDTH),
                column: index % PLOT_WIDTH,
                level: toInt(levels[index], { min: 0 }),
                exp: Number(exp[index] ?? 0),
            }));

            plotEntries.val = plots;
            reconcileGrid(plots.map((plot) => plot.index).join("|"), () =>
                plots.map((plot) =>
                    PlotTile({
                        entry: plot,
                        levelState: getOrCreateState(levelStates, plot.index),
                        expState: getOrCreateState(expStates, plot.index),
                    })
                )
            );

            for (const plot of plots) {
                getOrCreateState(levelStates, plot.index).val = plot.level;
                getOrCreateState(expStates, plot.index).val = plot.exp;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack farming-grid-scroll" },
        div(
            { class: "farming-grid-note" },
            "Plots are positioned from bottom-left to top-right, matching FarmRank[0] and FarmRank[1]."
        ),
        gridNode
    );

    return PersistentAccountListPage({
        title: "PLOT",
        description: "Edit the 9x4 land plot level and EXP grids from FarmRank[0] and FarmRank[1].",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING FARMING PLOTS",
        errorTitle: "FARMING PLOTS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
