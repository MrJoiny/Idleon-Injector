import van from "../../../vendor/van-1.6.0.js";
import { Icons } from "../../../assets/icons.js";
import { gga, readCList, readComputed, readComputedMany, readGgaEntries } from "../../../services/api.js";
import { toIndexedArray } from "../../../utils/index.js";
import { EditableNumberRow } from "./EditableNumberRow.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    joinClasses,
    resolveNumberInput,
    resolveValue,
    runBulkSet,
    toInt,
    toNum,
    unwrapH,
    useWriteStatus,
    writeManyVerified,
    writeVerified,
} from "./accountShared.js";
import { ActionButton } from "./components/ActionButton.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";

const { div, span, select, option, details, summary } = van.tags;

const CARD_PATH = "Cards[0].h";
const CARDIFIER_COUNT_INDEX = 602;
const CARDIFIED_IDS_INDEX = 603;
const TIER_MULTIPLIERS = [1, 3, 5, 16, 459, 14645];
const CARD_REGION_NAMES = [
    "BLUNDER HILLS W1",
    "YUM-YUM DESERT W2",
    "EASY RESOURCES",
    "MEDIUM RESOURCES",
    "FROSTBITE TUNDRA W3",
    "HARD RESOURCES",
    "HYPERION NEBULA W4",
    "SMOULDERIN PLATEAU W5",
    "SPIRITED VALLEY W6",
    "SHIMMERFIN DEEP W7",
    "DUNGEONS",
    "BOSSES AND NIGHTMARES",
    "EVENTS",
];

const toUnwrappedIndexedArray = (value) => toIndexedArray(unwrapH(value));
const tierIndexForAmount = (amount, thresholds) => thresholds.findLastIndex((threshold) => Number(amount) >= threshold);

const hasCsvToken = (rawValue, token) =>
    String(rawValue ?? "")
        .split(",")
        .includes(token);

const nextTierLabel = (amount, thresholds, cardified = false) => {
    if (cardified) return "6-STAR CARDIFIED";
    const nextThreshold = thresholds.find((threshold) => Number(amount) < threshold);
    return nextThreshold === undefined ? "MAX TIER" : `NEXT: ${nextThreshold}`;
};

const tierBadgeClass = (amount, thresholds, cardified = false) => {
    if (cardified) return "card-tier-badge--tier-6";
    const tierIndex = tierIndexForAmount(amount, thresholds);
    return tierIndex < 0 ? "card-tier-badge--base" : `card-tier-badge--tier-${tierIndex + 1}`;
};

const TierBadgeContent = ({ amount, thresholds, cardified = false }) => {
    if (cardified) {
        return span(
            { class: "card-tier-display" },
            Icons.CardTier(6, { class: "card-tier-icon" }),
            "TIER 6 · CARDIFIED"
        );
    }

    const tierIndex = tierIndexForAmount(amount, thresholds);
    if (tierIndex < 0) return span({ class: "card-tier-display" }, "BASE");

    return span(
        { class: "card-tier-display" },
        Icons.CardTier(tierIndex + 1, { class: "card-tier-icon" }),
        `TIER ${tierIndex + 1}`
    );
};

const TierSelect = ({
    label = "SET TIER",
    thresholds = null,
    onSelect,
    status = null,
    disabled = false,
    className = "",
}) => {
    const isDisabled = () => Boolean(resolveValue(disabled)) || resolveValue(status) === "loading";

    return select(
        {
            class: () => {
                const resolvedStatus = resolveValue(status);
                return joinClasses(
                    "select-base card-tier-select",
                    resolveValue(className),
                    resolvedStatus === "loading" ? "card-tier-select--loading" : "",
                    resolvedStatus === "success" ? "card-tier-select--success" : "",
                    resolvedStatus === "error" ? "card-tier-select--error" : ""
                );
            },
            disabled: isDisabled,
            onchange: async (event) => {
                const tierIndex = Number(event.target.value);
                event.target.value = "";
                await onSelect(tierIndex, thresholds?.[tierIndex]);
            },
        },
        option({ value: "", disabled: true, selected: true }, label),
        ...TIER_MULTIPLIERS.map((_, tierIndex) =>
            option({ value: tierIndex }, `TIER ${tierIndex + 1} - ${thresholds ? thresholds[tierIndex] : "PER CARD"}`)
        )
    );
};

