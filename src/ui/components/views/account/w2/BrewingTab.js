/**
 * W2 - Brewing Tab (Alchemy Bubbles)
 *
 * Prisma format in OptionsListAccount[384]:
 *   "0"         -> no prisma bubbles
 *   "_0,"       -> orange bubble index 0 is prisma
 *   "_0,_1,a3," -> orange[0], orange[1], green[3] are prisma
 *
 * Big bubble flag:
 *   CustomLists.AlchemyDescription[cauldron][bubble][10]
 *   0 = normal bubble (prisma allowed)
 *   1 = big bubble    (prisma blocked)
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AsyncFeatureBody, RefreshErrorBanner, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

const CAULDRONS = [
    { id: "orange", label: "ORANGE", index: 0, prismaKey: "_", color: "#e8841a", dimColor: "rgba(232,132,26,0.12)" },
    { id: "green", label: "GREEN", index: 1, prismaKey: "a", color: "#5cb85c", dimColor: "rgba(92,184,92,0.12)" },
    { id: "purple", label: "PURPLE", index: 2, prismaKey: "b", color: "#a259e6", dimColor: "rgba(162,89,230,0.12)" },
    { id: "yellow", label: "YELLOW", index: 3, prismaKey: "c", color: "#e6c319", dimColor: "rgba(230,195,25,0.12)" },
];

function parsePrisma(str) {
    if (!str || str === "0") return new Set();

    return new Set(
        String(str)
            .split(",")
            .filter((s) => s.length > 1)
            .map((s) => {
                const key = s[0];
                const num = parseInt(s.slice(1), 10);
                return isNaN(num) ? null : key + String(num);
            })
            .filter(Boolean)
    );
}

function prismaCode(key, idx) {
    return key + String(idx);
}

function encodePrisma(set) {
    if (set.size === 0) return "0,";
    return [...set].join(",") + ",";
}

const BubbleCard = ({ bubble, cauldron, levels, prismaSet }) => {
    const inputVal = van.state(String(levels.val?.[bubble.index] ?? 0));
    const { status, run } = useWriteStatus();

    const prismaBlocked = bubble.isBigBubble === true;

    const isPrisma = van.derive(() =>
        (prismaSet.val ?? new Set()).has(prismaCode(cauldron.prismaKey, bubble.index))
    );

    van.derive(() => {
        inputVal.val = String(levels.val?.[bubble.index] ?? 0);
    });

    const setLocalLevel = (level) => {
        const nextLevels = toIndexedArray(levels.val ?? []);
        nextLevels[bubble.index] = level;
        levels.val = nextLevels;
    };

    const doSet = async (raw) => {
        const lvl = Math.max(0, Number(raw));
        if (isNaN(lvl)) return;

        await run(async () => {
            await writeGga(`CauldronInfo[${cauldron.index}][${bubble.index}]`, lvl);
            setLocalLevel(lvl);
            inputVal.val = String(lvl);
        });
    };

    const doTogglePrisma = async () => {
        if (prismaBlocked) return;

        await run(async () => {
            const code = prismaCode(cauldron.prismaKey, bubble.index);
            const next = new Set(prismaSet.val ?? new Set());
            next.has(code) ? next.delete(code) : next.add(code);
            await writeGga("OptionsListAccount[384]", encodePrisma(next));
            prismaSet.val = next;
        });
    };

    return div(
        {
            class: () =>
                [
                    "bubble-card",
                    isPrisma.val ? "bubble-card--prisma" : "",
                    status.val === "success" ? "bubble-card--success" : "",
                    status.val === "error" ? "bubble-card--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
            style: `--cauldron-color: ${cauldron.color}; --cauldron-dim: ${cauldron.dimColor};`,
        },
        div(
            { class: "bubble-card__top" },
            span({ class: "bubble-card__index" }, `#${bubble.index}`),
            () => (isPrisma.val ? span({ class: "bubble-card__prisma-badge" }, "PRISMA") : null)
        ),
        div({ class: "bubble-card__name" }, bubble.name),
        div(
            { class: "bubble-card__level-row" },
            span({ class: "bubble-card__level-label" }, "LV"),
            span({ class: "bubble-card__level-val" }, () => levels.val?.[bubble.index] ?? 0)
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
                    class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => (status.val === "loading" ? "..." : "SET")
            )
        ),
        prismaBlocked
            ? div({ class: "bubble-card__prisma-spacer" }, "\u00A0")
            : button(
                  {
                      class: () =>
                          ["bubble-card__prisma-btn", isPrisma.val ? "bubble-card__prisma-btn--active" : ""]
                              .filter(Boolean)
                              .join(" "),
                      disabled: () => status.val === "loading",
                      onclick: doTogglePrisma,
                      title: () => (isPrisma.val ? "Remove Prisma" : "Set Prisma"),
                  },
                  () => (isPrisma.val ? "Prisma On" : "Prisma Off")
              )
    );
};

const CauldronColumn = ({ cauldron, levels, defs, prismaSet, setAllInput, bulkStatuses }) => {
    const bulkStatus = bulkStatuses.get(cauldron.id);

    const doSetAll = async () => {
        const lvl = Math.max(0, Number(setAllInput.val));
        if (isNaN(lvl)) return;

        const bubbles = defs.val ?? [];
        if (bubbles.length === 0) return;

        bulkStatus.val = "loading";
        try {
            const nextLevels = toIndexedArray(levels.val ?? []);
            for (const bubble of bubbles) {
                await writeGga(`CauldronInfo[${cauldron.index}][${bubble.index}]`, lvl);
                nextLevels[bubble.index] = lvl;
                await new Promise((r) => setTimeout(r, 30));
            }
            levels.val = nextLevels;

            bulkStatus.val = "done";
            setTimeout(() => (bulkStatus.val = null), 1500);
        } catch {
            bulkStatus.val = null;
        }
    };

    return div(
        {
            class: "brewing-column",
            style: `--cauldron-color: ${cauldron.color};`,
        },
        div(
            { class: "brewing-column__header" },
            span({ class: "brewing-column__label" }, cauldron.label),
            button(
                {
                    class: () => `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => bulkStatus.val === "loading",
                    onclick: doSetAll,
                    title: "Set all bubbles in this cauldron",
                },
                () => (bulkStatus.val === "loading" ? "..." : bulkStatus.val === "done" ? "DONE" : "SET ALL")
            )
        ),
        () => {
            const bubbles = defs.val ?? [];
            if (bubbles.length === 0) return div({ class: "brewing-column__empty" }, "No bubbles");

            return div(
                { class: "brewing-column__bubbles" },
                ...bubbles.map((bubble) => BubbleCard({ bubble, cauldron, levels, prismaSet }))
            );
        }
    );
};

export const BrewingTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const data = van.state(null);
    const setAllInput = van.state("50000");

    const cauldronLevels = new Map(CAULDRONS.map((c) => [c.id, van.state([])]));
    const bubbleDefs = new Map(CAULDRONS.map((c) => [c.id, van.state([])]));
    const bulkStatuses = new Map(CAULDRONS.map((c) => [c.id, van.state(null)]));
    const prismaSet = van.state(new Set());

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        const hadData = data.val !== null;

        try {
            const [rawCauldronLevels, rawPrismaStr, rawAlchemyDesc] = await Promise.all([
                readGga("CauldronInfo"),
                readGga("OptionsListAccount[384]"),
                readGga("CustomLists.AlchemyDescription"),
            ]);

            prismaSet.val = parsePrisma(rawPrismaStr);

            const levelsArr = toIndexedArray(rawCauldronLevels ?? []);
            const descArr = toIndexedArray(rawAlchemyDesc ?? []);

            CAULDRONS.forEach((c) => {
                cauldronLevels.get(c.id).val = toIndexedArray(levelsArr[c.index] ?? []);

                const cauldronDesc = toIndexedArray(descArr[c.index] ?? []);
                bubbleDefs.get(c.id).val = cauldronDesc
                    .map((entry, idx) => {
                        const entryArr = toIndexedArray(entry ?? []);
                        const name = String(entryArr[0] ?? "BUBBLE").replace(/_/g, " ").trim();
                        const isBigBubble = Number(entryArr[10] ?? 0) === 1;
                        return { name, index: idx, isBigBubble };
                    })
                    .filter((b) => b.name.toUpperCase() !== "BUBBLE" && b.name.trim() !== "");
            });

            data.val = CAULDRONS;
        } catch (e) {
            const message = e?.message ?? "Failed to load";
            if (!hadData) error.val = message;
            else refreshError.val = message;
        } finally {
            loading.val = false;
        }
    };

    load();
    const renderRefreshErrorBanner = RefreshErrorBanner({ error: refreshError });
    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        renderLoading: () => div({ class: "feature-loader" }, Loader()),
        renderError: (message) => EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: message }),
        isEmpty: () => CAULDRONS.every((cauldron) => (bubbleDefs.get(cauldron.id).val ?? []).length === 0),
        renderEmpty: () =>
            EmptyState({
                icon: Icons.SearchX(),
                title: "NO BUBBLES",
                subtitle: "No brewing bubble definitions found.",
            }),
        renderContent: (cauldrons) =>
            div(
                { class: "brewing-columns grid-4col scrollable-panel" },
                ...cauldrons.map((cauldron) =>
                    CauldronColumn({
                        cauldron,
                        levels: cauldronLevels.get(cauldron.id),
                        defs: bubbleDefs.get(cauldron.id),
                        prismaSet,
                        setAllInput,
                        bulkStatuses,
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
                h3({}, "ALCHEMY - BREWING"),
                p({ class: "feature-header__desc" }, "Set bubble levels and toggle Prisma upgrades.")
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
                        })
                    )
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH")
            )
        ),
        renderRefreshErrorBanner,
        renderBody
    );
};
