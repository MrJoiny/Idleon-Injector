/**
 * W1 - Stamps Tab
 *
 * Data sources:
 *   StampLevel[page][order]    -> current stamp level
 *   StampLevelMAX[page][order] -> unlocked max level
 *   Compass[4]                 -> exalted stamp codes
 *
 * Stamp definition lookup:
 *   ItemDefinitionsGET.h.Stamp{A|B|C}{N}.displayName -> stamp name
 *   ItemDefinitionsGET.h.Stamp{A|B|C}{N}.desc_line1  -> step metadata (index 4)
 *
 * Exalted code format in Compass[4]:
 *   "a1"  -> page A, stamp 1
 *   "b7"  -> page B, stamp 7
 *   "c12" -> page C, stamp 12
 *
 * SET behavior:
 *   Writes both StampLevel and StampLevelMAX.
 *   StampLevelMAX is rounded up to the next step boundary.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

const PAGES = [
    { id: 0, label: "COMBAT" },
    { id: 1, label: "SKILLS" },
    { id: 2, label: "MISC" },
];
const PAGE_LETTERS = ["A", "B", "C"];
const EXALTED_CODE_REGEX = /^[a-z]\d+$/;

const normalizeExaltedCodes = (rawCodes) =>
    toIndexedArray(rawCodes)
        .map((code) =>
            String(code ?? "")
                .trim()
                .toLowerCase()
        )
        .filter((code) => EXALTED_CODE_REGEX.test(code));

const makeExaltedStampCode = (page, order) => `${(PAGE_LETTERS[page] ?? "A").toLowerCase()}${order + 1}`;

const sortStampCodes = (a, b) => {
    const letterDelta = a.charCodeAt(0) - b.charCodeAt(0);
    if (letterDelta !== 0) return letterDelta;
    return Number(a.slice(1)) - Number(b.slice(1));
};

const StampRow = ({
    page,
    order,
    name,
    step,
    initialLevel,
    initialMaxLevel,
    exaltedCodes,
    writeExaltedCodes,
    exaltedBusy,
}) => {
    const inputVal = van.state(String(initialLevel ?? 0));
    const { status, run } = useWriteStatus();
    const stampCode = makeExaltedStampCode(page, order);
    const isExalted = van.derive(() => (exaltedCodes.val ?? new Set()).has(stampCode));

    // Local display states, updated on SET without touching parent gameData.
    const levelDisplay = van.state(initialLevel ?? 0);
    const maxLevelDisplay = van.state(initialMaxLevel ?? 0);

    const doSet = async (targetLevel) => {
        const lvl = Math.max(0, Number(targetLevel));
        if (isNaN(lvl)) return;

        // Max level unlocks in steps, round up to the next step boundary.
        const maxLvl = step > 0 && lvl > 0 ? Math.ceil(lvl / step) * step : lvl;

        await run(async () => {
            const levelPath = `StampLevel[${page}][${order}]`;
            const maxPath = `StampLevelMAX[${page}][${order}]`;
            const okLevel = await gga(levelPath, lvl);
            if (!okLevel) throw new Error(`Write mismatch at ${levelPath}`);
            const okMax = await gga(maxPath, maxLvl);
            if (!okMax) throw new Error(`Write mismatch at ${maxPath}`);
            inputVal.val = String(lvl);
            levelDisplay.val = lvl;
            maxLevelDisplay.val = maxLvl;
        });
    };

    const doToggleExalted = async () => {
        if (exaltedBusy.val) return;
        await run(async () => {
            exaltedBusy.val = true;
            try {
                const next = new Set(exaltedCodes.val ?? new Set());
                next.has(stampCode) ? next.delete(stampCode) : next.add(stampCode);
                await writeExaltedCodes(next);
                exaltedCodes.val = next;
            } finally {
                exaltedBusy.val = false;
            }
        });
    };

    return div(
        {
            class: () =>
                `feature-row stamp-row ${isExalted.val ? "stamp-row--exalted" : ""} ${
                    status.val === "success" ? "feature-row--success" : ""
                } ${status.val === "error" ? "feature-row--error" : ""}`,
        },

        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, `[${order}]`),
            span({ class: "feature-row__name" }, name)
        ),

        span({ class: "feature-row__badge" }, () => `LV ${levelDisplay.val} / ${maxLevelDisplay.val}`),

        div(
            { class: "feature-row__controls stamp-row__controls" },

            NumberInput({
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),

            withTooltip(
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick: () => doSet(inputVal.val),
                        disabled: () => status.val === "loading",
                    },
                    () => (status.val === "loading" ? "..." : "SET")
                ),
                "Set StampLevel and StampLevelMAX in game memory"
            ),

            withTooltip(
                button(
                    {
                        class: () =>
                            `feature-btn stamp-exalted-btn ${isExalted.val ? "stamp-exalted-btn--active" : ""} ${
                                status.val === "loading" ? "feature-btn--loading" : ""
                            }`,
                        onclick: doToggleExalted,
                        disabled: () => status.val === "loading" || exaltedBusy.val,
                    },
                    () => (isExalted.val ? "EXALTED ON" : "EXALTED OFF")
                ),
                `Toggle exalted stamp (${stampCode}) in gga.Compass[4]`
            ),

            withTooltip(
                button(
                    {
                        class: "feature-btn feature-btn--danger",
                        onclick: () => doSet(0),
                        disabled: () => status.val === "loading",
                    },
                    "RELOCK"
                ),
                "Set both StampLevel and StampLevelMAX to 0"
            )
        )
    );
};

export const StampsTab = () => {
    const activePage = van.state(0);
    const gameData = van.state(null);
    const loading = van.state(false);
    const error = van.state(null);
    const exaltedCodes = van.state(new Set());
    const exaltedBusy = van.state(false);

    const writeExaltedCodes = async (codeSet) => {
        const ordered = [...(codeSet ?? new Set())]
            .map((code) =>
                String(code ?? "")
                    .trim()
                    .toLowerCase()
            )
            .filter((code) => EXALTED_CODE_REGEX.test(code))
            .sort(sortStampCodes);

        for (let i = 0; i < ordered.length; i++) {
            const ok = await gga(`Compass[4][${i}]`, ordered[i]);
            if (!ok) throw new Error(`Write mismatch at Compass[4][${i}]`);
        }
        const okLength = await gga("Compass[4].length", ordered.length);
        if (!okLength) throw new Error("Write mismatch at Compass[4].length");
    };

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const [levels, maxLevels, rawExaltedCodes] = await Promise.all([
                gga("StampLevel"),
                gga("StampLevelMAX"),
                gga("Compass[4]"),
            ]);

            const levelsByPage = toIndexedArray(levels ?? []);
            const maxLevelsByPage = toIndexedArray(maxLevels ?? []);

            const pages = PAGE_LETTERS;
            const pageCounts = pages.map((_, page) =>
                Math.max(
                    toIndexedArray(levelsByPage[page] ?? []).length,
                    toIndexedArray(maxLevelsByPage[page] ?? []).length
                )
            );
            const stampKeys = pages.flatMap((letter, page) =>
                Array.from({ length: pageCounts[page] }, (_, i) => `Stamp${letter}${i + 1}`)
            );

            const rawItemDefs = stampKeys.length
                ? await readGgaEntries("ItemDefinitionsGET.h", stampKeys, ["displayName", "desc_line1"])
                : {};

            const names = pages.map((letter, page) => {
                const result = [];
                const count = pageCounts[page] ?? 0;
                for (let i = 1; i <= count; i++) {
                    const entry = rawItemDefs?.[`Stamp${letter}${i}`];
                    result.push((entry?.displayName ?? `Stamp ${letter}${i}`).replace(/_/g, " "));
                }
                return result;
            });

            const steps = pages.map((letter, page) => {
                const result = [];
                const count = pageCounts[page] ?? 0;
                for (let i = 1; i <= count; i++) {
                    const entry = rawItemDefs?.[`Stamp${letter}${i}`];
                    const parts = (entry?.desc_line1 || "").split(",");
                    result.push(parseInt(parts[4], 10) || 0);
                }
                return result;
            });

            exaltedCodes.val = new Set(normalizeExaltedCodes(rawExaltedCodes));
            gameData.val = { levels: levelsByPage, maxLevels: maxLevelsByPage, names, steps };
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
                p({ class: "feature-header__desc" }, "Change stamp levels and toggle exalted stamps")
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
                        class: () => `feature-page-btn ${activePage.val === pg.id ? "active" : ""}`,
                        onclick: () => (activePage.val = pg.id),
                    },
                    pg.label
                )
            )
        ),

        () => {
            if (loading.val) {
                return div(
                    { class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING STAMPS" }))
                );
            }

            if (error.val) {
                return div(
                    { class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "STAMP READ FAILED", subtitle: error.val })
                );
            }

            const data = gameData.val;
            if (!data) return div({ class: "feature-list" });

            const page = activePage.val;
            const names = data.names?.[page] ?? [];
            const steps = data.steps?.[page] ?? [];
            const count = Math.max(names.length, data.levels?.[page]?.length ?? 0, data.maxLevels?.[page]?.length ?? 0);

            if (count === 0) {
                return div(
                    { class: "feature-list" },
                    EmptyState({
                        icon: Icons.SearchX(),
                        title: "NO STAMP DATA",
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
                        name: names[order] ?? `Stamp ${PAGE_LETTERS[page]}${order + 1}`,
                        step: steps[order] ?? 0,
                        initialLevel: data.levels?.[page]?.[order] ?? 0,
                        initialMaxLevel: data.maxLevels?.[page]?.[order] ?? 0,
                        exaltedCodes,
                        writeExaltedCodes,
                        exaltedBusy,
                    })
                )
            );
        }
    );
};
