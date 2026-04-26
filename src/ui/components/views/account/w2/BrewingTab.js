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
import { gga } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar, SetAllNumberControl } from "../BulkActionBar.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { AccountSection } from "../components/AccountSection.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    cleanName,
    readLevelDefinitions,
    runBulkSet,
    sortPrefixedNumericCodes,
    useWriteStatus,
    writeVerified,
} from "../accountShared.js";

const { div, span } = van.tags;

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
    return [...set].sort(sortPrefixedNumericCodes).join(",") + ",";
}

const BubbleRow = ({ bubble, cauldron, levels, prismaSet }) => {
    const levelState = van.state(Number(levels.val?.[bubble.index] ?? 0));
    const prismaBlocked = bubble.isBigBubble === true;
    const isPrisma = van.derive(() => (prismaSet.val ?? new Set()).has(prismaCode(cauldron.prismaKey, bubble.index)));

    van.derive(() => {
        levelState.val = Number(levels.val?.[bubble.index] ?? 0);
    });

    const setLocalLevel = (level) => {
        const nextLevels = [...toIndexedArray(levels.val ?? [])];
        nextLevels[bubble.index] = level;
        levels.val = nextLevels;
    };

    return ClampedLevelRow({
        valueState: levelState,
        max: Infinity,
        write: async (nextLevel) => {
            const path = `CauldronInfo[${cauldron.index}][${bubble.index}]`;
            await writeVerified(path, nextLevel);
            setLocalLevel(nextLevel);
            return nextLevel;
        },
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${bubble.index}`),
            span({ class: "account-row__name" }, bubble.name),
            prismaBlocked ? span({ class: "account-row__sub-label" }, "BIG BUBBLE") : null,
            () => (isPrisma.val ? span({ class: "brewing-prisma-badge" }, "PRISMA") : null),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0}`,
        rowClass: () => `brewing-row${isPrisma.val ? " brewing-row--prisma" : ""}`,
        badgeClass: "brewing-row__badge",
        controlsClass: "brewing-row__controls account-row__controls--xl",
        renderExtraActions: ({ status, run }) =>
            prismaBlocked
                ? null
                : ActionButton({
                      label: () => (isPrisma.val ? "PRISMA ON" : "PRISMA OFF"),
                      status,
                      variant: "apply",
                      className: () => `brewing-prisma-btn${isPrisma.val ? " brewing-prisma-btn--active" : ""}`,
                      tooltip: () => (isPrisma.val ? "Remove Prisma" : "Set Prisma"),
                      onClick: async (e) => {
                          e.preventDefault();
                          await run(async () => {
                              const code = prismaCode(cauldron.prismaKey, bubble.index);
                              const next = new Set(prismaSet.val ?? new Set());
                              const turningOn = !next.has(code);
                              if (turningOn) next.add(code);
                              else next.delete(code);
                              const encoded = encodePrisma(next);
                              await writeVerified("OptionsListAccount[384]", encoded);
                              prismaSet.val = next;
                          });
                      },
                  }),
    });
};

const CauldronSectionBlock = ({ cauldron, levels, defs, sectionBody, setAllInput }) => {
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
            const nextLevels = [...toIndexedArray(levels.val ?? [])];
            await runBulkSet({
                entries: bubblesToSet,
                getTargetValue: () => lvl,
                getValueState: (bubble) => ({ val: currentLevels[bubble.index] ?? 0 }),
                getPath: (bubble) => `CauldronInfo[${cauldron.index}][${bubble.index}]`,
                applyLocal: (bubble) => {
                    nextLevels[bubble.index] = lvl;
                },
            });
            levels.val = nextLevels;
        });
    };

    return AccountSection({
        title: cauldron.label,
        rootClass: `brewing-section brewing-section--${cauldron.id}`,
        meta: ActionButton({
            label: "SET ALL",
            status: bulkStatus,
            tooltip: "Set all bubbles in this cauldron",
            onClick: async (e) => {
                e.preventDefault();
                await doSetAll();
            },
        }),
        body: sectionBody,
    });
};

