import van from "../../../vendor/van-1.6.0.js";
import { Icons } from "../../../assets/icons.js";
import { gga, readCList, readGgaEntries } from "../../../services/api.js";
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
    unwrapH,
    useWriteStatus,
    writeVerified,
} from "./accountShared.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { ActionButton } from "./components/ActionButton.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";

const { div, span, select, option, details, summary, h3, p } = van.tags;

const CARD_PATH = "Cards[0].h";
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
const tierIndexForAmount = (amount, thresholds) =>
    thresholds.findLastIndex((threshold) => Number(amount) >= threshold);

const nextTierLabel = (amount, thresholds) => {
    const nextThreshold = thresholds.find((threshold) => Number(amount) < threshold);
    return nextThreshold === undefined ? "MAX TIER" : `NEXT: ${nextThreshold}`;
};

const tierBadgeClass = (amount, thresholds) => {
    const tierIndex = tierIndexForAmount(amount, thresholds);
    return tierIndex < 0 ? "card-tier-badge--base" : `card-tier-badge--tier-${tierIndex + 1}`;
};

const TierBadgeContent = ({ amount, thresholds }) => {
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
            option(
                { value: tierIndex },
                `TIER ${tierIndex + 1} - ${thresholds ? thresholds[tierIndex] : "PER CARD"}`
            )
        )
    );
};

const CardRow = ({ card, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveNumberInput(rawValue, { min: 0, fallback: null }),
        write: (nextValue) => writeVerified(card.path, nextValue),
        renderInfo: () =>
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, card.name),
                span(
                    { class: "account-row__sub-label" },
                    () => `${card.monsterId} · ${nextTierLabel(valueState.val, card.thresholds)}`
                )
            ),
        renderBadge: (currentValue) => TierBadgeContent({ amount: currentValue, thresholds: card.thresholds }),
        renderExtraActions: ({ status, applyValue }) =>
            TierSelect({
                thresholds: card.thresholds,
                status,
                onSelect: (_, threshold) => applyValue(threshold),
            }),
        rowClass: "account-row--wide-controls card-row",
        badgeClass: () => joinClasses("card-tier-badge", tierBadgeClass(valueState.val, card.thresholds)),
        controlsClass: "account-row__controls--xl card-row__controls",
        inputProps: { "aria-label": `Card Amount for ${card.name}` },
    });

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
    const accountIdSet = new Set(accountIds);
    const matchedIds = new Set();

    const regions = CARD_REGION_NAMES.map((name, regionIndex) => {
        const cards = toUnwrappedIndexedArray(toUnwrappedIndexedArray(rawCardStuff)[regionIndex])
            .map((rawDefinition) => {
                const definition = toUnwrappedIndexedArray(rawDefinition);
                const monsterId = String(definition[0] ?? "").trim();
                if (!monsterId || !accountIdSet.has(monsterId) || matchedIds.has(monsterId)) return null;

                matchedIds.add(monsterId);
                const baseRequirement = toInt(definition[2], { min: 0 });
                let amountRequired = 1;
                return {
                    monsterId,
                    baseRequirement,
                    thresholds: TIER_MULTIPLIERS.map((multiplier) => (amountRequired += baseRequirement * multiplier)),
                    amount: toInt(accountCards[monsterId], { min: 0 }),
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

    return { regions, unresolved, total: accountIds.length };
};

const CardSection = ({
    region,
    openState,
    valueStates,
    bulkStatus = null,
    activeBulkRegion = null,
    requestBulkWrite = null,
    unresolved = false,
}) => {
    const status = () => (requestBulkWrite && activeBulkRegion.val === region.key ? bulkStatus.val : null);
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
                    Row({ card, valueState: getOrCreateState(valueStates, card.monsterId) })
                )
            )
        ),
        requestBulkWrite
            ? TierSelect({
                label: "SET REGION TIER",
                status,
                disabled: () => region.cards.length === 0,
                className: "card-region__tier-select",
                onSelect: (tierIndex) => requestBulkWrite(region, tierIndex),
            })
            : null
    );
};

const BulkConfirmationModal = ({ pending, status, onCancel, onConfirm }) =>
    div(
        {
            class: () => joinClasses("modal cards-bulk-modal", !pending.val ? "is-hidden" : ""),
            onclick: () => {
                if (status.val !== "loading") onCancel();
            },
        },
        div(
            { class: "modal-box cards-bulk-modal__box", onclick: (event) => event.stopPropagation() },
            div(
                { class: "modal-header" },
                h3(() => (pending.val ? `SET ${pending.val.region.name} TO TIER ${pending.val.tierIndex + 1}?` : ""))
            ),
            div(
                { class: "modal-body cards-bulk-modal__body" },
                p(() => {
                    if (!pending.val) return "";
                    return `${pending.val.affectedCount} of ${pending.val.region.cards.length} Account Cards will change.`;
                }),
                p("Each card will be set to its own minimum Card Amount for the selected tier.")
            ),
            div(
                { class: "modal-footer" },
                ActionButton({
                    label: "CANCEL",
                    variant: "max-reset",
                    disabled: () => status.val === "loading",
                    onClick: onCancel,
                }),
                ActionButton({
                    label: () => (pending.val ? `SET TIER ${pending.val.tierIndex + 1}` : "SET TIER"),
                    status,
                    disabled: () => !pending.val || pending.val.affectedCount === 0,
                    onClick: onConfirm,
                })
            )
        )
    );

export const CardsTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Cards" });
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const totalCards = van.state(0);
    const amountStates = new Map();
    const openStates = new Map();
    const activeBulkRegion = van.state(null);
    const pendingBulk = van.state(null);
    const regionsNode = div({ class: "cards-regions" });
    const reconcileRegions = createStaticRowReconciler(regionsNode);

    const getOpenState = (key) => getOrCreateState(openStates, key, false);

    const requestBulkWrite = (region, tierIndex) => {
        const affectedCount = region.cards.filter(
            (card) => getOrCreateState(amountStates, card.monsterId).val !== card.thresholds[tierIndex]
        ).length;
        pendingBulk.val = { region, tierIndex, affectedCount };
    };

    const load = () =>
        runLoad(async () => {
            const [rawCards, rawCardStuff] = await Promise.all([gga(CARD_PATH), readCList("CardStuff")]);
            const data = await buildCardData(rawCards, rawCardStuff);
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
                        requestBulkWrite,
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

    const confirmBulkWrite = async () => {
        const pending = pendingBulk.val;
        if (!pending || bulkStatus.val === "loading") return;

        activeBulkRegion.val = pending.region.key;
        const result = await runBulk(() =>
            runBulkSet({
                entries: pending.region.cards,
                getTargetValue: (card) => card.thresholds[pending.tierIndex],
                getValueState: (card) => getOrCreateState(amountStates, card.monsterId),
                getPath: (card) => card.path,
            })
        );

        pendingBulk.val = null;
        if (!result.ok) {
            getOpenState(pending.region.key).val = true;
            await load();
        }
    };

    load();

    const body = div(
        { class: "cards-page-content" },
        div({ class: "scrollable-panel cards-scroll" }, regionsNode),
        BulkConfirmationModal({
            pending: pendingBulk,
            status: bulkStatus,
            onCancel: () => {
                if (bulkStatus.val !== "loading") pendingBulk.val = null;
            },
            onConfirm: (event) => {
                event.preventDefault();
                void confirmBulkWrite();
            },
        })
    );

    return PersistentAccountListPage({
        title: "CARDS",
        description: () =>
            `${totalCards.val} Account Cards grouped by Card Region. Edit amounts or set exact tier minimums.`,
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
