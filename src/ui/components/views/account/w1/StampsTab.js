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
import { gga, ggaMany, readGgaEntries } from "../../../../services/api.js";
import { withTooltip } from "../../../Tooltip.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { cleanName, writeVerified } from "../accountShared.js";
import { renderTabNav } from "../tabShared.js";

const { div, span } = van.tags;

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

const makeExaltedStampCode = (page, order) => `${PAGE_LETTERS[page].toLowerCase()}${order + 1}`;

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
    const stampCode = makeExaltedStampCode(page, order);
    const isExalted = van.derive(() => exaltedCodes.val.has(stampCode));
    const levelState = van.state(initialLevel);
    const maxLevelDisplay = van.state(initialMaxLevel);

    return EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) => {
            const lvl = Math.max(0, Number(rawValue));
            return Number.isNaN(lvl) ? null : lvl;
        },
        write: async (nextLevel) => {
            const maxLevel = step > 0 && nextLevel > 0 ? Math.ceil(nextLevel / step) * step : nextLevel;
            const levelPath = `StampLevel[${page}][${order}]`;
            const maxPath = `StampLevelMAX[${page}][${order}]`;

            await writeVerified(levelPath, nextLevel);
            await writeVerified(maxPath, maxLevel);
            maxLevelDisplay.val = maxLevel;

            return nextLevel;
        },
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${order}`),
            span({ class: "account-row__name" }, name),
        ],
        renderBadge: (currentValue) => `LV ${currentValue} / ${maxLevelDisplay.val}`,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const next = Number.isFinite(base) ? base : Number(currentValue);
            return Math.max(0, next + delta);
        },
        rowClass: () => (isExalted.val ? "stamp-row--exalted" : ""),
        wrapApplyButton: (applyButton) => withTooltip(applyButton, "Set StampLevel and StampLevelMAX in game memory"),
        renderExtraActions: ({ status, run, applyValue }) => [
            ActionButton({
                label: () => (isExalted.val ? "EXALTED ON" : "EXALTED OFF"),
                status,
                variant: "account-btn",
                className: () => `stamp-exalted-btn ${isExalted.val ? "stamp-exalted-btn--active" : ""}`.trim(),
                tooltip: `Toggle exalted stamp (${stampCode}) in gga.Compass[4]`,
                disabled: () => exaltedBusy.val,
                onClick: async (e) => {
                    e.preventDefault();
                    if (exaltedBusy.val) return;

                    await run(async () => {
                        exaltedBusy.val = true;
                        try {
                            const next = new Set(exaltedCodes.val);
                            next.has(stampCode) ? next.delete(stampCode) : next.add(stampCode);
                            await writeExaltedCodes(next);
                            exaltedCodes.val = next;
                        } finally {
                            exaltedBusy.val = false;
                        }
                    });
                },
            }),
            ActionButton({
                label: "RELOCK",
                status,
                variant: "danger",
                tooltip: "Set both StampLevel and StampLevelMAX to 0",
                onClick: (e) => {
                    e.preventDefault();
                    applyValue(0);
                },
            }),
        ],
    });
};

export const StampsTab = () => {
    const activePage = van.state(0);
    const gameData = van.state(null);
    const { loading, error, run } = useAccountLoad({ label: "Stamps" });
    const exaltedCodes = van.state(new Set());
    const exaltedBusy = van.state(false);

    const writeExaltedCodes = async (codeSet) => {
        const ordered = normalizeExaltedCodes(codeSet).sort(sortStampCodes);
        const currentOrdered = normalizeExaltedCodes(exaltedCodes.val).sort(sortStampCodes);
        const writes = [];

        for (let i = 0; i < ordered.length; i++) {
            if (ordered[i] === currentOrdered[i]) continue;
            writes.push({ path: `Compass[4][${i}]`, value: ordered[i] });
        }
        if (currentOrdered.length !== ordered.length) {
            writes.push({ path: "Compass[4].length", value: ordered.length });
        }
        if (writes.length === 0) return;

        const result = await ggaMany(writes);
        const failed = result.results.filter((entry) => !entry.ok);
        if (failed.length > 0) {
            throw new Error(`Write mismatch at ${failed[0].path}`);
        }
    };

    const load = async () =>
        run(async () => {
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
                const count = pageCounts[page];
                for (let i = 1; i <= count; i++) {
                    const entry = rawItemDefs?.[`Stamp${letter}${i}`];
                    result.push(cleanName(entry?.displayName, `Stamp ${letter}${i}`));
                }
                return result;
            });

            const steps = pages.map((letter, page) => {
                const result = [];
                const count = pageCounts[page];
                for (let i = 1; i <= count; i++) {
                    const entry = rawItemDefs?.[`Stamp${letter}${i}`];
                    const parts = (entry?.desc_line1 || "").split(",");
                    result.push(parseInt(parts[4], 10) || 0);
                }
                return result;
            });

            exaltedCodes.val = new Set(normalizeExaltedCodes(rawExaltedCodes));
            gameData.val = { levels: levelsByPage, maxLevels: maxLevelsByPage, names, steps };
        });

    load();

    const renderBody = (resolved) => {
        const page = activePage.val;
        const names = resolved.names?.[page] ?? [];
        const steps = resolved.steps?.[page] ?? [];
        const count = Math.max(
            names.length,
            resolved.levels?.[page]?.length ?? 0,
            resolved.maxLevels?.[page]?.length ?? 0
        );

        return div(
            { class: "account-list" },
            ...Array.from({ length: count }, (_, order) =>
                StampRow({
                    page,
                    order,
                    name: names[order] ?? ("Stamp " + PAGE_LETTERS[page] + (order + 1)),
                    step: steps[order] ?? 0,
                    initialLevel: resolved.levels?.[page]?.[order] ?? 0,
                    initialMaxLevel: resolved.maxLevels?.[page]?.[order] ?? 0,
                    exaltedCodes,
                    writeExaltedCodes,
                    exaltedBusy,
                })
            )
        );
    };

    return AccountPageShell({
        rootClass: "tab-container scroll-container",
        header: AccountTabHeader({
            title: "STAMPS",
            description: "Change stamp levels and toggle exalted stamps",
            actions: RefreshButton({
                onRefresh: load,
                tooltip: "Re-read stamp data from game memory",
            }),
        }),
        subNav: renderTabNav({
            tabs: PAGES,
            activeId: activePage,
            navClass: "account-page-nav",
            buttonClass: "account-page-btn",
        }),
        loadState: { loading, error, data: gameData },
        renderBody,
    });
};


