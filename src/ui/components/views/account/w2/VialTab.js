/**
 * W2 - Vials Tab (Alchemy Vials)
 *
 * Vial definitions: cList.AlchemyDescription[4]
 *   entry[0] = internal name key (for example "COPPER_CORONA")
 *
 * Levels stored in: CauldronInfo[4]
 * Level range: 0-13 (integer)
 *
 * Uses one persistent van.state per vial level so row writes and bulk updates
 * both update the same committed state without rebuilding row-local truth.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { runAccountLoad } from "../accountLoadPolicy.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { AsyncFeatureBody, useWriteStatus } from "../featureShared.js";

const { div, button, span } = van.tags;

const MAX_VIAL_LEVEL = 13;

const VialRow = ({ vial, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) => {
            const lvl = Math.min(MAX_VIAL_LEVEL, Math.max(0, Math.round(Number(rawValue))));
            return Number.isNaN(lvl) ? null : lvl;
        },
        write: async (nextLevel) => {
            const path = `CauldronInfo[4][${vial.index}]`;
            const ok = await gga(path, nextLevel);
            if (!ok) throw new Error(`Write mismatch at ${path}: expected ${nextLevel}`);
            return nextLevel;
        },
        renderInfo: () => [
            span({ class: "feature-row__index" }, `#${vial.index}`),
            span({ class: "feature-row__name" }, vial.name),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / ${MAX_VIAL_LEVEL}`,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const next = Number.isFinite(base) ? base : Number(currentValue ?? 0);
            return Math.min(MAX_VIAL_LEVEL, Math.max(0, next + delta));
        },
    });

export const VialTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const vialDefs = van.state([]);
    const setAllInput = van.state("13");
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const levelStates = [];

    const getLevelState = (index) => {
        if (!levelStates[index]) levelStates[index] = van.state(0);
        return levelStates[index];
    };

    const load = async () =>
        runAccountLoad({ loading, error, label: "Vials", fallbackMessage: "Failed to load vial data" }, async () => {
            const [rawCauldronInfo, rawAlchemyDesc] = await Promise.all([
                gga("CauldronInfo"),
                readCList("AlchemyDescription"),
            ]);

            const descArr = toIndexedArray(rawAlchemyDesc ?? []);
            const vialDesc = toIndexedArray(descArr[4] ?? []);
            const rawLevels = toIndexedArray(rawCauldronInfo?.[4] ?? []);

            const nextVialDefs = vialDesc
                .map((entry, idx) => {
                    const entryArr = toIndexedArray(entry ?? []);
                    const name = String(entryArr[0] ?? "VIAL")
                        .replace(/_/g, " ")
                        .trim();
                    const level = Number(rawLevels[idx] ?? 0);
                    return {
                        name,
                        index: idx,
                        level: Number.isFinite(level) ? level : 0,
                    };
                })
                .filter((v) => v.name.toUpperCase() !== "VIAL" && v.name.trim() !== "");

            nextVialDefs.forEach((vial) => {
                getLevelState(vial.index).val = vial.level;
            });
            vialDefs.val = nextVialDefs.map(({ name, index }) => ({ name, index }));
        });

    const doSetAll = async () => {
        const lvl = Math.min(MAX_VIAL_LEVEL, Math.max(0, Math.round(Number(setAllInput.val))));
        if (isNaN(lvl)) return;
        const vials = vialDefs.val ?? [];
        if (vials.length === 0) return;

        await runBulk(async () => {
            for (const v of vials) {
                const ok = await gga(`CauldronInfo[4][${v.index}]`, lvl);
                if (!ok) throw new Error(`Write mismatch at CauldronInfo[4][${v.index}]: expected ${lvl}`);
                await new Promise((r) => setTimeout(r, 30));
            }
            for (const v of vials) {
                getLevelState(v.index).val = lvl;
            }
        });
    };

    load();

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data: vialDefs,
        isEmpty: (vials) => vials.length === 0,
        renderEmpty: () =>
            EmptyState({ icon: Icons.SearchX(), title: "NO VIALS", subtitle: "No vial definitions found." }),
        renderContent: (vials) =>
            div({ class: "feature-list" }, ...vials.map((v) => VialRow({ vial: v, levelState: getLevelState(v.index) }))),
    });

    return AccountPageShell({
        rootClass: "vials-tab tab-container feature-tab-frame",
        header: FeatureTabHeader({
            title: "ALCHEMY - VIALS",
            description: "Set vial levels (0-13) for all alchemy vials.",
            actions: [
                div(
                    {
                        class: () =>
                            [
                                "brewing-setall-row",
                                bulkStatus.val === "success" ? "feature-row--success" : "",
                                bulkStatus.val === "error" ? "feature-row--error" : "",
                            ]
                                .filter(Boolean)
                                .join(" "),
                    },
                    span({ class: "brewing-setall-label" }, "SET ALL:"),
                    div(
                        { class: "brewing-setall-input-wrap" },
                        NumberInput({
                            mode: "int",
                            value: setAllInput,
                            oninput: (e) => (setAllInput.val = e.target.value),
                            onDecrement: () => (setAllInput.val = String(Math.max(0, Number(setAllInput.val) - 1))),
                            onIncrement: () =>
                                (setAllInput.val = String(Math.min(MAX_VIAL_LEVEL, Number(setAllInput.val) + 1))),
                        })
                    ),
                    button(
                        {
                            class: () =>
                                `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                            disabled: () => bulkStatus.val === "loading",
                            onclick: doSetAll,
                        },
                        () =>
                            bulkStatus.val === "loading" ? "..." : bulkStatus.val === "success" ? "\u2713" : "SET ALL"
                    )
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ],
        }),
        body: renderBody,
    });
};
