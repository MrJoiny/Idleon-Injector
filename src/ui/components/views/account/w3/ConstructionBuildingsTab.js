/**
 * W3 — Construction: Buildings Tab
 *
 * Data sources:
 *   gga.TowerInfo[i]       — current level of building i
 *   gga.TowerInfo[i + 27]  — pending/target level of building i
 *   cList.TowerInfo[i][0]  — building name
 *   cList.TowerInfo[i][8]  — base max level
 *
 * Real max level is the base cap plus the game's Workbench helper
 * (read through the injected ActorEvents bridge, not reimplemented in the UI).
 *
 * When setting a building level, write both TowerInfo[i] and TowerInfo[i + 27].
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputedMany } from "../../../../services/api.js";
import { withTooltip } from "../../../Tooltip.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    cleanName,
    createStaticRowReconciler,
    readLevelDefinitions,
    runBulkSet,
    toNum,
    useWriteStatus,
    writeVerified,
} from "../accountShared.js";

const { div } = van.tags;

const BUILDING_COUNT = 27;

// ── BuildingRow ────────────────────────────────────────────────────────────

const BuildingRow = ({ index, name, maxLevel, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        max: maxLevel,
        write: async (nextLevel) => {
            const path = `TowerInfo[${index}]`;
            const pathPending = `TowerInfo[${index + BUILDING_COUNT}]`;
            await writeVerified(path, nextLevel, {
                message: `Write mismatch at ${path}: expected ${nextLevel}, got failed verification`,
            });
            return writeVerified(pathPending, nextLevel, {
                message: `Write mismatch at ${pathPending}: expected ${nextLevel}, got failed verification`,
            });
        },
        indexLabel: `#${index + 1}`,
        name,
        wrapApplyButton: (applyButton) => withTooltip(applyButton, `Set level (max ${maxLevel})`),
        maxAction: true,
    });

// ── ConstructionBuildingsTab ───────────────────────────────────────────────

export const ConstructionBuildingsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Construction Buildings" });
    const { status: bulkStatus, run: runMaxAll } = useWriteStatus();
    const levelStates = Array.from({ length: BUILDING_COUNT }, () => van.state(0));
    const rowList = div({ class: "account-list construction-buildings-list" });
    let buildingMeta = [];
    const reconcileRows = createStaticRowReconciler(rowList);

    const load = async () =>
        run(async () => {
            const buildingRows = await readLevelDefinitions({
                levelsPath: "TowerInfo",
                definitionsPath: "TowerInfo",
                selectDefinitions: (_, definitions) => definitions.slice(0, BUILDING_COUNT),
                mapEntry: ({ definition, rawLevel, index }) => ({
                    name: cleanName(definition[0], `Building ${index + 1}`),
                    baseMax: toNum(definition[8]),
                    level: toNum(rawLevel),
                }),
            });
            const computedResults = await readComputedMany(
                "workbench",
                "ExtraMaxLvAtom",
                buildingRows.map((building, i) => [building.baseMax, i])
            );

            const buildings = buildingRows.map((building, i) => {
                if (!computedResults[i]?.ok) {
                    throw new Error(`ExtraMaxLvAtom failed for building ${i}`);
                }
                const extraMax = toNum(computedResults[i].value);
                const maxLevel = building.baseMax + extraMax;
                return { ...building, extraMax, maxLevel };
            });

            reconcileRows(
                buildings.map((building) => `${building.name}:${building.maxLevel}`).join("|"),
                () => {
                    const rowsPerColumn = Math.ceil(buildings.length / 3);
                    const columns = Array.from({ length: 3 }, (_, columnIndex) =>
                        div(
                            { class: "construction-buildings-col" },
                            ...buildings
                                .slice(columnIndex * rowsPerColumn, (columnIndex + 1) * rowsPerColumn)
                                .map((building, offset) => {
                                    const index = columnIndex * rowsPerColumn + offset;
                                    return BuildingRow({
                                        index,
                                        name: building.name,
                                        maxLevel: building.maxLevel,
                                        levelState: levelStates[index],
                                    });
                                })
                        )
                    );

                    return div({ class: "construction-buildings-grid grid-3col" }, ...columns);
                }
            );

            for (let i = 0; i < BUILDING_COUNT; i++) {
                levelStates[i].val = toNum(buildings[i]?.level);
            }

            buildingMeta = buildings;
        });

    const doMaxAll = async () => {
        if (!buildingMeta.length) return;
        await runMaxAll(async () => {
            await runBulkSet({
                entries: buildingMeta,
                getTargetValue: (building) => building?.maxLevel ?? 0,
                getValueState: (_, index) => levelStates[index],
                getWrites: ({ index, currentValue, targetValue }) => [
                    toNum(currentValue) !== targetValue ? { path: `TowerInfo[${index}]`, value: targetValue } : null,
                    { path: `TowerInfo[${index + BUILDING_COUNT}]`, value: targetValue },
                ],
            });
        });
    };

    load();

    return PersistentAccountListPage({
        title: "CONSTRUCTION - BUILDINGS",
        description: "Set building levels. Each building has its own max.",
        wrapActions: false,
        actions: BulkActionBar({
            actions: [
                {
                    label: "MAX ALL",
                    status: bulkStatus,
                    disabled: () => loading.val,
                    onClick: doMaxAll,
                },
            ],
            refresh: { onClick: load },
        }),
        state: { loading, error },
        loadingText: "READING CONSTRUCTION BUILDINGS",
        errorTitle: "CONSTRUCTION BUILDINGS READ FAILED",
        initialWrapperClass: "account-list",
        body: rowList,
    });
};


