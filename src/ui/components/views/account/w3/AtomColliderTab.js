/**
 * W3 - Atom Collider Tab
 *
 * Data sources:
 *   gga.Atoms[b]                     - current level of atom b
 *   cList.AtomInfo[b][0] - atom name (underscores -> spaces)
 *
 * Max level is computed via:
 *   readComputed("atomCollider", "AtomMaxLv", [b, 0])
 *
 * Array length is taken from cList.AtomInfo (authoritative source).
 * All per-atom max level requests are fetched in parallel during load via
 * Promise.all — readComputed returns 0 on failure so the tab still renders.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputed, readGga, writeGga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AsyncFeatureBody, toNum, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

const AtomRow = ({ index, name, maxLevel, levelState }) => {
    const inputVal = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(levelState.val ?? 0);
    });

    const doSet = async (raw) => {
        const lvl = Math.max(0, Math.min(maxLevel, toNum(raw)));
        if (isNaN(lvl)) return;

        await run(async () => {
            await writeGga(`Atoms[${index}]`, lvl);
            levelState.val = lvl;
            inputVal.val = String(lvl);
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
        span({ class: "feature-row__badge" }, () => `LV ${levelState.val} / ${maxLevel}`),
        div(
            { class: "feature-row__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, toNum(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Math.min(maxLevel, toNum(inputVal.val) + 1))),
            }),
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
                () => (status.val === "loading" ? "..." : "SET")
            )
        )
    );
};

export const AtomColliderTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const bulkStatus = van.state(null);
    let bulkDoneTimer = null;
    const levelStates = [];

    const getLevelState = (i) => {
        if (!levelStates[i]) levelStates[i] = van.state(0);
        return levelStates[i];
    };

    const doSetAll = async (targetLevel) => {
        if (bulkDoneTimer) {
            clearTimeout(bulkDoneTimer);
            bulkDoneTimer = null;
        }

        if (!data.val || data.val.atoms.length === 0) return;
        bulkStatus.val = "loading";
        try {
            for (let i = 0; i < data.val.atoms.length; i++) {
                const lvl = targetLevel === null ? data.val.atoms[i].maxLevel : targetLevel;
                await writeGga(`Atoms[${i}]`, lvl);
                getLevelState(i).val = lvl;
                await new Promise((r) => setTimeout(r, 20));
            }
            bulkStatus.val = "done";
            bulkDoneTimer = setTimeout(() => {
                if (bulkStatus.val === "done") bulkStatus.val = null;
                bulkDoneTimer = null;
            }, 1500);
        } catch {
            bulkStatus.val = null;
            if (bulkDoneTimer) {
                clearTimeout(bulkDoneTimer);
                bulkDoneTimer = null;
            }
        }
    };

    const load = async (showSpinner = true) => {
        if (showSpinner) loading.val = true;
        error.val = null;
        try {
            const [rawLevels, rawAtomInfo] = await Promise.all([readGga("Atoms"), readCList("AtomInfo")]);

            const atomInfoArr = toIndexedArray(rawAtomInfo ?? []);

            const maxLevels = await Promise.all(
                atomInfoArr.map((_, i) =>
                    readComputed("atomCollider", "AtomMaxLv", [i, 0])
                        .then((v) => toNum(v))
                        .catch(() => 0)
                )
            );

            const atoms = atomInfoArr.map((entry, i) => {
                const entryArr = toIndexedArray(entry ?? []);
                const name = String(entryArr[0] ?? `Atom ${i + 1}`)
                    .replace(/\+\{/g, "")
                    .replace(/_/g, " ")
                    .trim();
                return { name, maxLevel: maxLevels[i] ?? 0 };
            });

            const rawArr = toIndexedArray(rawLevels ?? []);
            atoms.forEach((_, i) => {
                getLevelState(i).val = toNum(rawArr[i]);
            });

            data.val = { atoms };
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            if (showSpinner) loading.val = false;
        }
    };

    load(true);

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        renderLoading: () => div({ class: "feature-loader" }, Loader()),
        renderError: (message) => EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: message }),
        isEmpty: (resolved) => !resolved.atoms.length,
        renderEmpty: () =>
            EmptyState({ icon: Icons.SearchX(), title: "NO DATA", subtitle: "No Atom Collider data found." }),
        renderContent: (resolved) =>
            div(
                { class: "feature-list" },
                ...resolved.atoms.map((a, i) =>
                    AtomRow({
                        index: i,
                        name: a.name,
                        maxLevel: a.maxLevel,
                        levelState: getLevelState(i),
                    })
                )
            ),
    });

    return div(
        { class: "tab-container" },
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "ATOM COLLIDER"),
                p(
                    { class: "feature-header__desc" },
                    "Set Atom Collider upgrade levels. Max levels are computed from game data."
                )
            ),
            div(
                { class: "feature-header__actions" },
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: (e) => {
                            e.preventDefault();
                            doSetAll(null);
                        },
                    },
                    "MAX ALL"
                ),
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: (e) => {
                            e.preventDefault();
                            doSetAll(0);
                        },
                    },
                    "RESET ALL"
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH")
            )
        ),
        renderBody
    );
};