const CardRow = ({
    card,
    valueState,
    levelState,
    cardifierCountState,
    cardifiedIdsState,
    writeCardAmount,
    cardifyCard,
    reload,
}) => {
    const { status: cardifyStatus, run: runCardify } = useWriteStatus();
    const isCardified = () => hasCsvToken(cardifiedIdsState.val, card.monsterId);
    const canCardify = () => !isCardified() && levelState.val === 6 && cardifierCountState.val > 0.5;

    return EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveNumberInput(rawValue, { min: 0, fallback: null }),
        write: (nextValue) => writeCardAmount(card, nextValue),
        renderInfo: () =>
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, card.name),
                span(
                    { class: "account-row__sub-label" },
                    () => `${card.monsterId} · ${nextTierLabel(valueState.val, card.thresholds, isCardified())}`
                )
            ),
        renderBadge: (currentValue) =>
            TierBadgeContent({ amount: currentValue, thresholds: card.thresholds, cardified: isCardified() }),
        renderExtraActions: ({ status, applyValue }) => [
            TierSelect({
                thresholds: card.thresholds,
                status,
                disabled: isCardified,
                onSelect: (_, threshold) => applyValue(threshold),
            }),
            ActionButton({
                label: () => (isCardified() ? "CARDIFIED" : "CARDIFY"),
                status: cardifyStatus,
                variant: "max-reset",
                disabled: () => !canCardify(),
                tooltip: "Use one 6-star Cardifier on this eligible card.",
                onClick: async (event) => {
                    event.preventDefault();
                    const result = await runCardify(() => cardifyCard(card));
                    if (!result.ok) await reload();
                },
            }),
        ],
        rowClass: "account-row--wide-controls card-row",
        badgeClass: () =>
            joinClasses("card-tier-badge", tierBadgeClass(valueState.val, card.thresholds, isCardified())),
        controlsClass: "account-row__controls--xl card-row__controls",
        inputProps: { "aria-label": `Card Amount for ${card.name}` },
    });
};

const UnresolvedCardRow = ({ card, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveNumberInput(rawValue, { min: 0, fallback: null }),
        write: (nextValue) => writeVerified(card.path, nextValue),
        renderInfo: () =>
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, card.monsterId),
                span({ class: "account-row__sub-label" }, "CARD DEFINITION OR NAME UNRESOLVED")
            ),
        renderBadge: () => "RAW ONLY",
        rowClass: "account-row--wide-controls card-row card-row--unresolved",
        controlsClass: "account-row__controls--xl card-row__controls",
        inputProps: { "aria-label": `Card Amount for unresolved card ${card.monsterId}` },
    });

const buildCardData = async (rawCards, rawCardStuff) => {
    const accountCards = unwrapH(rawCards) ?? {};
    const accountIds = Object.keys(accountCards);
    const matchedIds = new Set();

    const regions = CARD_REGION_NAMES.map((name, regionIndex) => {
        const cards = toUnwrappedIndexedArray(toUnwrappedIndexedArray(rawCardStuff)[regionIndex])
            .map((rawDefinition) => {
                const definition = toUnwrappedIndexedArray(rawDefinition);
                const monsterId = String(definition[0] ?? "").trim();
                if (!monsterId || monsterId === "Blank" || matchedIds.has(monsterId)) return null;

                matchedIds.add(monsterId);
                const baseRequirement = toInt(definition[2], { min: 0 });
                let amountRequired = 1;
                return {
                    monsterId,
                    baseRequirement,
                    thresholds: TIER_MULTIPLIERS.map((multiplier) => (amountRequired += baseRequirement * multiplier)),
                    amount: toInt(accountCards[monsterId] ?? 0, { min: 0 }),
                    path: `${CARD_PATH}.${monsterId}`,
                };
            })
            .filter(Boolean);

        return { key: `region-${regionIndex}`, index: regionIndex, name, cards };
    });

    const monsterIds = regions.flatMap((region) => region.cards.map((card) => card.monsterId));
    const monsterDefinitions = monsterIds.length
        ? await readGgaEntries("MonsterDefinitionsGET.h", monsterIds, ["Name"])
        : {};
    const unresolved = [];

    regions.forEach((region) => {
        region.cards = region.cards.filter((card) => {
            const name = cleanName(monsterDefinitions[card.monsterId]?.Name, "");
            if (!name) {
                unresolved.push({ monsterId: card.monsterId, amount: card.amount, path: card.path });
                return false;
            }

            card.name = name;
            return true;
        });
    });

    accountIds.forEach((monsterId) => {
        if (matchedIds.has(monsterId)) return;
        unresolved.push({
            monsterId,
            amount: toInt(accountCards[monsterId], { min: 0 }),
            path: `${CARD_PATH}.${monsterId}`,
        });
    });

    return {
        regions,
        unresolved,
        total: regions.reduce((sum, region) => sum + region.cards.length, unresolved.length),
    };
};

