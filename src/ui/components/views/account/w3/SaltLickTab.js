/**
 * W3 — Salt Lick Tab
 *
 * Data sources:
 *   gga.SaltLick[n]                   — current level of upgrade n
 *   gga.CustomLists.h.SaltLicks[n][1] — upgrade name (underscores → spaces)
 *   gga.CustomLists.h.SaltLicks[n][4] — max level for upgrade n
 *
 * Array length is taken from CustomLists.h.SaltLicks (authoritative game table).
 * gga.SaltLick may contain more entries than there are actual upgrades — it is
 * sliced down to the table length before use.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";

const { div, button, span, h3, p } = van.tags;

const toArr = (raw) =>
    Array.isArray(raw)
        ? raw
        : Object.keys(raw ?? {}).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);

const safeNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// ── SaltLickRow ────────────────────────────────────────────────────────────

const SaltLickRow = ({ index, name, maxLevel, initialLevel }) => {
    const levelDisplay = van.state(initialLevel);
    const inputVal = van.state(String(initialLevel));
    const status = van.state(null);

    const doSet = async (raw) => {
        const lvl = Math.max(0, Math.min(maxLevel, safeNum(raw)));
        if (isNaN(lvl)) return;
        status.val = "loading";
        try {
            await writeGga(`SaltLick[${index}]`, lvl);
            levelDisplay.val = lvl;
            inputVal.val = String(lvl);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
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
            () => `LV ${levelDisplay.val} / ${maxLevel}`
        ),

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
                    class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => status.val === "loading" ? "…" : "SET"
            ),
        ),
    );
};

// ── SaltLickTab ────────────────────────────────────────────────────────────

export const SaltLickTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const bulkStatus = van.state(null); // "loading" | "done" | null

    // targetLevel: null = each upgrade's own max, 0 = reset
    const doSetAll = async (targetLevel) => {
        if (!data.val || data.val.upgrades.length === 0) return;
        bulkStatus.val = "loading";
        try {
            for (let i = 0; i < data.val.upgrades.length; i++) {
                const lvl = targetLevel === null ? data.val.upgrades[i].maxLevel : targetLevel;
                await writeGga(`SaltLick[${i}]`, lvl);
                await new Promise((r) => setTimeout(r, 20));
            }
            bulkStatus.val = "done";
            setTimeout(() => (bulkStatus.val = null), 1500);
            await load();
        } catch {
            bulkStatus.val = null;
        }
    };

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const [rawLevels, rawDefs] = await Promise.all([
                readGga("SaltLick"),
                readGga("CustomLists.h.SaltLicks"),
            ]);

            const defs = toArr(rawDefs ?? []);
            const upgrades = defs.map((entry, i) => {
                const e = toArr(entry ?? []);
                const name = String(e[1] ?? `Salt Lick ${i + 1}`).replace(/\+\{/g, "").replace(/_/g, " ").trim();
                const maxLevel = safeNum(e[4]);
                return { name, maxLevel };
            });

            const rawArr = toArr(rawLevels ?? []);
            const levels = upgrades.map((_, i) => safeNum(rawArr[i]));

            data.val = { levels, upgrades };
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div(
        { class: "tab-container" },

        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "SALT LICK"),
                p({ class: "feature-header__desc" }, "Set Salt Lick upgrade levels."),
            ),
            div(
                { class: "feature-header__actions" },
                button(
                    {
                        class: () => `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(null),
                    },
                    "MAX ALL"
                ),
                button(
                    {
                        class: () => `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(0),
                    },
                    "RESET ALL"
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ),
        ),

        () => {
            if (loading.val) return div({ class: "feature-loader" }, Loader());
            if (error.val) return EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val });
            if (!data.val) return null;

            const { levels, upgrades } = data.val;
            if (!upgrades.length) return EmptyState({ icon: Icons.SearchX(), title: "NO DATA", subtitle: "No Salt Lick data found." });

            return div(
                { class: "feature-list" },
                ...upgrades.map((u, i) =>
                    SaltLickRow({
                        index: i,
                        name: u.name,
                        maxLevel: u.maxLevel,
                        initialLevel: levels[i],
                    })
                )
            );
        }
    );
};
