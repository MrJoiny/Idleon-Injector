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
            const path = `CauldronInfo[4][${vial.index}]`;
            await writeGga(path, lvl);
            const verified = Math.min(MAX_VIAL_LEVEL, Math.max(0, Math.round(Number(await readGga(path)))));
            if (verified !== lvl) throw new Error(`Write mismatch at ${path}: expected ${lvl}, got ${verified}`);
            inputVal.val = String(verified);
            levelDisplay.val = verified;
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
    const { status: bulkStatus, run: runBulk } = useWriteStatus();

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
        const lvl = Math.min(MAX_VIAL_LEVEL, Math.max(0, Math.round(Number(setAllInput.val))));
        if (isNaN(lvl)) return;
        const vials = vialDefs.val ?? [];
        if (vials.length === 0) return;

        await runBulk(async () => {
            for (const v of vials) {
                await writeGga(`CauldronInfo[4][${v.index}]`, lvl);
                await new Promise((r) => setTimeout(r, 30));
            }
            const rawVerified = await readGga("CauldronInfo[4]");
            const verifiedArr = toIndexedArray(rawVerified ?? []);
            for (const v of vials) {
                const verified = Math.min(MAX_VIAL_LEVEL, Math.max(0, Math.round(Number(verifiedArr[v.index] ?? 0))));
                if (verified !== lvl)
                    throw new Error(`Write mismatch at CauldronInfo[4][${v.index}]: expected ${lvl}, got ${verified}`);
            }
            vialDefs.val = vials.map((v) => ({ ...v, level: lvl }));
        });
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
                button({ class: "btn-secondary", onclick: load }, "REFRESH")
            )
        ),
        renderBody
    );
};