const CardSection = ({
    region,
    openState,
    valueStates,
    bulkStatus = null,
    activeBulkRegion = null,
    setRegionTier = null,
    levelStates = null,
    cardifierCountState = null,
    cardifiedIdsState = null,
    writeCardAmount = null,
    cardifyCard = null,
    reload = null,
    unresolved = false,
}) => {
    const status = () => (setRegionTier && activeBulkRegion.val === region.key ? bulkStatus.val : null);
    const Row = unresolved ? UnresolvedCardRow : CardRow;

    return div(
        {
            class: () =>
                joinClasses(
                    "card-region",
                    unresolved ? "card-region--unresolved" : "",
                    status() === "success" ? "card-region--success" : "",
                    status() === "error" ? "card-region--error" : ""
                ),
        },
        details(
            {
                class: "card-region__details",
                open: openState,
                ontoggle: (event) => (openState.val = event.target.open),
            },
            summary(
                { class: "card-region__toggle" },
                Icons.ChevronRight({ class: "card-region__chevron" }),
                span({ class: "card-region__title" }, region.name),
                span({ class: "card-region__count" }, `${region.cards.length} CARDS`)
            ),
            div(
                { class: "card-region__body account-item-stack" },
                ...region.cards.map((card) =>
                    Row({
                        card,
                        valueState: getOrCreateState(valueStates, card.monsterId),
                        levelState: levelStates ? getOrCreateState(levelStates, card.monsterId) : null,
                        cardifierCountState,
                        cardifiedIdsState,
                        writeCardAmount,
                        cardifyCard,
                        reload,
                    })
                )
            )
        ),
        setRegionTier
            ? TierSelect({
                  label: "SET REGION TIER",
                  status,
                  disabled: () =>
                      region.cards.length === 0 ||
                      region.cards.every((card) => hasCsvToken(cardifiedIdsState.val, card.monsterId)),
                  className: "card-region__tier-select",
                  onSelect: (tierIndex) => setRegionTier(region, tierIndex),
              })
            : null
    );
};

