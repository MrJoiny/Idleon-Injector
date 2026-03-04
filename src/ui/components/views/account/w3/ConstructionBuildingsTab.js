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
import { readComputed, readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";

const { div, button, span, h3, p } = van.tags;

const BUILDING_COUNT = 27;

const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const getEffectiveBuildingMax = async (baseMax, index) => {
    try {
        const extraMax = safeNum(await readComputed("workbench", "ExtraMaxLvAtom", [baseMax, index]));
        return { baseMax, extraMax, maxLevel: baseMax + extraMax };
    } catch {
        // Fall back to the base cap if the computed helper is unavailable.
        return { baseMax, extraMax: 0, maxLevel: baseMax };
    }
};

// ── BuildingRow ────────────────────────────────────────────────────────────

const BuildingRow = ({ index, name, maxLevel, getData, onReload }) => {
    const inputVal = van.state(String(getData()?.levels?.[index] ?? 0));
    const status = van.state(null);

    van.derive(() => {
        inputVal.val = String(getData()?.levels?.[index] ?? 0);
    });

    const doSet = async (raw) => {
        const lvl = Math.max(0, Math.min(maxLevel, Number(raw)));
        if (isNaN(lvl)) return;
        status.val = "loading";
        try {
            await writeGga(`TowerInfo[${index}]`, lvl);
            await writeGga(`TowerInfo[${index + BUILDING_COUNT}]`, lvl);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
            await onReload?.();
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "feature-row",
                status.val === "success" ? "feature-row--success" : "",
                status.val === "error" ? "feature-row--error" : "",
            ].filter(Boolean).join(" "),
        },

        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, index + 1),
            span({ class: "feature-row__name" }, name),
        ),

        span(
            { class: "feature-row__badge" },
            () => `LV ${getData()?.levels?.[index] ?? 0} / ${maxLevel}`
        ),

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
                        class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => status.val === "loading",
                        onclick: () => doSet(inputVal.val),
                    },
                    () => status.val === "loading" ? "…" : "SET"
                ),
                `Set level (max ${maxLevel})`
            ),
            withTooltip(
                button(
                    {
                        class: () => `feature-btn construction-btn--max ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => status.val === "loading",
                        onclick: () => {
                            inputVal.val = String(maxLevel);
                            doSet(maxLevel);
                        },
                    },
                    "MAX"
                ),
                `Set to max level (${maxLevel})`
            ),
        )
    );
};

// ── ConstructionBuildingsTab ───────────────────────────────────────────────

export const ConstructionBuildingsTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const bulkStatus = van.state(null);

    const toArr = (raw) => Array.isArray(raw)
        ? raw
        : Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const [levels, rawBuildingInfo] = await Promise.all([
                readGga("TowerInfo"),
                readGga("CustomLists.TowerInfo"),
            ]);

            const buildingInfo = toArr(rawBuildingInfo ?? []).slice(0, BUILDING_COUNT);
            const maxInfos = await Promise.all(
                buildingInfo.map(async (entry, i) => {
                    const entryArr = toArr(entry ?? []);
                    const baseMax = safeNum(entryArr[8]);
                    return getEffectiveBuildingMax(baseMax, i);
                })
            );

            const buildings = buildingInfo.map((entry, i) => {
                const entryArr = toArr(entry ?? []);
                const name = String(entryArr[0] ?? "").replace(/_/g, " ");
                const { baseMax, extraMax, maxLevel } = maxInfos[i] ?? { baseMax: 0, extraMax: 0, maxLevel: 0 };
                return { name, baseMax, extraMax, maxLevel };
            });

            data.val = {
                levels: (levels ?? []).slice(0, BUILDING_COUNT),
                buildings,
            };
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            loading.val = false;
        }
    };

    const doMaxAll = async () => {
        if (!data.val) return;
        bulkStatus.val = "loading";
        try {
            for (let i = 0; i < BUILDING_COUNT; i++) {
                const maxLv = data.val.buildings[i]?.maxLevel ?? 0;
                await writeGga(`TowerInfo[${i}]`, maxLv);
                await writeGga(`TowerInfo[${i + BUILDING_COUNT}]`, maxLv);
                await new Promise((r) => setTimeout(r, 30));
            }
            bulkStatus.val = "done";
            setTimeout(() => (bulkStatus.val = null), 1500);
            await load();
        } catch {
            bulkStatus.val = null;
        }
    };

    load();

    return div(
        { class: "world-feature scroll-container" },

        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "CONSTRUCTION — BUILDINGS"),
                p({ class: "feature-header__desc" }, "Set building levels. Each building has its own max."),
            ),
            div(
                { class: "feature-header__actions" },
                button(
                    {
                        class: () => `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading" || loading.val,
                        onclick: doMaxAll,
                    },
                    () => bulkStatus.val === "loading" ? "MAXING…" : bulkStatus.val === "done" ? "✓ DONE" : "MAX ALL"
                ),
                button({ class: "feature-btn", onclick: load }, Icons.Refresh(), " REFRESH"),
            ),
        ),

        () => {
            if (loading.val) return div({ class: "feature-list" }, div({ class: "feature-loader" }, Loader()));
            if (error.val) return div({ class: "feature-list" }, EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", desc: error.val }));
            if (!data.val) return div({ class: "feature-list" });

            const buildings = data.val.buildings;
            if (!buildings.length) return div({ class: "feature-list" }, EmptyState({ icon: Icons.SearchX(), title: "NO DATA", desc: "No building data found." }));

            return div(
                { class: "feature-list" },
                ...buildings.map((b, i) =>
                    BuildingRow({
                        index: i,
                        name: b.name,
                        maxLevel: b.maxLevel,
                        getData: () => data.val,
                        onReload: load,
                    })
                )
            );
        }
    );
};
