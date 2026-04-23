/**
 * W3 - Hat Rack Tab
 *
 * Reverse-engineered from:
 *   gga.Spelunk[46] - current rack item ids
 *   gga.Cards[1] - slab history item ids
 *   gga.ItemDefinitionsGET.h - item definitions map
 *
 * Eligible hats:
 *   Type === "PREMIUM_HELMET" && typeGen === "aHelmetMTX"
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { ActionButton } from "../components/ActionButton.js";
import { AccountSection } from "../components/AccountSection.js";
import { cleanName, unwrapH, useWriteStatus, writeVerified } from "../accountShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div, span, select, option } = van.tags;

const RACK_PATH = "Spelunk[46]";
const SLAB_HISTORY_PATH = "Cards[1]";
const ITEM_DEFS_PATH = "ItemDefinitionsGET.h";

const normalizeRackIds = (rawRack) =>
    toIndexedArray(rawRack ?? [])
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0);

const buildHatRackState = (rawRack, rawItemDefs) => {
    const itemDefs = rawItemDefs && typeof rawItemDefs === "object" ? rawItemDefs : {};
    const rack = normalizeRackIds(rawRack);

    const eligible = Object.entries(itemDefs)
        .map(([itemId, raw]) => {
            const def = unwrapH(raw);
            return {
                itemId,
                name: cleanName(def?.displayName || itemId, "", { stripMarker: true }),
                type: def?.Type,
                typeGen: def?.typeGen,
                id: def?.ID,
            };
        })
        .filter((x) => x.type === "PREMIUM_HELMET" && x.typeGen === "aHelmetMTX")
        .sort((a, b) => a.name.localeCompare(b.name));

    const rackSet = new Set(rack);
    const eligibleIds = new Set(eligible.map((x) => x.itemId));
    const eligibleMap = Object.fromEntries(eligible.map((x) => [x.itemId, x]));

    const onRack = eligible.filter((x) => rackSet.has(x.itemId));
    const missingFromRack = eligible.filter((x) => !rackSet.has(x.itemId));

    const rackTable = rack.map((itemId, index) => ({
        index,
        itemId,
        name: cleanName(unwrapH(itemDefs[itemId])?.displayName || itemId, "", { stripMarker: true }),
        eligible: eligibleIds.has(itemId),
        id: eligibleMap[itemId]?.id ?? unwrapH(itemDefs[itemId])?.ID ?? null,
    }));

    return {
        eligible,
        onRack,
        missingFromRack,
        rack: rackTable,
    };
};

const RackRow = ({ row, onRemove }) => {
    const { status, run } = useWriteStatus();

    const removeRow = async () => {
        await run(async () => {
            await onRemove(row.index);
        });
    };

    return div(
        { class: "account-row hat-rack-row" },
        div(
            { class: "account-row__info" },
            span({ class: "account-row__index" }, `#${row.index + 1}`),
            div(
                { class: "hat-rack-row__name-group" },
                span({ class: "account-row__name" }, row.name || row.itemId),
                span({ class: "account-row__sub-label" }, row.itemId)
            )
        ),
        span({ class: "account-row__badge" }, "ON RACK"),
        div(
            { class: "account-row__controls" },
            ActionButton({
                label: "REMOVE",
                status,
                variant: "danger",
                disabled: () => onRemove.isBusy(),
                onClick: removeRow,
            })
        )
    );
};

export const HatRackTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Hat Rack" });
    const currentRackIds = van.state([]);
    const slabHistoryIds = van.state([]);
    const rackRows = van.state([]);
    const missingOptions = van.state([]);
    const selectedAddItemId = van.state("");
    const eligibleCount = van.state(0);
    const onRackCount = van.state(0);
    const missingCount = van.state(0);
    const rackCount = van.state(0);
    const mutating = van.state(false);

    const { status: addStatus, run: runAdd } = useWriteStatus();
    let itemDefsCache = null;
    let scrollEl = null;

    const withPreservedScroll = (fn) => {
        const prevTop = scrollEl?.scrollTop ?? 0;
        fn();
        requestAnimationFrame(() => {
            if (scrollEl) scrollEl.scrollTop = prevTop;
        });
    };

    const applyRackState = (rackIds) => {
        const result = buildHatRackState(rackIds, itemDefsCache);
        currentRackIds.val = [...normalizeRackIds(rackIds)];
        rackRows.val = result.rack;
        missingOptions.val = result.missingFromRack;
        eligibleCount.val = result.eligible.length;
        onRackCount.val = result.onRack.length;
        missingCount.val = result.missingFromRack.length;
        rackCount.val = result.rack.length;

        if (!result.missingFromRack.some((item) => item.itemId === selectedAddItemId.val)) {
            selectedAddItemId.val = result.missingFromRack[0]?.itemId ?? "";
        }
    };

    const load = async () => {
        return run(async () => {
                let nextItemDefs = itemDefsCache;
                if (!nextItemDefs) {
                    const defs = await gga(ITEM_DEFS_PATH);
                    nextItemDefs = defs && typeof defs === "object" ? defs : {};
                }

                const [rawRack, rawSlabHistory] = await Promise.all([gga(RACK_PATH), gga(SLAB_HISTORY_PATH)]);

                itemDefsCache = nextItemDefs;
                applyRackState(rawRack);
                slabHistoryIds.val = [...normalizeRackIds(rawSlabHistory)];
        });
    };

    const appendToRack = async (currentRack, items) => {
        const baseRack = normalizeRackIds(currentRack);
        for (let i = 0; i < items.length; i++) {
            await writeVerified(`${RACK_PATH}[${baseRack.length + i}]`, items[i], {
                message: `Failed writing rack item at index ${baseRack.length + i}.`,
            });
        }
        await writeVerified(`${RACK_PATH}.length`, baseRack.length + items.length, {
            message: "Failed updating rack length.",
        });
    };

    const writeSlabHistory = async (nextHistory, failMessage) => {
        await writeVerified(SLAB_HISTORY_PATH, nextHistory, { message: failMessage });
    };

    const removeAtIndex = async (index) => {
        if (mutating.val) return;
        const currentRack = [...currentRackIds.val];
        if (index < 0 || index >= currentRack.length) return;

        mutating.val = true;
        try {
            const nextRack = [...currentRack];
            const removedItemId = nextRack[index];
            nextRack.splice(index, 1);
            const nextSlabHistory = slabHistoryIds.val.filter((itemId) => itemId !== removedItemId);
            await writeVerified(RACK_PATH, nextRack, { message: "Failed updating rack after removal." });
            try {
                if (nextSlabHistory.length !== slabHistoryIds.val.length) {
                    await writeSlabHistory(nextSlabHistory, "Failed updating slab history after rack removal.");
                }
                withPreservedScroll(() => {
                    applyRackState(nextRack);
                    slabHistoryIds.val = nextSlabHistory;
                });
            } catch (e) {
                withPreservedScroll(() => applyRackState(nextRack));
                throw e;
            }
        } finally {
            mutating.val = false;
        }
    };
    removeAtIndex.isBusy = () => mutating.val;

    const addSelected = async () => {
        const itemId = selectedAddItemId.val;
        if (!itemId || mutating.val) return;

        await runAdd(async () => {
            mutating.val = true;
            try {
                const currentRack = [...currentRackIds.val];
                if (currentRack.includes(itemId)) return;
                const nextRack = [...currentRack, itemId];
                await appendToRack(currentRack, [itemId]);
                const nextSlabHistory = slabHistoryIds.val.includes(itemId)
                    ? [...slabHistoryIds.val]
                    : [...slabHistoryIds.val, itemId];
                try {
                    if (nextSlabHistory.length !== slabHistoryIds.val.length) {
                        await writeSlabHistory(nextSlabHistory, "Failed updating slab history after rack add.");
                    }
                    withPreservedScroll(() => {
                        applyRackState(nextRack);
                        slabHistoryIds.val = nextSlabHistory;
                    });
                } catch (e) {
                    withPreservedScroll(() => applyRackState(nextRack));
                    throw e;
                }
            } finally {
                mutating.val = false;
            }
        });
    };

    const addAllAvailable = async () => {
        if (mutating.val || missingOptions.val.length === 0) return;
        await runAdd(async () => {
            mutating.val = true;
            try {
                const currentRack = [...currentRackIds.val];
                const toAdd = missingOptions.val
                    .map((item) => item.itemId)
                    .filter((itemId) => !currentRack.includes(itemId));
                if (toAdd.length === 0) return;
                const nextRack = [...currentRack, ...toAdd];
                await appendToRack(currentRack, toAdd);
                const nextSlabHistory = [...slabHistoryIds.val];
                for (const itemId of toAdd) {
                    if (!nextSlabHistory.includes(itemId)) nextSlabHistory.push(itemId);
                }
                try {
                    if (nextSlabHistory.length !== slabHistoryIds.val.length) {
                        await writeSlabHistory(nextSlabHistory, "Failed updating slab history after rack add.");
                    }
                    withPreservedScroll(() => {
                        applyRackState(nextRack);
                        slabHistoryIds.val = nextSlabHistory;
                    });
                } catch (e) {
                    withPreservedScroll(() => applyRackState(nextRack));
                    throw e;
                }
            } finally {
                mutating.val = false;
            }
        });
    };

    load();

    const body = div(
        {
            class: "scrollable-panel content-stack",
        },

        AccountSection({
            title: "ADD ELIGIBLE HAT",
            note: () => `${missingCount.val} AVAILABLE TO ADD`,
            body: div(
                { class: "tab-add-row hat-rack-add-row" },
                span({ class: "tab-add-row__label" }, "SELECT HAT"),
                () =>
                    select(
                        {
                            class: "select-base tab-add-row__select",
                            value: selectedAddItemId,
                            onchange: (e) => (selectedAddItemId.val = e.target.value),
                        },
                        ...(missingOptions.val.length === 0
                            ? [option({ value: "" }, "No eligible hats left to add")]
                            : missingOptions.val.map((item) => option({ value: item.itemId }, `${item.name} (${item.itemId})`)))
                    ),
                ActionButton({
                    label: "ADD",
                    status: addStatus,
                    disabled: () => mutating.val || !selectedAddItemId.val || missingOptions.val.length === 0,
                    onClick: addSelected,
                }),
                ActionButton({
                    label: "ADD ALL",
                    status: addStatus,
                    variant: "danger",
                    disabled: () => mutating.val || missingOptions.val.length === 0,
                    onClick: addAllAvailable,
                })
            ),
        })
        ,

        AccountSection({
            title: "ON RACK",
            note: () => `${rackCount.val} ON RACK, ${onRackCount.val}/${eligibleCount.val} TOTAL`,
            body: () => {
                const rows = rackRows.val;
                if (rows.length === 0) return div({ class: "tab-empty" }, "No hats currently on rack.");

                return div(
                    { class: "hat-rack-rows" },
                    ...rows.map((row) =>
                        RackRow({
                            row,
                            onRemove: removeAtIndex,
                        })
                    )
                );
            },
        })
    );
    scrollEl = body;

    return AccountPageShell({
        header: AccountTabHeader({
            title: "HAT RACK",
            description:
                "Manage Spelunk hat rack entries. Remove any rack hat, or add eligible premium helmets. Rack changes also sync Slab history (Cards[1]).",
            actions: RefreshButton({
                onRefresh: () => {
                    if (mutating.val) return;
                    load();
                },
                disabled: () => loading.val || mutating.val,
            }),
        }),
        persistentState: { loading, error },
        persistentLoadingText: "READING HAT RACK",
        persistentErrorTitle: "HAT RACK READ FAILED",
        persistentInitialWrapperClass: "scrollable-panel",
        body,
    });
};