export const CardsTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Cards" });
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const totalCards = van.state(0);
    const cardifierCountState = van.state(0);
    const cardifiedIdsState = van.state("");
    const amountStates = new Map();
    const levelStates = new Map();
    const openStates = new Map();
    const activeBulkRegion = van.state(null);
    const regionsNode = div({ class: "cards-regions" });
    const reconcileRegions = createStaticRowReconciler(regionsNode);

    const getOpenState = (key) => getOrCreateState(openStates, key, false);

    const refreshCardLevels = async (cards) => {
        const results = await readComputedMany(
            "runCode",
            "CardLv",
            cards.map((card) => [card.monsterId])
        );
        cards.forEach((card, index) => {
            const result = results[index];
            if (result?.ok) getOrCreateState(levelStates, card.monsterId).val = toInt(result.value, { min: 0 });
        });
    };

    const writeCardAmount = async (card, nextValue) => {
        await writeVerified(card.path, nextValue);
        try {
            const level = await readComputed("runCode", "CardLv", [card.monsterId]);
            getOrCreateState(levelStates, card.monsterId).val = toInt(level, { min: 0 });
        } catch {
            // The amount write already verified; keep the prior level until refresh.
        }
        return nextValue;
    };

    const cardifyCard = async (card) => {
        const [currentAmount, currentOptions, currentLevel, cardsTillNext] = await Promise.all([
            gga(card.path),
            readGgaEntries("OptionsListAccount", [String(CARDIFIER_COUNT_INDEX), String(CARDIFIED_IDS_INDEX)]),
            readComputed("runCode", "CardLv", [card.monsterId]),
            readComputed("runCode", "CardsTillNextLV", [card.monsterId]),
        ]);
        const cardifierCount = toNum(currentOptions[String(CARDIFIER_COUNT_INDEX)], 0);
        const rawCardifiedIds = currentOptions[String(CARDIFIED_IDS_INDEX)] ?? "";
        const amount = toNum(currentAmount, 0);

        if (toInt(currentLevel, { min: 0 }) !== 6) throw new Error("Card is not eligible for a 6-star Cardifier");
        if (cardifierCount <= 0.5) throw new Error("No 6-star Cardifiers are available");
        if (hasCsvToken(rawCardifiedIds, card.monsterId)) throw new Error("Card is already Cardified");

        const nextCount = Math.round(cardifierCount - 1);
        const nextAmount = Math.max(amount, amount + toNum(cardsTillNext, 0) + 2);
        const nextCardifiedIds = `${String(rawCardifiedIds)},${card.monsterId}`;
        await writeManyVerified([
            { path: `OptionsListAccount[${CARDIFIER_COUNT_INDEX}]`, value: nextCount },
            { path: card.path, value: nextAmount },
            { path: `OptionsListAccount[${CARDIFIED_IDS_INDEX}]`, value: nextCardifiedIds },
        ]);

        cardifierCountState.val = nextCount;
        cardifiedIdsState.val = nextCardifiedIds;
        getOrCreateState(amountStates, card.monsterId).val = nextAmount;
        getOrCreateState(levelStates, card.monsterId).val = 7;
    };

    const load = () =>
        runLoad(async () => {
            const [rawCards, rawCardStuff, rawOptions] = await Promise.all([
                gga(CARD_PATH),
                readCList("CardStuff"),
                readGgaEntries("OptionsListAccount", [String(CARDIFIER_COUNT_INDEX), String(CARDIFIED_IDS_INDEX)]),
            ]);
            const data = await buildCardData(rawCards, rawCardStuff);
            const resolvedCards = data.regions.flatMap((region) => region.cards);
            await refreshCardLevels(resolvedCards);
            cardifierCountState.val = toInt(rawOptions[String(CARDIFIER_COUNT_INDEX)], { min: 0 });
            cardifiedIdsState.val = String(rawOptions[String(CARDIFIED_IDS_INDEX)] ?? "");
            const signature = JSON.stringify({
                regions: data.regions.map((region) => ({
                    name: region.name,
                    cards: region.cards.map((card) => [card.monsterId, card.name, card.baseRequirement]),
                })),
                unresolved: data.unresolved.map((card) => card.monsterId),
            });

            reconcileRegions(signature, () => [
                ...data.regions.map((region) =>
                    CardSection({
                        region,
                        openState: getOpenState(region.key),
                        valueStates: amountStates,
                        bulkStatus,
                        activeBulkRegion,
                        setRegionTier,
                        levelStates,
                        cardifierCountState,
                        cardifiedIdsState,
                        writeCardAmount,
                        cardifyCard,
                        reload: load,
                    })
                ),
                ...(data.unresolved.length
                    ? [
                          CardSection({
                              region: {
                                  key: "unresolved",
                                  name: "UNRESOLVED CARDS",
                                  cards: data.unresolved,
                              },
                              openState: getOpenState("unresolved"),
                              valueStates: amountStates,
                              unresolved: true,
                          }),
                      ]
                    : []),
            ]);

            data.regions.forEach((region) => {
                region.cards.forEach((card) => (getOrCreateState(amountStates, card.monsterId).val = card.amount));
            });
            data.unresolved.forEach((card) => (getOrCreateState(amountStates, card.monsterId).val = card.amount));
            totalCards.val = data.total;
        });

    async function setRegionTier(region, tierIndex) {
        if (bulkStatus.val === "loading") return;

        activeBulkRegion.val = region.key;
        const editableCards = region.cards.filter((card) => !hasCsvToken(cardifiedIdsState.val, card.monsterId));
        const result = await runBulk(() =>
            runBulkSet({
                entries: editableCards,
                getTargetValue: (card) => card.thresholds[tierIndex],
                getValueState: (card) => getOrCreateState(amountStates, card.monsterId),
                getPath: (card) => card.path,
            })
        );

        if (!result.ok) {
            getOpenState(region.key).val = true;
            await load();
            return;
        }

        await refreshCardLevels(editableCards);
    }

    load();

    const body = div({ class: "cards-page-content" }, div({ class: "scrollable-panel cards-scroll" }, regionsNode));

    return PersistentAccountListPage({
        title: "CARDS",
        description: () =>
            `${totalCards.val} cards grouped by Card Region. Edit amounts, set exact tier minimums, or use ${cardifierCountState.val} available 6-star Cardifiers.`,
        actions: RefreshButton({
            onRefresh: load,
            tooltip: "Re-read live cards and definitions from the running game.",
            disabled: () => loading.val || bulkStatus.val === "loading",
        }),
        state: { loading, error },
        loadingText: "READING ACCOUNT CARDS",
        errorTitle: "CARD READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
