/**
 * W2 - Brewing Tab (Alchemy Bubbles)
 *
 * Prisma format in OptionsListAccount[384]:
 *   "0"         -> no prisma bubbles
 *   "_0,"       -> orange bubble index 0 is prisma
 *   "_0,_1,a3," -> orange[0], orange[1], green[3] are prisma
 *
 * Big bubble flag:
 *   cList.AlchemyDescription[cauldron][bubble][10]
 *   0 = normal bubble (prisma allowed)
 *   1 = big bubble    (prisma blocked)
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { FeatureTabFrame } from "../components/FeatureTabFrame.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { AsyncFeatureBody, RefreshErrorBanner, useWriteStatus } from "../featureShared.js";

const { div, button, span } = van.tags;

const CAULDRONS = [
    { id: "orange", label: "ORANGE", index: 0, prismaKey: "_" },
    { id: "green", label: "GREEN", index: 1, prismaKey: "a" },
    { id: "purple", label: "PURPLE", index: 2, prismaKey: "b" },
    { id: "yellow", label: "YELLOW", index: 3, prismaKey: "c" },
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
    const inputVal = van.state("0");
    const levelDisplay = van.state(0);
    const { status, run } = useWriteStatus();

    const prismaBlocked = bubble.isBigBubble === true;

    const isPrisma = van.derive(() => (prismaSet.val ?? new Set()).has(prismaCode(cauldron.prismaKey, bubble.index)));

    van.derive(() => {
        inputVal.val = String(levels.val?.[bubble.index] ?? 0);
        levelDisplay.val = levels.val?.[bubble.index] ?? 0;
    });

    const setLocalLevel = (level) => {
        const nextLevels = [...toIndexedArray(levels.val ?? [])];
        nextLevels[bubble.index] = level;
        levels.val = nextLevels;
    };

    const doSet = async (raw) => {
        const lvl = Math.max(0, Number(raw));
        if (isNaN(lvl)) return;

        await run(
            async () => {
                const path = `CauldronInfo[${cauldron.index}][${bubble.index}]`;
                const ok = await gga(path, lvl);
                if (!ok) throw new Error(`Write mismatch at ${path}: expected ${lvl}`);
                return lvl;
            },
            {
                onSuccess: (verified) => {
                    setLocalLevel(verified);
                    inputVal.val = String(verified);
                    levelDisplay.val = verified;
                },
            }
        );
    };

    const doTogglePrisma = async () => {
        if (prismaBlocked) return;

        await run(async () => {
            const code = prismaCode(cauldron.prismaKey, bubble.index);
            const next = new Set(prismaSet.val ?? new Set());
            next.has(code) ? next.delete(code) : next.add(code);
            const encoded = encodePrisma(next);
            const ok = await gga("OptionsListAccount[384]", encoded);
            if (!ok) throw new Error(`Prisma toggle mismatch for ${code}: expected ${next.has(code) ? "on" : "off"}`);
            prismaSet.val = next;
        });
    };

    return div(
        {
            class: () =>
                [
                    "bubble-card",
                    `bubble-card--${cauldron.id}`,
                    isPrisma.val ? "bubble-card--prisma" : "",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div({ class: "bubble-card__top" }, span({ class: "bubble-card__index" }, `#${bubble.index}`), () =>
            isPrisma.val ? span({ class: "bubble-card__prisma-badge" }, "PRISMA") : null
        ),
        div({ class: "bubble-card__name" }, bubble.name),
        div(
            { class: "bubble-card__level-row" },
            span({ class: "bubble-card__level-label" }, "LV"),
            span({ class: "bubble-card__level-val" }, () => levelDisplay.val)
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
                    class: () =>
                        [
                            "feature-btn",
                            "feature-btn--apply",
                            status.val === "loading" ? "feature-btn--loading" : "",
                            status.val === "success" ? "feature-row--success" : "",
                            status.val === "error" ? "feature-row--error" : "",
                        ]
                            .filter(Boolean)
                            .join(" "),
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

const CauldronColumn = ({ cauldron, levels, defs, prismaSet, setAllInput }) => {
    const { status: bulkStatus, run: runBulk } = useWriteStatus();

    const doSetAll = async () => {
        const lvl = Math.max(0, Number(setAllInput.val));
        if (isNaN(lvl)) return;

        const bubbles = defs.val ?? [];
        if (bubbles.length === 0) return;

        const currentLevels = toIndexedArray(levels.val ?? []);
        const bubblesToSet = bubbles.filter((bubble) => Number(currentLevels[bubble.index] ?? 0) !== lvl);
        if (bubblesToSet.length === 0) return;

        await runBulk(async () => {
            for (const bubble of bubblesToSet) {
                const ok = await gga(`CauldronInfo[${cauldron.index}][${bubble.index}]`, lvl);
                if (!ok)
                    throw new Error(
                        `Write mismatch at CauldronInfo[${cauldron.index}][${bubble.index}]: expected ${lvl}`
                    );
                await new Promise((r) => setTimeout(r, 30));
            }
            const nextLevels = [...toIndexedArray(levels.val ?? [])];
            for (const bubble of bubblesToSet) {
                nextLevels[bubble.index] = lvl;
            }
            levels.val = nextLevels;
        });
    };

    return div(
        {
            class: `brewing-column brewing-column--${cauldron.id}`,
        },
        div(
            {
                class: () =>
                    [
                        "brewing-column__header",
                        bulkStatus.val === "success" ? "feature-row--success" : "",
                        bulkStatus.val === "error" ? "feature-row--error" : "",
                    ]
                        .filter(Boolean)
                        .join(" "),
            },
            span({ class: "brewing-column__label" }, cauldron.label),
            button(
                {
                    class: () =>
                        `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => bulkStatus.val === "loading",
                    onclick: doSetAll,
                    title: "Set all bubbles in this cauldron",
                },
                () => (bulkStatus.val === "loading" ? "..." : "SET ALL")
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
    const prismaSet = van.state(new Set());

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        const hadData = data.val !== null;

        try {
            const [rawCauldronLevels, rawPrismaStr, rawAlchemyDesc] = await Promise.all([
                gga("CauldronInfo"),
                gga("OptionsListAccount[384]"),
                readCList("AlchemyDescription"),
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
                        const name = String(entryArr[0] ?? "BUBBLE")
                            .replace(/_/g, " ")
                            .trim();
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
                    })
                )
            ),
    });

    return FeatureTabFrame({
        header: FeatureTabHeader({
            title: "ALCHEMY - BREWING",
            description: "Set bubble levels and toggle Prisma upgrades.",
            actions: [
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
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ],
        }),
        refreshError: renderRefreshErrorBanner,
        body: renderBody,
    });
};
