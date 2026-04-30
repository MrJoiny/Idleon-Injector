import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList, readComputed } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { ClampedLevelRow } from "../../ClampedLevelRow.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt } from "../../accountShared.js";

const { div, span } = van.tags;

const FARM_RANK_DATABASE_PATH = "FarmRank[2]";
const RANK_WIDTH = 5;
const RANK_HEIGHT = 4;
const RANK_COUNT = RANK_WIDTH * RANK_HEIGHT;

const getRankStyle = (index) => {
    const column = (index % RANK_WIDTH) + 1;
    const row = Math.floor(index / RANK_WIDTH) + 1;
    return `grid-column:${column}; grid-row:${row};`;
};

const UnboundedRankRow = ({ entry, levelState }) =>
    SimpleNumberRow({
        entry: {
            ...entry,
            path: `${FARM_RANK_DATABASE_PATH}[${entry.index}]`,
            formatted: false,
            showIndex: false,
            badge: (currentValue) => `LV ${currentValue ?? 0}`,
            rowClass: "farming-grid-field-row",
            controlsClass: "account-row__controls--xl",
        },
        valueState: levelState,
    });

const RankLevelRow = ({ entry, levelState }) => {
    if (entry.maxLevel === null) return UnboundedRankRow({ entry, levelState });

    return ClampedLevelRow({
        valueState: levelState,
        writePath: `${FARM_RANK_DATABASE_PATH}[${entry.index}]`,
        max: entry.maxLevel,
        integerMode: "round",
        renderInfo: () => span({ class: "account-row__name" }, entry.name),
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / ${entry.maxLevel}`,
        rowClass: "farming-grid-field-row",
        controlsClass: "account-row__controls--xl",
        maxAction: true,
    });
};

const RankTile = ({ entry, levelState }) =>
    div(
        {
            class: "farming-grid-tile feature-card",
            style: getRankStyle(entry.index),
        },
        div(
            { class: "farming-grid-tile__header" },
            span({ class: "farming-grid-tile__title" }, `RANK ${entry.index + 1}`),
            span({ class: "farming-grid-tile__coord" }, `R${entry.row + 1} C${entry.column + 1}`)
        ),
        RankLevelRow({ entry, levelState })
    );

const buildRankEntries = (rawLevels, rawNames, fifthColumnMaxLevel) => {
    const levels = toIndexedArray(rawLevels ?? []);
    const names = toIndexedArray(rawNames ?? []);
    return Array.from({ length: RANK_COUNT }, (_, index) => {
        const column = index % RANK_WIDTH;
        return {
            index,
            row: Math.floor(index / RANK_WIDTH),
            column,
            name: cleanName(names[index], `Rank ${index + 1}`),
            level: toInt(levels[index], { min: 0 }),
            maxLevel: column === RANK_WIDTH - 1 ? fifthColumnMaxLevel : null,
        };
    });
};

export const RankTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Farming Rank" });
    const rankEntries = van.state([]);
    const levelStates = new Map();
    const gridNode = div({ class: "farming-grid farming-rank-grid" });
    const reconcileGrid = createStaticRowReconciler(gridNode);

    const load = async () =>
        run(async () => {
            const [rawLevels, rawNames, rawFifthColumnMax] = await Promise.all([
                gga(FARM_RANK_DATABASE_PATH),
                readCList("NinjaInfo[34]"),
                readComputed("farming", "LandRank5thColumnMaxLV", [0, 0]),
            ]);
            const fifthColumnMaxLevel = toInt(rawFifthColumnMax, { min: 0 });
            const ranks = buildRankEntries(rawLevels, rawNames, fifthColumnMaxLevel);

            rankEntries.val = ranks;
            reconcileGrid(ranks.map((rank) => `${rank.index}:${rank.name}:${rank.maxLevel ?? "none"}`).join("|"), () =>
                ranks.map((rank) =>
                    RankTile({
                        entry: rank,
                        levelState: getOrCreateState(levelStates, rank.index),
                    })
                )
            );

            for (const rank of ranks) {
                getOrCreateState(levelStates, rank.index).val =
                    rank.maxLevel === null ? rank.level : Math.min(rank.maxLevel, rank.level);
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack farming-grid-scroll" },
        div({ class: "farming-grid-note" }, "Rank bonuses are positioned from top-left to bottom-right."),
        gridNode
    );

    return PersistentAccountListPage({
        title: "RANK",
        description: "Edit the 5x4 Land Rank Database from FarmRank[2]. The fifth column uses the live max level cap.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING FARMING RANKS",
        errorTitle: "FARMING RANKS READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
