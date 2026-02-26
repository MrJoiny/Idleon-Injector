/**
 * W1 — Stamps Tab
 *
 * Uses generic .feature-* CSS classes from _feature-pages.css.
 * Adding Forge, Alchemy etc. just means a new JS file with the same classes.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readMany, writeAttr } from "../../../../helpers/gameHelper.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";

const { div, button, span, h3, p } = van.tags;

const PAGES = [
    { id: 0, label: "COMBAT" },
    { id: 1, label: "SKILLS" },
    { id: 2, label: "MISC" },
];

// ── StampRow ──────────────────────────────────────────────────────────────

const StampRow = ({ page, order, name, step, levels, maxLevels, onLocalUpdate }) => {
    const inputVal = van.state(String(levels?.[page]?.[order] ?? 0));
    const status   = van.state(null); // "loading" | "success" | "error" | null

    const doSet = async (targetLevel) => {
        const lvl = Math.max(0, Number(targetLevel));
        if (isNaN(lvl)) return;
        // Max level unlocks in steps — round up to the next step boundary
        const maxLvl = (step > 0 && lvl > 0) ? Math.ceil(lvl / step) * step : lvl;
        status.val = "loading";
        try {
            await writeAttr(`bEngine.getGameAttribute("StampLevel")[${page}][${order}] = ${lvl}`);
            await writeAttr(`bEngine.getGameAttribute("StampLevelMAX")[${page}][${order}] = ${maxLvl}`);
            inputVal.val = String(lvl);
            onLocalUpdate?.(page, order, lvl, maxLvl);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () =>
                `feature-row ${status.val === "success" ? "feature-row--success" : ""} ${
                    status.val === "error" ? "feature-row--error" : ""
                }`,
        },

        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, `[${order}]`),
            span({ class: "feature-row__name"  }, name)
        ),

        span({ class: "feature-row__badge" }, `LV ${levels?.[page]?.[order] ?? 0} / ${maxLevels?.[page]?.[order] ?? 0}`),

        div(
            { class: "feature-row__controls" },

            NumberInput({
                value:       inputVal,
                oninput:     (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),

            withTooltip(
                button(
                    {
                        class:    () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick:  () => doSet(inputVal.val),
                        disabled: () => status.val === "loading",
                    },
                    () => (status.val === "loading" ? "..." : "SET")
                ),
                "Set StampLevel and StampLevelMAX in game memory"
            ),

            withTooltip(
                button(
                    {
                        class:    "feature-btn feature-btn--danger",
                        onclick:  () => doSet(0),
                        disabled: () => status.val === "loading",
                    },
                    "RELOCK"
                ),
                "Set both StampLevel and StampLevelMAX to 0"
            )
        )
    );
};

// ── StampsTab ─────────────────────────────────────────────────────────────

export const StampsTab = () => {
    const activePage = van.state(0);
    const gameData   = van.state(null);
    const loading    = van.state(false);
    const error      = van.state(null);

    const updateLocal = (page, order, lvl, maxLvl) => {
        const cur = gameData.val;
        if (!cur) return;

        const next = { ...cur };

        if (Array.isArray(cur.levels)) {
            next.levels = cur.levels.map((pg, i) => (i === page && Array.isArray(pg) ? [...pg] : pg));
            if (Array.isArray(next.levels?.[page])) next.levels[page][order] = lvl;
        }

        if (Array.isArray(cur.maxLevels)) {
            next.maxLevels = cur.maxLevels.map((pg, i) => (i === page && Array.isArray(pg) ? [...pg] : pg));
            if (Array.isArray(next.maxLevels?.[page])) next.maxLevels[page][order] = maxLvl ?? lvl;
        }

        gameData.val = next;
    };

    const load = async () => {
        loading.val = true;
        error.val   = null;
        try {
            const data = await readMany({
                levels:    `bEngine.getGameAttribute("StampLevel")`,
                maxLevels: `bEngine.getGameAttribute("StampLevelMAX")`,
                names:     `(function(){
                                var pages = ['A', 'B', 'C'];
                                return pages.map(function(letter) {
                                    var names = [];
                                    for (var i = 1; ; i++) {
                                        var entry = itemDefs['Stamp' + letter + i];
                                        if (!entry) break;
                                        names.push(entry.h.displayName.replace(/_/g, ' '));
                                    }
                                    return names;
                                });
                            })()`,
                steps:     `(function(){
                                var pages = ['A', 'B', 'C'];
                                return pages.map(function(letter) {
                                    var steps = [];
                                    for (var i = 1; ; i++) {
                                        var entry = itemDefs['Stamp' + letter + i];
                                        if (!entry) break;
                                        // desc_line1 CSV: BonusType,op,base,?,STEP,material,...
                                        var parts = (entry.h.desc_line1 || '').split(',');
                                        steps.push(parseInt(parts[4]) || 0);
                                    }
                                    return steps;
                                });
                            })()`,
            });
            gameData.val = data;
        } catch (e) {
            error.val = e.message || "Failed to read stamp data";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div(
        { class: "world-feature scroll-container" },

        div(
            { class: "feature-header" },
            div(
                null,
                h3("STAMPS"),
                p({ class: "feature-header__desc" }, "Writes to StampLevel and StampLevelMAX in game memory")
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read stamp data from game memory"
            )
        ),

        div(
            { class: "feature-page-nav" },
            ...PAGES.map((pg) =>
                button(
                    {
                        class:   () => `feature-page-btn ${activePage.val === pg.id ? "active" : ""}`,
                        onclick: () => (activePage.val = pg.id),
                    },
                    pg.label
                )
            )
        ),

        () => {
            if (loading.val) {
                return div({ class: "feature-list" }, div({ class: "feature-loader" }, Loader({ text: "READING STAMPS" })));
            }

            if (error.val) {
                return div(
                    { class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "STAMP READ FAILED", subtitle: error.val })
                );
            }

            const data = gameData.val;
            if (!data) return div({ class: "feature-list" });

            const page      = activePage.val;
            const names     = data.names?.[page] ?? [];
            const steps     = data.steps?.[page] ?? [];
            const count     = Math.max(names.length, data.levels?.[page]?.length ?? 0);

            if (count === 0) {
                return div(
                    { class: "feature-list" },
                    EmptyState({
                        icon:     Icons.SearchX(),
                        title:    "NO STAMP DATA",
                        subtitle: "Ensure the game is running, then hit REFRESH",
                    })
                );
            }

            return div(
                { class: "feature-list" },
                ...Array.from({ length: count }, (_, order) =>
                    StampRow({
                        page,
                        order,
                        name: names[order] ?? `Stamp ${['A','B','C'][page]}${order + 1}`,
                        step: steps[order] ?? 0,
                        levels:    data.levels,
                        maxLevels: data.maxLevels,
                        onLocalUpdate: updateLocal,
                    })
                )
            );
        }
    );
};
