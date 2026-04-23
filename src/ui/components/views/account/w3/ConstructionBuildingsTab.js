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
import { readComputedMany, gga, ggaMany, readCList } from "../../../../services/api.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { cleanName, toNum, useWriteStatus, writeVerified } from "../accountShared.js";

const { div, span } = van.tags;

const BUILDING_COUNT = 27;

// ── BuildingRow ────────────────────────────────────────────────────────────

const BuildingRow = ({ index, name, maxLevel, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) => {
            const lvl = Math.max(0, Math.min(maxLevel, Number(rawValue)));
            return Number.isNaN(lvl) ? null : lvl;
        },
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
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${index + 1}`),
            span({ class: "account-row__name" }, name),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / ${maxLevel}`,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const next = Number.isFinite(base) ? base : Number(currentValue ?? 0);
            return Math.max(0, Math.min(maxLevel, next + delta));
        },
        wrapApplyButton: (applyButton) => withTooltip(applyButton, `Set level (max ${maxLevel})`),
        maxAction: {
            value: maxLevel,
            tooltip: `Set to max level (${maxLevel})`,
        },
    });

// ── ConstructionBuildingsTab ───────────────────────────────────────────────

export const ConstructionBuildingsTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Construction Buildings" });
    const { status: bulkStatus, run: runMaxAll } = useWriteStatus();
    const levelStates = Array.from({ length: BUILDING_COUNT }, () => van.state(0));
    const rowList = div({ class: "account-list construction-buildings-list" });
    let rowSignature = "";
    let buildingMeta = [];

    const load = async () =>
        run(async () => {
                const [levels, rawBuildingInfo] = await Promise.all([gga("TowerInfo"), readCList("TowerInfo")]);

                const buildingInfo = toIndexedArray(rawBuildingInfo ?? []).slice(0, BUILDING_COUNT);
                const argSets = buildingInfo.map((entry, i) => {
                    const entryArr = toIndexedArray(entry ?? []);
                    return [toNum(entryArr[8]), i];
                });
                const computedResults = await readComputedMany("workbench", "ExtraMaxLvAtom", argSets);

                const buildings = buildingInfo.map((entry, i) => {
                    const entryArr = toIndexedArray(entry ?? []);
                    const name = cleanName(entryArr[0], `Building ${i + 1}`);
                    const baseMax = toNum(entryArr[8]);
                    if (!computedResults[i]?.ok) {
                        throw new Error(`ExtraMaxLvAtom failed for building ${i}`);
                    }
                    const extraMax = toNum(computedResults[i].value);
                    const maxLevel = baseMax + extraMax;
                    return { name, baseMax, extraMax, maxLevel };
                });

                const nextSignature = buildings.map((building) => `${building.name}:${building.maxLevel}`).join("|");
                if (nextSignature !== rowSignature) {
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
                    rowList.replaceChildren(
                        div({ class: "construction-buildings-grid grid-3col" }, ...columns)
                    );
                    rowSignature = nextSignature;
                }

                const nextLevels = (levels ?? []).slice(0, BUILDING_COUNT);
                for (let i = 0; i < BUILDING_COUNT; i++) {
                    levelStates[i].val = toNum(nextLevels[i]);
                }

                buildingMeta = buildings;
        });

    const doMaxAll = async () => {
        if (!buildingMeta.length) return;
        await runMaxAll(async () => {
            const writes = [];
            for (let i = 0; i < BUILDING_COUNT; i++) {
                const maxLv = buildingMeta[i]?.maxLevel ?? 0;
                if (toNum(levelStates[i].val) !== maxLv) {
                    writes.push({ path: `TowerInfo[${i}]`, value: maxLv });
                }
                writes.push({ path: `TowerInfo[${i + BUILDING_COUNT}]`, value: maxLv });
            }
            if (writes.length > 0) {
                const result = await ggaMany(writes);
                const failed = result.results.filter((entry) => !entry.ok);
                if (failed.length > 0) {
                    const failedWrite = writes.find((entry) => entry.path === failed[0].path);
                    throw new Error(
                        `Write mismatch at ${failed[0].path}: expected ${failedWrite?.value ?? "unknown"}, got failed verification`
                    );
                }
            }
            for (let i = 0; i < BUILDING_COUNT; i++) {
                levelStates[i].val = buildingMeta[i]?.maxLevel ?? 0;
            }
        });
    };

    load();

    return AccountPageShell({
        header: AccountTabHeader({
            title: "CONSTRUCTION - BUILDINGS",
            description: "Set building levels. Each building has its own max.",
            actions: [
                ActionButton({
                    label: "MAX ALL",
                    status: bulkStatus,
                    variant: "max-reset",
                    disabled: () => loading.val,
                    onClick: (e) => {
                        e.preventDefault();
                        doMaxAll();
                    },
                }),
                RefreshButton({ onRefresh: load }),
            ],
        }),
        persistentState: { loading, error },
        persistentLoadingText: "READING CONSTRUCTION BUILDINGS",
        persistentErrorTitle: "CONSTRUCTION BUILDINGS READ FAILED",
        persistentInitialWrapperClass: "account-list",
        body: rowList,
    });
};


