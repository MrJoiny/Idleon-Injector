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
import { readComputedMany, gga, readCList } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { runAccountLoad } from "../accountLoadPolicy.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { toNum, useWriteStatus } from "../featureShared.js";

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
            const ok = await gga(path, nextLevel);
            if (!ok) throw new Error(`Write mismatch at ${path}: expected ${nextLevel}, got failed verification`);
            const okPending = await gga(pathPending, nextLevel);
            if (!okPending)
                throw new Error(`Write mismatch at ${pathPending}: expected ${nextLevel}, got failed verification`);
            return nextLevel;
        },
        renderInfo: () => [
            span({ class: "feature-row__index" }, index + 1),
            span({ class: "feature-row__name" }, name),
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
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const { status: bulkStatus, run: runMaxAll } = useWriteStatus();
    const levelStates = Array.from({ length: BUILDING_COUNT }, () => van.state(0));

    const load = async () =>
        runAccountLoad(
            {
                loading,
                error,
                label: "Construction Buildings",
                fallbackMessage: "Failed to load construction buildings",
            },
            async () => {
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
        }
        );

    const doMaxAll = async () => {
        if (!data.val) return;
        await runMaxAll(async () => {
            const buildings = data.val.buildings;
            for (let i = 0; i < BUILDING_COUNT; i++) {
                const maxLv = buildings[i]?.maxLevel ?? 0;
                const path = `TowerInfo[${i}]`;
                const pathPending = `TowerInfo[${i + BUILDING_COUNT}]`;
                const ok = await gga(path, maxLv);
                if (!ok) throw new Error(`Write mismatch at ${path}: expected ${maxLv}, got failed verification`);
                const okPending = await gga(pathPending, maxLv);
                if (!okPending)
                    throw new Error(`Write mismatch at ${pathPending}: expected ${maxLv}, got failed verification`);
                await new Promise((r) => setTimeout(r, 30));
            }
            for (let i = 0; i < BUILDING_COUNT; i++) {
                levelStates[i].val = buildings[i]?.maxLevel ?? 0;
            }
        });
    };

    load();

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "CONSTRUCTION - BUILDINGS",
            description: "Set building levels. Each building has its own max.",
            actions: [
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            [
                                "feature-btn feature-btn--max-reset",
                                bulkStatus.val === "loading" ? "feature-btn--loading" : "",
                                bulkStatus.val === "success" ? "feature-row--success" : "",
                                bulkStatus.val === "error" ? "feature-row--error" : "",
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
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ],
        }),
        body: () => {
            if (loading.val) return div({ class: "feature-loader" }, Loader());
            if (error.val) return EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val });
            if (!data.val) return null;

            const buildings = data.val.buildings;
            if (!buildings.length)
                return EmptyState({ icon: Icons.SearchX(), title: "NO DATA", subtitle: "No building data found." });

            return div(
                { class: "feature-list" },
                ...buildings.map((b, i) =>
                    BuildingRow({
                        index: i,
                        name: b.name,
                        maxLevel: b.maxLevel,
                        levelState: levelStates[i],
                    })
                )
            );
        },
    });
};
