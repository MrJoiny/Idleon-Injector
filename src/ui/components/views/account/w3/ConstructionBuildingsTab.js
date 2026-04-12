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
import { readComputed, gga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { toNum, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

const BUILDING_COUNT = 27;

const getEffectiveBuildingMax = async (baseMax, index) => {
    try {
        const extraMax = toNum(await readComputed("workbench", "ExtraMaxLvAtom", [baseMax, index]));
        return { baseMax, extraMax, maxLevel: baseMax + extraMax };
    } catch {
        // Fall back to the base cap if the computed helper is unavailable.
        return { baseMax, extraMax: 0, maxLevel: baseMax };
    }
};

// ── BuildingRow ────────────────────────────────────────────────────────────

const BuildingRow = ({ index, name, maxLevel, levelState }) => {
    const inputVal = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(levelState.val ?? 0);
    });

    const doSet = async (raw) => {
        const lvl = Math.max(0, Math.min(maxLevel, Number(raw)));
        if (isNaN(lvl)) return;
        await run(async () => {
            const path = `TowerInfo[${index}]`;
            const pathPending = `TowerInfo[${index + BUILDING_COUNT}]`;
            const ok = await gga(path, lvl);
            if (!ok) throw new Error(`Write mismatch at ${path}: expected ${lvl}, got failed verification`);
            const okPending = await gga(pathPending, lvl);
            if (!okPending)
                throw new Error(`Write mismatch at ${pathPending}: expected ${lvl}, got failed verification`);
            levelState.val = lvl;
        });
    };

    return div(
        {
            class: () =>
                [
                    "feature-row",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },

        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, index + 1),
            span({ class: "feature-row__name" }, name)
        ),

        span({ class: "feature-row__badge" }, () => `LV ${levelState.val ?? 0} / ${maxLevel}`),

        div(
            { class: "feature-row__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Math.min(maxLevel, Number(inputVal.val) + 1))),
            }),
            withTooltip(
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => status.val === "loading",
                        onclick: (e) => {
                            e.preventDefault();
                            doSet(inputVal.val);
                        },
                    },
                    () => (status.val === "loading" ? "…" : "SET")
                ),
                `Set level (max ${maxLevel})`
            ),
            withTooltip(
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            `feature-btn construction-btn--max ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => status.val === "loading",
                        onclick: (e) => {
                            e.preventDefault();
                            inputVal.val = String(maxLevel);
                            doSet(maxLevel);
                        },
                    },
                    "MAX"
                ),
                `Set to max level (${maxLevel})`
            )
        )
    );
};

// ── ConstructionBuildingsTab ───────────────────────────────────────────────

export const ConstructionBuildingsTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const { status: bulkStatus, run: runMaxAll } = useWriteStatus();
    const levelStates = Array.from({ length: BUILDING_COUNT }, () => van.state(0));

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const [levels, rawBuildingInfo] = await Promise.all([gga("TowerInfo"), readCList("TowerInfo")]);

            const buildingInfo = toIndexedArray(rawBuildingInfo ?? []).slice(0, BUILDING_COUNT);
            const maxInfos = await Promise.all(
                buildingInfo.map(async (entry, i) => {
                    const entryArr = toIndexedArray(entry ?? []);
                    const baseMax = toNum(entryArr[8]);
                    return getEffectiveBuildingMax(baseMax, i);
                })
            );

            const buildings = buildingInfo.map((entry, i) => {
                const entryArr = toIndexedArray(entry ?? []);
                const name = String(entryArr[0] ?? "").replace(/_/g, " ");
                const { baseMax, extraMax, maxLevel } = maxInfos[i] ?? { baseMax: 0, extraMax: 0, maxLevel: 0 };
                return { name, baseMax, extraMax, maxLevel };
            });

            const nextLevels = (levels ?? []).slice(0, BUILDING_COUNT);
            for (let i = 0; i < BUILDING_COUNT; i++) {
                levelStates[i].val = toNum(nextLevels[i]);
            }

            data.val = { buildings };
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            loading.val = false;
        }
    };

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

    return div(
        { class: "tab-container" },

        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "CONSTRUCTION — BUILDINGS"),
                p({ class: "feature-header__desc" }, "Set building levels. Each building has its own max.")
            ),
            div(
                { class: "feature-header__actions" },
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            [
                                "feature-btn feature-btn--apply",
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
                    () => (bulkStatus.val === "loading" ? "MAXING…" : "MAX ALL")
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH")
            )
        ),

        () => {
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
        }
    );
};
