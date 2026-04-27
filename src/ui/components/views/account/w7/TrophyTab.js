import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { AccountSection } from "../components/AccountSection.js";
import { AddFromListSection } from "../components/AddFromListSection.js";
import { RemovableStoredRow } from "../components/RemovableStoredRow.js";
import { cleanName, unwrapH, useWriteStatus, writeVerified } from "../accountShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div } = van.tags;

const TROPHY_SLOTS_PATH = "Spelunk[16]";
const ITEM_DEFS_PATH = "ItemDefinitionsGET.h";
const TROPHY_KEY_PATTERN = /^Trophy(\d+)$/;

const normalizeSlotValues = (rawSlots) =>
    toIndexedArray(rawSlots ?? []).map((entry) => {
        const numeric = Number(entry);
        return Number.isFinite(numeric) ? Math.round(numeric) : entry;
    });

const buildTrophyCatalog = (rawItemDefs) =>
    Object.entries(rawItemDefs && typeof rawItemDefs === "object" ? rawItemDefs : {})
        .map(([itemId, raw]) => {
            const match = itemId.match(TROPHY_KEY_PATTERN);
            if (!match) return null;

            const def = unwrapH(raw);
            const trophyNumber = Number(match[1]);

            return {
                itemId,
                trophyNumber,
                name: cleanName(
                    def?.displayName || def?.DisplayName || def?.name || def?.Name || def?.desc_line1 || itemId
                ),
                defId: def?.ID ?? null,
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.trophyNumber - b.trophyNumber);

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

        if (typeof rawValue === "number" && rawValue >= 0) {
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

const TrophySlotRow = ({ row, onClear }) =>
    RemovableStoredRow({
        index: row.slotIndex,
        primaryLabel: row.name,
        fallbackLabel: row.itemId ?? String(row.rawValue),
        secondaryLabel: row.itemId ?? String(row.rawValue),
        badge: row.knownCatalogMatch ? "OWNED" : "UNKNOWN",
        nameGroupClass: "account-row__name-group",
        onRemove: onClear,
        isBusy: onClear.isBusy,
    });

export const TrophyTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Trophies" });
    const slotValues = van.state([]);
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

    const load = async () =>
        run(async () => {
            trophyCatalogCache = buildTrophyCatalog(await gga(ITEM_DEFS_PATH));

            applySlotsState(await gga(TROPHY_SLOTS_PATH));
        });

    const clearSlotAtIndex = async (slotIndex) => {
        if (mutating.val) return;
        const currentSlots = [...slotValues.val];
        if (slotIndex < 0 || slotIndex >= currentSlots.length || currentSlots[slotIndex] === -1) return;

        mutating.val = true;
        try {
            await writeVerified(`${TROPHY_SLOTS_PATH}[${slotIndex}]`, -1);
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
                await writeVerified(`${TROPHY_SLOTS_PATH}[${slotIndex}]`, selected.trophyNumber);
                const nextSlots = [...slotValues.val];
                nextSlots[slotIndex] = selected.trophyNumber;
                withPreservedScroll(() => applySlotsState(nextSlots));
            } finally {
                mutating.val = false;
            }
        });
    };

    const addAllAvailable = async () => {
        if (mutating.val || firstEmptySlotIndex.val < 0 || missingOptions.val.length === 0) return;

        await runAdd(async () => {
            mutating.val = true;
            try {
                const nextSlots = [...slotValues.val];
                let slotIndex = firstEmptySlotIndex.val;

                for (const entry of missingOptions.val) {
                    while (slotIndex < nextSlots.length && nextSlots[slotIndex] !== -1) slotIndex++;
                    if (slotIndex >= nextSlots.length) break;
                    await writeVerified(`${TROPHY_SLOTS_PATH}[${slotIndex}]`, entry.trophyNumber);
                    nextSlots[slotIndex] = entry.trophyNumber;
                }

                withPreservedScroll(() => applySlotsState(nextSlots));
            } finally {
                mutating.val = false;
            }
        });
    };

    const body = div(
        { class: "scrollable-panel content-stack" },
        AddFromListSection({
            title: "ADD TROPHY",
            note: () => `${addableCount.val}/${eligibleCount.val} TROPHIES AVAILABLE`,
            selectLabel: "SELECT TROPHY",
            selectedValue: selectedAddItemId,
            options: missingOptions,
            emptyOptionLabel: () =>
                firstEmptySlotIndex.val < 0 ? "No empty trophy slots available" : "No trophies left to add",
            getOptionValue: (entry) => entry.itemId,
            getOptionLabel: (entry) => `${entry.trophyNumber}: ${entry.name} (${entry.itemId})`,
            addStatus,
            addDisabled: () =>
                mutating.val ||
                !selectedAddItemId.val ||
                firstEmptySlotIndex.val < 0 ||
                missingOptions.val.length === 0,
            addAllDisabled: () => mutating.val || firstEmptySlotIndex.val < 0 || missingOptions.val.length === 0,
            onAdd: addSelected,
            onAddAll: addAllAvailable,
        }),
        AccountSection({
            title: "CURRENT SLOTS",
            note: () => `${ownedCount.val} OWNED, ${emptyCount.val} EMPTY, ${slotCount.val} TOTAL SLOTS`,
            body: () => {
                const rows = visibleSlotRows.val;
                return rows.length === 0
                    ? div({ class: "tab-empty" }, () =>
                          emptyCount.val > 0
                              ? `No trophies currently owned. ${emptyCount.val} empty slot${
                                    emptyCount.val === 1 ? "" : "s"
                                } available.`
                              : "No trophies currently owned."
                      )
                    : div(
                          { class: "account-item-stack account-item-stack--dense" },
                          ...rows.map((row) => TrophySlotRow({ row, onClear: clearSlotAtIndex }))
                      );
            },
        })
    );
    scrollEl = body;

    load();

    return PersistentAccountListPage({
        title: "TROPHIES",
        description:
            "Edit W7 gallery trophy slots from Spelunk[16]. Empty slots stay in place and new trophies fill the first available slot.",
        actions: RefreshButton({
            onRefresh: () => {
                if (mutating.val) return;
                load();
            },
            disabled: () => loading.val || mutating.val,
        }),
        state: { loading, error },
        loadingText: "READING TROPHIES",
        errorTitle: "TROPHY READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
