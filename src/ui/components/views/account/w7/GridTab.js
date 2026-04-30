import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { ActionButton } from "../components/ActionButton.js";
import { cleanName, useWriteStatus, writeVerified } from "../accountShared.js";

const { div, button, p, span } = van.tags;

const GRID_WIDTH = 20;
const GRID_HEIGHT = 12;
const GRID_TILE_COUNT = GRID_WIDTH * GRID_HEIGHT;

const isRenderableGridName = (name) => name.trim().toLowerCase() !== "name";
const resolveGridDescription = (rawDescription, rawValue) => {
    const replacement = cleanName(rawValue, "0");
    return cleanName(rawDescription).replace(/\{/g, replacement);
};
const clampGridLevel = (raw, maxLevel) => {
    const numeric = Math.round(Number(raw));
    if (!Number.isFinite(numeric)) return 0;
    if (maxLevel < 0) return 0;
    return Math.max(0, Math.min(maxLevel, numeric));
};
const getTileFillPercent = (level, maxLevel) => {
    if (maxLevel <= 0) return 0;
    return Math.max(0, Math.min(100, (Number(level) / Number(maxLevel)) * 100));
};

const GridTile = ({ index, tileState, onSelect }) =>
    button(
        {
            class: () =>
                [
                    "research-grid-tile",
                    tileState.maxLevel.val >= 0 ? "research-grid-tile--active" : "research-grid-tile--inactive",
                    tileState.level.val > 0 ? "research-grid-tile--leveled" : "",
                    tileState.selected?.val ? "research-grid-tile--selected" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
            disabled: () => tileState.maxLevel.val < 0,
            onclick: () => onSelect(index),
            title: () => tileState.name.val,
            type: "button",
            style: () => `grid-column:${tileState.gridColumn.val}; grid-row:${tileState.gridRow.val};`,
        },
        div({
            class: "research-grid-tile__fill",
            style: () => `height:${getTileFillPercent(tileState.level.val, tileState.maxLevel.val)}%;`,
        }),
        div(
            { class: "research-grid-tile__content" },
            span({ class: "research-grid-tile__level" }, () =>
                tileState.maxLevel.val >= 0 ? `${tileState.level.val}/${tileState.maxLevel.val}` : "--"
            )
        )
    );

export const GridTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Research Grid" });
    const selectedIndex = van.state(null);
    const detailInput = van.state("0");
    const { status: detailStatus, run: runDetailWrite } = useWriteStatus({ successMs: 1000, errorMs: 1400 });

    const gridStates = Array.from({ length: GRID_TILE_COUNT }, () => ({
        name: van.state(""),
        description: van.state(""),
        level: van.state(0),
        maxLevel: van.state(-1),
        selected: van.state(false),
        gridColumn: van.state(0),
        gridRow: van.state(0),
        renderable: van.state(false),
    }));
    const visibleTileIndexes = van.state([]);
    const visibleColumnCount = van.state(0);
    const visibleRowCount = van.state(0);

    const currentTile = van.derive(() => {
        const index = selectedIndex.val;
        return index === null ? null : (gridStates[index] ?? null);
    });

    const syncSelectedFlags = (nextIndex) => {
        for (let i = 0; i < gridStates.length; i++) {
            gridStates[i].selected.val = i === nextIndex;
        }
    };

    const selectTile = (index) => {
        const tile = gridStates[index];
        if (!tile || tile.maxLevel.val < 0) return;
        selectedIndex.val = index;
        syncSelectedFlags(index);
        detailInput.val = String(tile.level.val);
    };

    const closeDetail = () => {
        selectedIndex.val = null;
        syncSelectedFlags(null);
        detailInput.val = "0";
    };

    const load = async () =>
        run(async () => {
            const [rawLevels, rawSquares] = await Promise.all([
                gga("Research[0]"),
                gga("CustomLists.h.ResGridSquares").catch(() => gga("CustomLists.ResGridSquares")),
            ]);

            const levels = toIndexedArray(rawLevels);
            const squares = toIndexedArray(rawSquares);
            const usedColumns = new Set();
            const usedRows = new Set();
            const nextVisibleTileIndexes = [];

            for (let index = 0; index < GRID_TILE_COUNT; index++) {
                const tile = gridStates[index];
                const square = toIndexedArray(squares[index]);
                const maxLevel = Math.round(Number(square[1] ?? -1));
                const level = maxLevel >= 0 ? clampGridLevel(levels[index] ?? 0, maxLevel) : 0;
                const x = index % GRID_WIDTH;
                const y = Math.floor(index / GRID_WIDTH);
                const name = cleanName(square[0], `Grid Tile ${index + 1}`);
                const renderable = isRenderableGridName(name);

                tile.name.val = name;
                tile.description.val = resolveGridDescription(square[5], square[2]);
                tile.maxLevel.val = Number.isFinite(maxLevel) ? maxLevel : -1;
                tile.level.val = level;
                tile.gridColumn.val = 0;
                tile.gridRow.val = 0;
                tile.renderable.val = renderable;

                if (tile.renderable.val) {
                    usedColumns.add(x);
                    usedRows.add(y);
                    nextVisibleTileIndexes.push(index);
                }
            }

            const columnMap = new Map(
                [...usedColumns].sort((a, b) => a - b).map((column, order) => [column, order + 1])
            );
            const rowMap = new Map([...usedRows].sort((a, b) => a - b).map((row, order) => [row, order + 1]));

            for (const index of nextVisibleTileIndexes) {
                const x = index % GRID_WIDTH;
                const y = Math.floor(index / GRID_WIDTH);
                gridStates[index].gridColumn.val = columnMap.get(x) ?? 0;
                gridStates[index].gridRow.val = rowMap.get(y) ?? 0;
            }

            visibleTileIndexes.val = nextVisibleTileIndexes;
            visibleColumnCount.val = columnMap.size;
            visibleRowCount.val = rowMap.size;

            syncSelectedFlags(selectedIndex.val);

            if (selectedIndex.val !== null) {
                const selectedTile = gridStates[selectedIndex.val];
                if (!selectedTile || selectedTile.maxLevel.val < 0) closeDetail();
                else detailInput.val = String(selectedTile.level.val);
            }
        });

    load();

    const setSelectedLevel = async () => {
        const index = selectedIndex.val;
        if (index === null) return;

        const tile = gridStates[index];
        if (!tile || tile.maxLevel.val < 0) return;

        const nextLevel = clampGridLevel(detailInput.val, tile.maxLevel.val);

        await runDetailWrite(async () => {
            await writeVerified(`Research[0][${index}]`, nextLevel);
            tile.level.val = nextLevel;
            detailInput.val = String(nextLevel);
        });
    };

    const board = div(
        { class: "research-grid-shell" },
        div(
            { class: "research-grid-layout" },
            div({ class: "research-grid-board-wrap" }, () =>
                visibleTileIndexes.val.length === 0
                    ? div(
                          { class: "research-grid-detail__empty" },
                          span({ class: "research-grid-detail__empty-title" }, "NO ACTIVE GRID TILES"),
                          p(
                              { class: "research-grid-detail__empty-text" },
                              "All research grid squares are currently inactive."
                          )
                      )
                    : div(
                          {
                              class: "research-grid-board",
                              style: `grid-template-columns: repeat(${visibleColumnCount.val}, 44px); grid-template-rows: repeat(${visibleRowCount.val}, 44px);`,
                          },
                          ...visibleTileIndexes.val.map((index) =>
                              GridTile({
                                  index,
                                  tileState: gridStates[index],
                                  onSelect: selectTile,
                              })
                          )
                      )
            ),
            div({ class: "research-grid-detail" }, () => {
                const tile = currentTile.val;
                const index = selectedIndex.val;

                if (!tile || index === null) {
                    return div(
                        { class: "research-grid-detail__empty" },
                        span({ class: "research-grid-detail__empty-title" }, "NO TILE SELECTED"),
                        p(
                            { class: "research-grid-detail__empty-text" },
                            "Click any active square in the grid to inspect its details and set its level."
                        )
                    );
                }

                return div(
                    { class: "research-grid-detail__card" },
                    div(
                        { class: "research-grid-detail__preview" },
                        div({
                            class: "research-grid-detail__preview-fill",
                            style: () => `height:${getTileFillPercent(tile.level.val, tile.maxLevel.val)}%;`,
                        }),
                        div(
                            { class: "research-grid-detail__preview-content" },
                            span({ class: "research-grid-detail__preview-name" }, () => tile.name.val),
                            span(
                                { class: "research-grid-detail__preview-level" },
                                () => `LV ${tile.level.val} / ${tile.maxLevel.val}`
                            )
                        )
                    ),
                    div({ class: "research-grid-detail__index" }, `Tile ${index + 1}`),
                    div(
                        { class: "research-grid-detail__description" },
                        () => tile.description.val || "No description available."
                    ),
                    div(
                        { class: "research-grid-detail__meta" },
                        div(
                            { class: "research-grid-detail__meta-row" },
                            span({ class: "research-grid-detail__meta-label" }, "Current Level"),
                            span({ class: "research-grid-detail__meta-value" }, () => String(tile.level.val))
                        ),
                        div(
                            { class: "research-grid-detail__meta-row" },
                            span({ class: "research-grid-detail__meta-label" }, "Max Level"),
                            span({ class: "research-grid-detail__meta-value" }, () => String(tile.maxLevel.val))
                        )
                    ),
                    div(
                        { class: "research-grid-detail__edit-row" },
                        span({ class: "research-grid-detail__edit-label" }, "Set Level"),
                        NumberInput({
                            mode: "int",
                            value: detailInput,
                            oninput: (e) => (detailInput.val = e.target.value),
                            onDecrement: () =>
                                (detailInput.val = String(Math.max(0, (Number(detailInput.val) || 0) - 1))),
                            onIncrement: () =>
                                (detailInput.val = String(
                                    Math.min(tile.maxLevel.val, Math.max(0, (Number(detailInput.val) || 0) + 1))
                                )),
                        })
                    ),
                    ActionButton({
                        label: "SET",
                        status: detailStatus,
                        disabled: () => clampGridLevel(detailInput.val, tile.maxLevel.val) === tile.level.val,
                        onClick: setSelectedLevel,
                    })
                );
            })
        )
    );

    return PersistentAccountListPage({
        title: "GRID",
        description: "Browse all 240 research squares. Click an active tile to inspect it and set its current level.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
        }),
        state: { loading, error },
        loadingText: "READING RESEARCH GRID",
        errorTitle: "GRID READ FAILED",
        initialWrapperClass: "research-grid-shell",
        body: board,
    });
};
