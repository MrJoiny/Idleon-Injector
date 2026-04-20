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
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { AsyncAccountBody, toNum, useWriteStatus, writeVerified } from "../accountShared.js";

const { div, button, span } = van.tags;

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
            span({ class: "account-row__index" }, index + 1),
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
    const data = van.state(null);
    const { status: bulkStatus, run: runMaxAll } = useWriteStatus();
    const levelStates = Array.from({ length: BUILDING_COUNT }, () => van.state(0));

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
                    const name = String(entryArr[0] ?? "").replace(/_/g, " ");
                    const baseMax = toNum(entryArr[8]);
                    if (!computedResults[i]?.ok) {
                        throw new Error(`ExtraMaxLvAtom failed for building ${i}`);
                    }
                    const extraMax = toNum(computedResults[i].value);
                    const maxLevel = baseMax + extraMax;
                    return { name, baseMax, extraMax, maxLevel };
                });

                const nextLevels = (levels ?? []).slice(0, BUILDING_COUNT);
                for (let i = 0; i < BUILDING_COUNT; i++) {
                    levelStates[i].val = toNum(nextLevels[i]);
                }

                data.val = { buildings };
        });

    const doMaxAll = async () => {
        if (!data.val) return;
        await runMaxAll(async () => {
            const buildings = data.val.buildings;
            const writes = [];
            for (let i = 0; i < BUILDING_COUNT; i++) {
                const maxLv = buildings[i]?.maxLevel ?? 0;
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
                levelStates[i].val = buildings[i]?.maxLevel ?? 0;
            }
        });
    };

    load();

    return AccountPageShell({
        header: AccountTabHeader({
            title: "CONSTRUCTION - BUILDINGS",
            description: "Set building levels. Each building has its own max.",
            actions: [
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            [
                                "account-btn account-btn--max-reset",
                                bulkStatus.val === "loading" ? "account-btn--loading" : "",
                                bulkStatus.val === "success" ? "account-row--success" : "",
                                bulkStatus.val === "error" ? "account-row--error" : "",
                            ]
                                .filter(Boolean)
                                .join(" "),
                        disabled: () => bulkStatus.val === "loading" || loading.val,
                        onclick: (e) => {
                            e.preventDefault();
                            doMaxAll();
                        },
                    },
                    () => (bulkStatus.val === "loading" ? "MAXING..." : "MAX ALL")
                ),
                RefreshButton({ onRefresh: load }),
            ],
        }),
        body: AsyncAccountBody({
            loading,
            error,
            data,
            isEmpty: (resolved) => !resolved.buildings.length,
            renderEmpty: () =>
                EmptyState({ icon: Icons.SearchX(), title: "NO DATA", subtitle: "No building data found." }),
            renderContent: (resolved) =>
                div(
                    { class: "account-list" },
                    ...resolved.buildings.map((building, index) =>
                        BuildingRow({
                            index,
                            name: building.name,
                            maxLevel: building.maxLevel,
                            levelState: levelStates[index],
                        })
                    )
                ),
        }),
    });
};


