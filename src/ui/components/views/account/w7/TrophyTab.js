import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { AsyncFeatureBody, useWriteStatus } from "../featureShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div, button, span, h3, p, select, option } = van.tags;

const TROPHY_SLOTS_PATH = "Spelunk[16]";
const ITEM_DEFS_PATH = "ItemDefinitionsGET.h";
const TROPHY_KEY_PATTERN = /^Trophy(\d+)$/;

const getDef = (raw) => raw?.h ?? raw;

const getName = (itemId, raw) => {
    const def = getDef(raw);
    return (
        def?.displayName ||
        def?.DisplayName ||
        def?.name ||
        def?.Name ||
        def?.desc_line1 ||
        def?.desc_line2 ||
        itemId
    );
};

const cleanName = (name) =>
    String(name ?? "")
        .replace(/_/g, " ")
        .trim();

const normalizeSlotValues = (rawSlots) =>
    toIndexedArray(rawSlots ?? []).map((entry) => {
        const numeric = Number(entry);
        return Number.isFinite(numeric) ? Math.round(numeric) : entry;
    });

const buildTrophyCatalog = (rawItemDefs) => {
    const itemDefs = rawItemDefs && typeof rawItemDefs === "object" ? rawItemDefs : {};

    return Object.entries(itemDefs)
        .map(([itemId, raw]) => {
            const match = itemId.match(TROPHY_KEY_PATTERN);
            if (!match) return null;

            const def = getDef(raw);
            const trophyNumber = Number(match[1]);

            return {
                itemId,
                trophyNumber,
                name: cleanName(getName(itemId, raw)),
                defId: def?.ID ?? null,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.trophyNumber - b.trophyNumber);
};

const buildTrophyState = (rawSlots, catalog) => {
    const slots = normalizeSlotValues(rawSlots);
    const catalogByItemId = new Map(catalog.map((entry) => [entry.itemId, entry]));

    const rows = slots.map((rawValue, slotIndex) => {
        if (rawValue === -1) {
            return {
                slotIndex,
                rawValue,
                isEmpty: true,
                trophyNumber: null,
                itemId: null,
                name: "Empty Slot",
                knownCatalogMatch: false,
            };
        }

        if (typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue >= 0) {
            const itemId = `Trophy${rawValue}`;
            const match = catalogByItemId.get(itemId);

            return {
                slotIndex,
                rawValue,
                isEmpty: false,
                trophyNumber: rawValue,
                itemId,
                name: match?.name ?? `Unknown Trophy ${rawValue}`,
                knownCatalogMatch: Boolean(match),
            };
        }

        return {
            slotIndex,
            rawValue,
            isEmpty: false,
            trophyNumber: null,
            itemId: null,
            name: `Unknown Trophy ${String(rawValue)}`,
            knownCatalogMatch: false,
        };
    });

    const ownedValidItemIds = new Set(rows.filter((row) => row.knownCatalogMatch).map((row) => row.itemId));
    const missingOptions = catalog.filter((entry) => !ownedValidItemIds.has(entry.itemId));
    const firstEmptySlotIndex = rows.findIndex((row) => row.isEmpty);
    const visibleRows = rows.filter((row) => !row.isEmpty);

    return {
        slots,
        rows,
        visibleRows,
        missingOptions,
        firstEmptySlotIndex,
        slotCount: rows.length,
        ownedCount: rows.filter((row) => row.knownCatalogMatch).length,
        emptyCount: rows.filter((row) => row.isEmpty).length,
        eligibleCount: catalog.length,
        addableCount: missingOptions.length,
    };
};

const TrophySlotRow = ({ row, onClear }) => {
    const { status, run } = useWriteStatus();

    const clearSlot = async () => {
        await run(async () => {
            await onClear(row.slotIndex);
        });
    };

    const badgeLabel = row.isEmpty ? "EMPTY" : row.knownCatalogMatch ? "OWNED" : "UNKNOWN";

    return div(
        {
            class: () =>
                [
                    "feature-row",
                    "trophy-slot-row",
                    row.isEmpty ? "trophy-slot-row--empty" : "",
                    status.val === "success" ? "flash-success" : "",
                    status.val === "error" ? "flash-error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, row.slotIndex + 1),
            div(
                { class: "trophy-slot-row__name-group" },
                span({ class: "feature-row__name" }, row.name),
                span(
                    { class: "trophy-slot-row__item-id" },
                    row.isEmpty ? "Spelunk[16] slot available" : row.itemId ?? String(row.rawValue)
                )
            )
        ),
        span({ class: "feature-row__badge" }, badgeLabel),
        div(
            { class: "feature-row__controls" },
            row.isEmpty
                ? span({ class: "trophy-slot-row__empty-note" }, "FILL VIA ADD")
                : button(
                      {
                          class: () =>
                              `feature-btn feature-btn--danger ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                          disabled: () => status.val === "loading" || onClear.isBusy(),
                          onmousedown: (e) => e.preventDefault(),
                          onclick: clearSlot,
                      },
                      () => (status.val === "loading" ? "..." : "CLEAR")
                  )
        )
    );
};

export const TrophyTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const slotValues = van.state([]);
    const slotRows = van.state([]);
    const visibleSlotRows = van.state([]);
    const missingOptions = van.state([]);
    const selectedAddItemId = van.state("");
    const firstEmptySlotIndex = van.state(-1);
    const slotCount = van.state(0);
    const ownedCount = van.state(0);
    const emptyCount = van.state(0);
    const eligibleCount = van.state(0);
    const addableCount = van.state(0);
    const mutating = van.state(false);

    const { status: addStatus, run: runAdd } = useWriteStatus();
    let trophyCatalogCache = [];
    let scrollEl = null;
    let loadSeq = 0;

    const withPreservedScroll = (fn) => {
        const prevTop = scrollEl?.scrollTop ?? 0;
        fn();
        requestAnimationFrame(() => {
            if (scrollEl) scrollEl.scrollTop = prevTop;
        });
    };

    const applySlotsState = (nextSlots) => {
        const result = buildTrophyState(nextSlots, trophyCatalogCache);
        slotValues.val = [...result.slots];
        slotRows.val = result.rows;
        visibleSlotRows.val = result.visibleRows;
        missingOptions.val = result.missingOptions;
        firstEmptySlotIndex.val = result.firstEmptySlotIndex;
        slotCount.val = result.slotCount;
        ownedCount.val = result.ownedCount;
        emptyCount.val = result.emptyCount;
        eligibleCount.val = result.eligibleCount;
        addableCount.val = result.addableCount;

        if (!result.missingOptions.some((entry) => entry.itemId === selectedAddItemId.val)) {
            selectedAddItemId.val = result.missingOptions[0]?.itemId ?? "";
        }
    };

    const load = async (showSpinner = true, forceDefsReload = false) => {
        const seq = ++loadSeq;
        if (showSpinner) loading.val = true;
        error.val = null;

        try {
            if (forceDefsReload || trophyCatalogCache.length === 0) {
                const rawItemDefs = await readGga(ITEM_DEFS_PATH);
                trophyCatalogCache = buildTrophyCatalog(rawItemDefs);
            }

            const rawSlots = await readGga(TROPHY_SLOTS_PATH);
            if (seq !== loadSeq) return;

            applySlotsState(rawSlots);
            data.val = { loaded: true };
        } catch (e) {
            if (seq !== loadSeq) return;
            error.val = e?.message ?? "Failed to load trophy gallery data";
            data.val = null;
        } finally {
            if (showSpinner && seq === loadSeq) loading.val = false;
        }
    };

    const clearSlotAtIndex = async (slotIndex) => {
        if (mutating.val) return;
        const currentSlots = [...slotValues.val];
        if (slotIndex < 0 || slotIndex >= currentSlots.length) return;
        if (currentSlots[slotIndex] === -1) return;

        mutating.val = true;
        try {
            await writeGga(`${TROPHY_SLOTS_PATH}[${slotIndex}]`, -1);
            const nextSlots = [...currentSlots];
            nextSlots[slotIndex] = -1;
            withPreservedScroll(() => applySlotsState(nextSlots));
        } finally {
            mutating.val = false;
        }
    };
    clearSlotAtIndex.isBusy = () => mutating.val;

    const addSelected = async () => {
        const itemId = selectedAddItemId.val;
        const slotIndex = firstEmptySlotIndex.val;
        if (!itemId || slotIndex < 0 || mutating.val) return;

        const selected = missingOptions.val.find((entry) => entry.itemId === itemId);
        if (!selected) return;

        await runAdd(async () => {
            mutating.val = true;
            try {
                await writeGga(`${TROPHY_SLOTS_PATH}[${slotIndex}]`, selected.trophyNumber);
                const nextSlots = [...slotValues.val];
                nextSlots[slotIndex] = selected.trophyNumber;
                withPreservedScroll(() => applySlotsState(nextSlots));
            } finally {
                mutating.val = false;
            }
        });
    };

    load(true, true);

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        renderLoading: () => div({ class: "feature-loader" }, Loader()),
        renderError: (message) => EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: message }),
        renderContent: () =>
            (() => {
                const root = div(
                    { class: "trophy-gallery-scroll scrollable-panel" },
                    div(
                        { class: "trophy-gallery-section" },
                        div(
                            { class: "trophy-gallery-section__header" },
                            span({ class: "trophy-gallery-section__title" }, "CURRENT SLOTS"),
                            span(
                                { class: "trophy-gallery-section__note" },
                                () => `${ownedCount.val} OWNED, ${emptyCount.val} EMPTY, ${slotCount.val} TOTAL SLOTS`
                            )
                        ),
                        () => {
                            const rows = visibleSlotRows.val;
                            if (rows.length === 0) {
                                return div(
                                    { class: "trophy-gallery-empty" },
                                    () =>
                                        emptyCount.val > 0
                                            ? `No trophies currently owned. ${emptyCount.val} empty slot${
                                                  emptyCount.val === 1 ? "" : "s"
                                              } available.`
                                            : "No trophies currently owned."
                                );
                            }

                            return div(
                                { class: "trophy-gallery-rows" },
                                ...rows.map((row) =>
                                    TrophySlotRow({
                                        row,
                                        onClear: clearSlotAtIndex,
                                    })
                                )
                            );
                        }
                    ),
                    div(
                        { class: "trophy-gallery-section" },
                        div(
                            { class: "trophy-gallery-section__header" },
                            span({ class: "trophy-gallery-section__title" }, "ADD TROPHY"),
                            span(
                                { class: "trophy-gallery-section__note" },
                                () => `${addableCount.val}/${eligibleCount.val} TROPHIES AVAILABLE`
                            )
                        ),
                        div(
                            {
                                class: () =>
                                    [
                                        "trophy-gallery-add-row",
                                        addStatus.val === "success" ? "flash-success" : "",
                                        addStatus.val === "error" ? "flash-error" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" "),
                            },
                            span({ class: "trophy-gallery-add-row__label" }, "SELECT TROPHY"),
                            () =>
                                select(
                                    {
                                        class: "select-base trophy-gallery-add-row__select",
                                        value: selectedAddItemId,
                                        disabled: () => firstEmptySlotIndex.val < 0 || missingOptions.val.length === 0,
                                        onchange: (e) => (selectedAddItemId.val = e.target.value),
                                    },
                                    ...(missingOptions.val.length === 0
                                        ? [
                                              option(
                                                  { value: "" },
                                                  firstEmptySlotIndex.val < 0
                                                      ? "No empty trophy slots available"
                                                      : "No trophies left to add"
                                              ),
                                          ]
                                        : missingOptions.val.map((entry) =>
                                              option(
                                                  { value: entry.itemId },
                                                  `${entry.trophyNumber}: ${entry.name} (${entry.itemId})`
                                              )
                                          ))
                                ),
                            button(
                                {
                                    class: () =>
                                        `feature-btn feature-btn--apply ${addStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                                    disabled: () =>
                                        mutating.val ||
                                        addStatus.val === "loading" ||
                                        !selectedAddItemId.val ||
                                        firstEmptySlotIndex.val < 0 ||
                                        missingOptions.val.length === 0,
                                    onmousedown: (e) => e.preventDefault(),
                                    onclick: addSelected,
                                },
                                () => (addStatus.val === "loading" ? "..." : "ADD")
                            )
                        )
                    )
                );
                scrollEl = root;
                return root;
            })(),
    });

    return div(
        { class: "tab-container" },
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "TROPHIES"),
                p(
                    { class: "feature-header__desc" },
                    "Edit W7 gallery trophy slots from Spelunk[16]. Empty slots stay in place and new trophies fill the first available slot."
                )
            ),
            div(
                { class: "feature-header__actions" },
                button(
                    {
                        class: "btn-secondary",
                        disabled: () => loading.val || mutating.val,
                        onclick: () => {
                            if (mutating.val) return;
                            load(true, true);
                        },
                    },
                    "REFRESH"
                )
            )
        ),
        renderBody
    );
};