export const BrewingTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Brewing" });
    const setAllInput = van.state("50000");

    const cauldronLevels = new Map(CAULDRONS.map((c) => [c.id, van.state([])]));
    const bubbleDefs = new Map(CAULDRONS.map((c) => [c.id, van.state([])]));
    const prismaSet = van.state(new Set());
    const sectionsGrid = div({ class: "brewing-sections-grid grid-4col" });
    const contentNode = div({ class: "scrollable-panel" }, sectionsGrid);
    const sectionBodyNodes = new Map();
    const sectionDefinitionSignatures = new Map();
    const sectionNodes = [];

    CAULDRONS.forEach((cauldron) => {
        const sectionBody = div({ class: "brewing-section__rows" });
        sectionBodyNodes.set(cauldron.id, sectionBody);
        sectionNodes.push(
            CauldronSectionBlock({
                cauldron,
                levels: cauldronLevels.get(cauldron.id),
                defs: bubbleDefs.get(cauldron.id),
                sectionBody,
                setAllInput,
            })
        );
    });

    const reconcileCauldronRows = (cauldron) => {
        const defs = bubbleDefs.get(cauldron.id).val ?? [];
        const signature = defs
            .map((bubble) => `${bubble.index}:${bubble.name}:${bubble.isBigBubble ? 1 : 0}`)
            .join("|");
        if (sectionDefinitionSignatures.get(cauldron.id) === signature) return;

        const sectionBody = sectionBodyNodes.get(cauldron.id);
        if (!sectionBody) return;

        sectionDefinitionSignatures.set(cauldron.id, signature);

        sectionBody.replaceChildren(
            ...defs.map((bubble) =>
                BubbleRow({
                    bubble,
                    cauldron,
                    levels: cauldronLevels.get(cauldron.id),
                    prismaSet,
                })
            )
        );
    };

    const reconcileBody = () => {
        CAULDRONS.forEach(reconcileCauldronRows);

        sectionsGrid.replaceChildren(...sectionNodes);
        contentNode.replaceChildren(sectionsGrid);
    };

    const load = async () =>
        run(async () => {
            const [rawPrismaStr, cauldronRows] = await Promise.all([
                gga("OptionsListAccount[384]"),
                readLevelDefinitions({
                    levelsPath: "CauldronInfo",
                    definitionsPath: "AlchemyDescription",
                    mapEntry: ({ definition, rawLevel, index }) => {
                        const cauldron = CAULDRONS.find((entry) => entry.index === index);
                        if (!cauldron) return null;
                        return {
                            id: cauldron.id,
                            levels: toIndexedArray(rawLevel ?? []),
                            defs: definition
                                .map((entry, idx) => {
                                    const entryArr = toIndexedArray(entry ?? []);
                                    const name = cleanName(entryArr[0], "BUBBLE");
                                    const isBigBubble = Number(entryArr[10] ?? 0) === 1;
                                    return { name, index: idx, isBigBubble };
                                })
                                .filter((b) => b.name.toUpperCase() !== "BUBBLE" && b.name.trim() !== ""),
                        };
                    },
                }),
            ]);

            const nextPrismaSet = parsePrisma(rawPrismaStr);
            const nextLevelsById = new Map();
            const nextDefsById = new Map();

            cauldronRows.forEach((cauldron) => {
                nextLevelsById.set(cauldron.id, cauldron.levels);
                nextDefsById.set(cauldron.id, cauldron.defs);
            });

            prismaSet.val = nextPrismaSet;
            CAULDRONS.forEach((c) => {
                cauldronLevels.get(c.id).val = nextLevelsById.get(c.id) ?? [];
                bubbleDefs.get(c.id).val = nextDefsById.get(c.id) ?? [];
            });
            reconcileBody();
        });

    load();

    return PersistentAccountListPage({
        title: "ALCHEMY - BREWING",
        description: "Set bubble levels and toggle Prisma upgrades.",
        wrapActions: false,
        actions: BulkActionBar({
            leading: SetAllNumberControl({
                label: "SET ALL LEVEL:",
                value: setAllInput,
            }),
            refresh: { onClick: load },
        }),
        state: { loading, error },
        loadingText: "READING BREWING",
        errorTitle: "BREWING READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: contentNode,
    });
};
