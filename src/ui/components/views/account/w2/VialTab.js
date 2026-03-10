/**
 * W2 - Vials Tab (Alchemy Vials)
 *
 * Vial definitions: cList.AlchemyDescription[4]
 *   entry[0] = internal name key (for example "COPPER_CORONA")
 *
 * Levels stored in: CauldronInfo[4]
 * Level range: 0-13 (integer)
 *
 * Each VialRow holds its own local levelDisplay state. SET updates in place
 * without triggering a full list re-render.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AsyncFeatureBody, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

const MAX_VIAL_LEVEL = 13;

const VialRow = ({ vial, initialLevel }) => {
    const inputVal = van.state(String(initialLevel ?? 0));
    const levelDisplay = van.state(initialLevel ?? 0);
    const { status, run } = useWriteStatus();

    const doSet = async (raw) => {
        const lvl = Math.min(MAX_VIAL_LEVEL, Math.max(0, Math.round(Number(raw))));
        if (isNaN(lvl)) return;

        await run(async () => {
            await writeGga(`CauldronInfo[4][${vial.index}]`, lvl);
            inputVal.val = String(lvl);
            levelDisplay.val = lvl;
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
            span({ class: "feature-row__index" }, `#${vial.index}`),
            span({ class: "feature-row__name" }, vial.name)
        ),
        span({ class: "feature-row__badge" }, () => `LV ${levelDisplay.val} / ${MAX_VIAL_LEVEL}`),
        div(
            { class: "feature-row__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Math.min(MAX_VIAL_LEVEL, Number(inputVal.val) + 1))),
            }),
            button(
                {
                    class: () =>
                        `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => (status.val === "loading" ? "..." : "SET")
            )
        )
    );
};

export const VialTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const vialDefs = van.state([]);
    const setAllInput = van.state("13");
    const bulkStatus = van.state(null);
    let bulkDoneTimer = null;

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const [rawCauldronInfo, rawAlchemyDesc] = await Promise.all([
                readGga("CauldronInfo"),
                readCList("AlchemyDescription"),
            ]);

            const descArr = toIndexedArray(rawAlchemyDesc ?? []);
            const vialDesc = toIndexedArray(descArr[4] ?? []);
            const rawLevels = toIndexedArray(rawCauldronInfo?.[4] ?? []);

            vialDefs.val = vialDesc
                .map((entry, idx) => {
                    const entryArr = toIndexedArray(entry ?? []);
                    const name = String(entryArr[0] ?? "VIAL")
                        .replace(/_/g, " ")
                        .trim();
                    return { name, index: idx, level: Number(rawLevels[idx] ?? 0) };
                })
                .filter((v) => v.name.toUpperCase() !== "VIAL" && v.name.trim() !== "");
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            loading.val = false;
        }
    };

    const doSetAll = async () => {
        if (bulkDoneTimer) {
            clearTimeout(bulkDoneTimer);
            bulkDoneTimer = null;
        }

        const lvl = Math.min(MAX_VIAL_LEVEL, Math.max(0, Math.round(Number(setAllInput.val))));
        if (isNaN(lvl)) return;
        const vials = vialDefs.val ?? [];
        if (vials.length === 0) return;
        bulkStatus.val = "loading";
        try {
            for (const v of vials) {
                await writeGga(`CauldronInfo[4][${v.index}]`, lvl);
                await new Promise((r) => setTimeout(r, 30));
            }
            bulkStatus.val = "done";
            bulkDoneTimer = setTimeout(() => {
                if (bulkStatus.val === "done") bulkStatus.val = null;
                bulkDoneTimer = null;
            }, 1500);
            await load();
        } catch {
            bulkStatus.val = null;
            if (bulkDoneTimer) {
                clearTimeout(bulkDoneTimer);
                bulkDoneTimer = null;
            }
        }
    };

    load();

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data: vialDefs,
        renderLoading: () => div({ class: "feature-loader" }, Loader()),
        renderError: (message) => EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: message }),
        isEmpty: (vials) => vials.length === 0,
        renderEmpty: () =>
            EmptyState({ icon: Icons.SearchX(), title: "NO VIALS", subtitle: "No vial definitions found." }),
        renderContent: (vials) =>
            div({ class: "feature-list" }, ...vials.map((v) => VialRow({ vial: v, initialLevel: v.level }))),
    });

    return div(
        { class: "vials-tab tab-container" },
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "ALCHEMY — VIALS"),
                p({ class: "feature-header__desc" }, "Set vial levels (0–13) for all alchemy vials.")
            ),
            div(
                { class: "feature-header__actions" },
                div(
                    { class: "brewing-setall-row" },
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
                        () => (bulkStatus.val === "loading" ? "..." : bulkStatus.val === "done" ? "\u2713" : "SET ALL")
                    )
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH")
            )
        ),
        renderBody
    );
};
