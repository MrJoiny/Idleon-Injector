/**
 * W2 — Brewing Tab (Alchemy Bubbles)
 *
 * Prisma format in OptionsListAccount[384]:
 *   "0"          → no prisma bubbles
 *   "_0,"        → orange bubble index 0 is prisma
 *   "_0,_1,a3,"  → orange[0], orange[1], green[3] are prisma
 *
 *   Codes: _=orange, a=green, b=purple, c=yellow  +  index (no padding)
 *   Always has a trailing comma when non-empty.
 *
 * Bubbles named "BUBBLE" after formatting are placeholders — filtered out.
 *
 * Big bubble flag (N.js source-of-truth):
 *   CustomLists.AlchemyDescription[cauldron][bubble][10]
 *     0 = normal bubble  →  Prisma-eligible
 *     1 = big bubble     →  Prisma NOT allowed
 *
 *   The game's click gate (around N.js line 113520) requires this field to be 0
 *   before it will accept a Prisma toggle. We mirror that restriction here so the
 *   UI never writes an impossible Prisma code for a big bubble.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";

const { div, button, span, h3, p } = van.tags;

// ── Cauldron definitions ───────────────────────────────────────────────────

const CAULDRONS = [
    { id: "orange", label: "ORANGE", index: 0, prismaKey: "_", color: "#e8841a", dimColor: "rgba(232,132,26,0.12)" },
    { id: "green", label: "GREEN", index: 1, prismaKey: "a", color: "#5cb85c", dimColor: "rgba(92,184,92,0.12)" },
    { id: "purple", label: "PURPLE", index: 2, prismaKey: "b", color: "#a259e6", dimColor: "rgba(162,89,230,0.12)" },
    { id: "yellow", label: "YELLOW", index: 3, prismaKey: "c", color: "#e6c319", dimColor: "rgba(230,195,25,0.12)" },
];

// ── Prisma helpers ─────────────────────────────────────────────────────────

/**
 * Parse prisma string → normalized Set of codes (no zero-padding).
 *   "0"            → empty Set
 *   "0,_01,_02,"   → Set{"_1","_2"}  (normalizes old zero-padded codes)
 *   "0,_0,a3,"     → Set{"_0","a3"}
 * Skips the leading "0" token and any empty tokens.
 */
function parsePrisma(str) {
    if (!str || str === "0") return new Set();
    return new Set(
        str.split(",")
            .filter((s) => s.length > 1)          // skip "0" and empty strings
            .map((s) => {
                const key = s[0];                  // cauldron letter: _ a b c
                const num = parseInt(s.slice(1), 10); // strip leading zeros via parseInt
                return isNaN(num) ? null : key + String(num);
            })
            .filter(Boolean)
    );
}

/** "_" + index with no zero-padding: e.g. prismaCode("_", 0) → "_0" */
function prismaCode(key, idx) {
    return key + String(idx);
}

/** Set → "0," when empty and join prisma bubbles together with , at the end (Lava?)*/
function encodePrisma(set) {
    if (set.size === 0) return "0,";
    return [...set].join(",") + ",";
}

// ── BubbleCard ────────────────────────────────────────────────────────────

