/**
 * W3 - Salt Lick Tab
 *
 * Data sources:
 *   gga.SaltLick[n]                   - current level of upgrade n
 *   gga.CustomLists.h.SaltLicks[n][1] - upgrade name
 *   gga.CustomLists.h.SaltLicks[n][4] - max level for upgrade n
 *
 * Array length is taken from CustomLists.h.SaltLicks (authoritative game table).
 * gga.SaltLick may contain more entries than there are actual upgrades — it is
 * implicitly trimmed because load() only iterates over defs.length entries.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AsyncFeatureBody, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

const SaltLickRow = ({ index, name, maxLevel, levelState }) => {
    const inputVal = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(levelState.val ?? 0);
    });

    const doSet = async (raw) => {
        const lvl = Math.max(0, Math.min(maxLevel, safeNum(raw)));
        if (isNaN(lvl)) return;

        await run(async () => {
            await writeGga(`SaltLick[${index}]`, lvl);
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
                onDecrement: () => (inputVal.val = String(Math.max(0, safeNum(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Math.min(maxLevel, safeNum(inputVal.val) + 1))),
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

export const SaltLickTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const bulkStatus = van.state(null);
    const levelStates = [];

    const getLevelState = (i) => {
        if (!levelStates[i]) levelStates[i] = van.state(0);
        return levelStates[i];
    };

    const doSetAll = async (targetLevel) => {
        if (!data.val || data.val.upgrades.length === 0) return;
        bulkStatus.val = "loading";
        try {
            for (let i = 0; i < data.val.upgrades.length; i++) {
                const lvl = targetLevel === null ? data.val.upgrades[i].maxLevel : targetLevel;
                await writeGga(`SaltLick[${i}]`, lvl);
                getLevelState(i).val = lvl;
                await new Promise((r) => setTimeout(r, 20));
            }
            bulkStatus.val = "done";
            setTimeout(() => (bulkStatus.val = null), 1500);
        } catch {
            bulkStatus.val = null;
        }
    };

    const load = async (showSpinner = true) => {
        if (showSpinner) loading.val = true;
        error.val = null;
        try {
            const [rawLevels, rawDefs] = await Promise.all([readGga("SaltLick"), readGga("CustomLists.h.SaltLicks")]);

            const defs = toIndexedArray(rawDefs ?? []);
            const upgrades = defs.map((entry, i) => {
                const entryArr = toIndexedArray(entry ?? []);
                const name = String(entryArr[1] ?? `Salt Lick ${i + 1}`)
                    .replace(/\+\{/g, "")
                    .replace(/_/g, " ")
                    .trim();
                const maxLevel = safeNum(entryArr[4]);
                return { name, maxLevel };
            });

            const rawArr = toIndexedArray(rawLevels ?? []);
            upgrades.forEach((_, i) => {
                getLevelState(i).val = safeNum(rawArr[i]);
            });

            data.val = { upgrades };
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
        isEmpty: (resolved) => !resolved.upgrades.length,
        renderEmpty: () =>
            EmptyState({ icon: Icons.SearchX(), title: "NO DATA", subtitle: "No Salt Lick data found." }),
        renderContent: (resolved) =>
            div(
                { class: "feature-list" },
                ...resolved.upgrades.map((u, i) =>
                    SaltLickRow({
                        index: i,
                        name: u.name,
                        maxLevel: u.maxLevel,
                        levelState: getLevelState(i),
                    })
                )
            ),
    });

    return div(
        { class: "tab-container" },
        div(
            { class: "feature-header" },
            div({}, h3({}, "SALT LICK"), p({ class: "feature-header__desc" }, "Set Salt Lick upgrade levels.")),
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