const BubbleCard = ({ bubble, cauldron, levels, prismaSet, onReload }) => {
    const inputVal = van.state(String(levels.val?.[bubble.index] ?? 0));
    const status = van.state(null); // null | "loading" | "success" | "error"

    // Big bubbles are not Prisma-eligible — mirrors N.js click gate:
    //   AlchemyDescription[cauldron][bubble][10] must be 0 to allow Prisma.
    const prismaBlocked = bubble.isBigBubble === true;

    const isPrisma = van.derive(() =>
        (prismaSet.val ?? new Set()).has(prismaCode(cauldron.prismaKey, bubble.index))
    );

    // Keep input synced when levels reload
    van.derive(() => {
        inputVal.val = String(levels.val?.[bubble.index] ?? 0);
    });

    const doSet = async (raw) => {
        const lvl = Math.max(0, Number(raw));
        if (isNaN(lvl)) return;
        status.val = "loading";
        try {
            await writeGga(`CauldronInfo[${cauldron.index}][${bubble.index}]`, lvl);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
            await onReload?.();
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    const doTogglePrisma = async () => {
        if (prismaBlocked) return; // big bubbles cannot be Prisma'd
        status.val = "loading";
        try {
            const code = prismaCode(cauldron.prismaKey, bubble.index);
            const next = new Set(prismaSet.val ?? new Set());
            next.has(code) ? next.delete(code) : next.add(code);
            await writeGga("OptionsListAccount[384]", encodePrisma(next));
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
                "bubble-card",
                isPrisma.val ? "bubble-card--prisma" : "",
                status.val === "success" ? "bubble-card--success" : "",
                status.val === "error" ? "bubble-card--error" : "",
            ].filter(Boolean).join(" "),
            style: `--cauldron-color: ${cauldron.color}; --cauldron-dim: ${cauldron.dimColor};`,
        },

        div(
            { class: "bubble-card__top" },
            span({ class: "bubble-card__index" }, `#${bubble.index}`),
            () => isPrisma.val ? span({ class: "bubble-card__prisma-badge" }, "✦ PRISMA") : null,
        ),

        div({ class: "bubble-card__name" }, bubble.name),

        div(
            { class: "bubble-card__level-row" },
            span({ class: "bubble-card__level-label" }, "LV"),
            span({ class: "bubble-card__level-val" }, () => levels.val?.[bubble.index] ?? 0),
        ),

        div(
            { class: "bubble-card__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            button(
                {
                    class: () => `feature-btn feature-btn--apply bubble-card__set-btn ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => status.val === "loading" ? "…" : "SET"
            ),
        ),

        prismaBlocked ? div({ class: "bubble-card__prisma-spacer" }, "\u00A0") : button(
            {
                class: () => [
                    "bubble-card__prisma-btn",
                    isPrisma.val ? "bubble-card__prisma-btn--active" : "",
                ].filter(Boolean).join(" "),
                disabled: () => status.val === "loading",
                onclick: doTogglePrisma,
                title: () => isPrisma.val ? "Remove Prisma" : "Set Prisma",
            },
            () => isPrisma.val ? "✦ Prisma On" : "◇ Prisma Off"
        ),
    );
};

// ── CauldronColumn ────────────────────────────────────────────────────────

const CauldronColumn = ({ cauldron, levels, defs, prismaSet, onReload, setAllInput, bulkStatuses }) => {
    const bulkStatus = bulkStatuses.get(cauldron.id);

    const doSetAll = async () => {
        const lvl = Math.max(0, Number(setAllInput.val));
        if (isNaN(lvl)) return;
        const bubbles = defs.val ?? [];
        if (bubbles.length === 0) return;

        bulkStatus.val = "loading";
        try {
            for (const bubble of bubbles) {
                await writeGga(`CauldronInfo[${cauldron.index}][${bubble.index}]`, lvl);
                await new Promise((r) => setTimeout(r, 30));
            }
            bulkStatus.val = "done";
            setTimeout(() => (bulkStatus.val = null), 1500);
            await onReload?.();
        } catch {
            bulkStatus.val = null;
        }
    };

    return div(
        {
            class: "brewing-column",
            style: `--cauldron-color: ${cauldron.color};`,
        },

        // Column header
        div(
            { class: "brewing-column__header" },
            span({ class: "brewing-column__label" }, cauldron.label),
            button(
                {
                    class: () => `feature-btn feature-btn--apply brewing-column__setall-btn ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => bulkStatus.val === "loading",
                    onclick: doSetAll,
                    title: "Set all bubbles in this cauldron",
                },
                () => bulkStatus.val === "loading" ? "…" :
                    bulkStatus.val === "done" ? "✓" : "SET ALL"
            ),
        ),

        // Bubble list
        () => {
            const bubbles = defs.val ?? [];
            if (bubbles.length === 0) return div({ class: "brewing-column__empty" }, "No bubbles");

            return div(
                { class: "brewing-column__bubbles" },
                ...bubbles.map((bubble) =>
                    BubbleCard({ bubble, cauldron, levels, prismaSet, onReload })
                )
            );
        }
    );
};

// ── BrewingTab ────────────────────────────────────────────────────────────

export const BrewingTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const setAllInput = van.state("50000");

    const cauldronLevels = new Map(CAULDRONS.map((c) => [c.id, van.state(null)]));
    const bubbleDefs = new Map(CAULDRONS.map((c) => [c.id, van.state([])]));
    const bulkStatuses = new Map(CAULDRONS.map((c) => [c.id, van.state(null)]));
    const prismaSet = van.state(new Set());

    const toArr = (raw) => Array.isArray(raw)
        ? raw
        : Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const [rawCauldronLevels, rawPrismaStr, rawAlchemyDesc] = await Promise.all([
                readGga("CauldronInfo"),
                readGga("OptionsListAccount[384]"),
                readGga("CustomLists.AlchemyDescription"),
            ]);

            prismaSet.val = parsePrisma(rawPrismaStr);

            const descArr = toArr(rawAlchemyDesc ?? []);

            CAULDRONS.forEach((c) => {
                cauldronLevels.get(c.id).val = rawCauldronLevels?.[c.index] ?? [];

                const cauldronDesc = toArr(descArr[c.index] ?? []);
                bubbleDefs.get(c.id).val = cauldronDesc
                    .map((entry, idx) => {
                        // Use toArr so both array and object-keyed entries are handled.
                        const entryArr = toArr(entry ?? []);
                        const name = String(entryArr[0] ?? "BUBBLE").replace(/_/g, " ").trim();
                        // Index 10 is the big-bubble flag (N.js AlchemyDescription layout).
                        // 0 = normal bubble, 1 = big bubble (Prisma-ineligible).
                        const isBigBubble = Number(entryArr[10] ?? 0) === 1;
                        return { name, index: idx, isBigBubble };
                    })
                    .filter((b) => b.name.toUpperCase() !== "BUBBLE" && b.name.trim() !== "");
            });
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div(
        { class: "brewing-tab tab-container" },

        // Header
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "ALCHEMY — BREWING"),
                p({ class: "feature-header__desc" }, "Set bubble levels and toggle Prisma upgrades."),
            ),
            div(
                { class: "feature-header__actions" },
                div(
                    { class: "brewing-setall-row" },
                    span({ class: "brewing-setall-label" }, "SET ALL LEVEL:"),
                    div(
                        { class: "brewing-setall-input-wrap" },
                        NumberInput({
                            mode: "int",
                            value: setAllInput,
                            oninput: (e) => (setAllInput.val = e.target.value),
                            onDecrement: () => (setAllInput.val = String(Math.max(0, Number(setAllInput.val) - 1))),
                            onIncrement: () => (setAllInput.val = String(Number(setAllInput.val) + 1)),
                        }),
                    ),
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ),
        ),

        // 4-column layout
        () => {
            if (loading.val) return div({ class: "feature-loader" }, Loader());
            if (error.val) return EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", desc: error.val });

            return div(
                { class: "brewing-columns grid-4col scrollable-panel" },
                ...CAULDRONS.map((c) =>
                    CauldronColumn({
                        cauldron: c,
                        levels: cauldronLevels.get(c.id),
                        defs: bubbleDefs.get(c.id),
                        prismaSet,
                        onReload: load,
                        setAllInput,
                        bulkStatuses,
                    })
                )
            );
        }
    );
};
