/**
 * W3 - Hat Rack Tab
 *
 * Reverse-engineered from:
 *   gga.Spelunk[46] - current rack item ids
 *   gga.ItemDefinitionsGET.h - item definitions map
 *
 * Eligible hats:
 *   Type === "PREMIUM_HELMET" && typeGen === "aHelmetMTX"
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { AsyncFeatureBody, cleanName, useWriteStatus } from "../featureShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div, button, span, h3, p, select, option } = van.tags;

const RACK_PATH = "Spelunk[46]";
const SLAB_HISTORY_PATH = "Cards[1]";
const ITEM_DEFS_PATH = "ItemDefinitionsGET.h";

const getDef = (raw) => raw?.h ?? raw;

const getName = (itemId, raw) => {
    const def = getDef(raw);
    return (
        def?.displayName || def?.DisplayName || def?.name || def?.Name || def?.desc_line1 || def?.desc_line2 || itemId
    );
};

const normalizeRackIds = (rawRack) =>
    toIndexedArray(rawRack ?? [])
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0);

const normalizeSlabHistoryIds = (rawCards) =>
    toIndexedArray(rawCards ?? [])
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0);

const buildHatRackState = (rawRack, rawItemDefs) => {
    const itemDefs = rawItemDefs && typeof rawItemDefs === "object" ? rawItemDefs : {};
    const rack = normalizeRackIds(rawRack);

    const eligible = Object.entries(itemDefs)
        .map(([itemId, raw]) => {
            const def = getDef(raw);
            return {
                itemId,
                name: cleanName(getName(itemId, raw), "", { stripMarker: true }),
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
        name: cleanName(getName(itemId, itemDefs[itemId]), "", { stripMarker: true }),
        eligible: eligibleIds.has(itemId),
        id: eligibleMap[itemId]?.id ?? getDef(itemDefs[itemId])?.ID ?? null,
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
        {
            class: () =>
                [
                    "feature-row",
                    "hat-rack-row",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, row.index + 1),
            div(
                { class: "hat-rack-row__name-group" },
                span({ class: "feature-row__name" }, row.name || row.itemId),
                span({ class: "hat-rack-row__item-id" }, row.itemId)
            )
        ),
        span({ class: "feature-row__badge" }, "ON RACK"),
        div(
            { class: "feature-row__controls" },
            button(
                {
                    class: () =>
                        `feature-btn feature-btn--danger ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading" || onRemove.isBusy(),
                    onmousedown: (e) => e.preventDefault(),
                    onclick: removeRow,
                },
                () => (status.val === "loading" ? "..." : "REMOVE")
            )
        )
    );
};

export const HatRackTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const currentRackIds = van.state([]);
    const rackRows = van.state([]);
    const missingOptions = van.state([]);
    const selectedAddItemId = van.state("");
    const eligibleCount = van.state(0);
    const onRackCount = van.state(0);
    const missingCount = van.state(0);
    const rackCount = van.state(0);
    const writeWarning = van.state(null);
    const mutating = van.state(false);

    const { status: addStatus, run: runAdd } = useWriteStatus();
    let itemDefsCache = null;
    let scrollEl = null;
    let loadSeq = 0;

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

        writeWarning.val = null;
    };

    const load = async (showSpinner = true, forceDefsReload = false) => {
        const seq = ++loadSeq;
        if (showSpinner) loading.val = true;
        error.val = null;
        try {
            if (forceDefsReload || !itemDefsCache) {
                const defs = await gga(ITEM_DEFS_PATH);
                itemDefsCache = defs && typeof defs === "object" ? defs : {};
            }
            const rawRack = await gga(RACK_PATH);
            if (seq !== loadSeq) return;
            applyRackState(rawRack);
            data.val = { loaded: true };
        } catch (e) {
            if (seq !== loadSeq) return;
            error.val = e?.message ?? "Failed to load hat rack data";
            data.val = null;
        } finally {
            if (showSpinner && seq === loadSeq) loading.val = false;
        }
    };

    const appendToRack = async (currentRack, items) => {
        writeWarning.val = null;
        const baseRack = normalizeRackIds(currentRack);
        for (let i = 0; i < items.length; i++) {
            try {
                const ok = await gga(`${RACK_PATH}[${baseRack.length + i}]`, items[i]);
                if (!ok)
                    throw new Error(
                        `Failed writing rack item at index ${baseRack.length + i}. Rack may be inconsistent. Press REFRESH to resync.`
                    );
            } catch (e) {
                const msg = `Failed writing rack item at index ${baseRack.length + i}. Rack may be inconsistent. Press REFRESH to resync.`;
                writeWarning.val = msg;
                throw new Error(e?.message ? `${msg} (${e.message})` : msg);
            }
        }
        try {
            const ok = await gga(`${RACK_PATH}.length`, baseRack.length + items.length);
            if (!ok) throw new Error("Failed updating rack length. Rack may be inconsistent. Press REFRESH to resync.");
        } catch (e) {
            const msg = "Failed updating rack length. Rack may be inconsistent. Press REFRESH to resync.";
            writeWarning.val = msg;
            throw new Error(e?.message ? `${msg} (${e.message})` : msg);
        }
    };

    const writeSlabHistory = async (nextHistory, failMessage) => {
        try {
            const ok = await gga(SLAB_HISTORY_PATH, nextHistory);
            if (!ok) throw new Error("Write verification failed");
        } catch (e) {
            writeWarning.val = failMessage;
            throw new Error(e?.message ? `${failMessage} (${e.message})` : failMessage);
        }
    };

    const appendToSlabHistory = async (items) => {
        if (!Array.isArray(items) || items.length === 0) return;
        try {
            const currentHistory = normalizeSlabHistoryIds(await gga(SLAB_HISTORY_PATH));
            const nextHistory = [...currentHistory, ...items];
            await writeSlabHistory(
                nextHistory,
                "Failed updating slab history after rack add. Slab may be inconsistent. Press REFRESH to resync."
            );
        } catch (e) {
            if (e instanceof Error) throw e;
            throw new Error(
                "Failed updating slab history after rack add. Slab may be inconsistent. Press REFRESH to resync."
            );
        }
    };

    const removeFromSlabHistory = async (itemId) => {
        if (!itemId) return;
        try {
            const currentHistory = normalizeSlabHistoryIds(await gga(SLAB_HISTORY_PATH));
            const nextHistory = currentHistory.filter((id) => id !== itemId);
            if (nextHistory.length === currentHistory.length) return;
            await writeSlabHistory(
                nextHistory,
                "Failed updating slab history after rack removal. Slab may be inconsistent. Press REFRESH to resync."
            );
        } catch (e) {
            if (e instanceof Error) throw e;
            throw new Error(
                "Failed updating slab history after rack removal. Slab may be inconsistent. Press REFRESH to resync."
            );
        }
    };

    const removeAtIndex = async (index) => {
        if (mutating.val) return;
        const currentRack = [...currentRackIds.val];
        if (index < 0 || index >= currentRack.length) return;
        const removedItemId = currentRack[index];

        mutating.val = true;
        try {
            const nextRack = [...currentRack];
            nextRack.splice(index, 1);
            writeWarning.val = null;
            try {
                const ok = await gga(RACK_PATH, nextRack);
                if (!ok) throw new Error("Write verification failed");
            } catch (e) {
                const msg = "Failed updating rack after removal. Rack may be inconsistent. Press REFRESH to resync.";
                writeWarning.val = msg;
                throw new Error(e?.message ? `${msg} (${e.message})` : msg);
            }
            await removeFromSlabHistory(removedItemId);
            withPreservedScroll(() => applyRackState(nextRack));
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
                await appendToRack(currentRack, [itemId]);
                await appendToSlabHistory([itemId]);
                withPreservedScroll(() => applyRackState([...currentRack, itemId]));
            } finally {
                mutating.val = false;
            }
        });
    };

    const addAllAvailable = async () => {
        if (mutating.val || missingOptions.val.length === 0) return;
        const shouldContinue = window.confirm(
            "This will add every available hat from the dropdown to your rack.\n\nAre you sure you want to continue?"
        );
        if (!shouldContinue) return;

        await runAdd(async () => {
            mutating.val = true;
            try {
                const currentRack = [...currentRackIds.val];
                const toAdd = missingOptions.val
                    .map((item) => item.itemId)
                    .filter((itemId) => !currentRack.includes(itemId));
                if (toAdd.length === 0) return;
                await appendToRack(currentRack, toAdd);
                await appendToSlabHistory(toAdd);
                withPreservedScroll(() => applyRackState([...currentRack, ...toAdd]));
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
                    {
                        class: "hat-rack-scroll scrollable-panel",
                    },
                    () =>
                        writeWarning.val
                            ? div({ class: "warning-banner" }, Icons.Warning(), " ", writeWarning.val)
                            : null,

                    div(
                        { class: "hat-rack-section" },
                        div(
                            { class: "hat-rack-section__header" },
                            span({ class: "hat-rack-section__title" }, "ON RACK"),
                            span(
                                { class: "hat-rack-section__note" },
                                () => `${rackCount.val} ON RACK, ${onRackCount.val}/${eligibleCount.val} TOTAL`
                            )
                        ),
                        () => {
                            const rows = rackRows.val;
                            if (rows.length === 0)
                                return div({ class: "hat-rack-empty" }, "No hats currently on rack.");

                            return div(
                                { class: "hat-rack-rows" },
                                ...rows.map((row) =>
                                    RackRow({
                                        row,
                                        onRemove: removeAtIndex,
                                    })
                                )
                            );
                        }
                    ),

                    div(
                        { class: "hat-rack-section" },
                        div(
                            { class: "hat-rack-section__header" },
                            span({ class: "hat-rack-section__title" }, "ADD ELIGIBLE HAT"),
                            span({ class: "hat-rack-section__note" }, () => `${missingCount.val} AVAILABLE TO ADD`)
                        ),
                        div(
                            {
                                class: () =>
                                    [
                                        "hat-rack-add-row",
                                        addStatus.val === "success" ? "feature-row--success" : "",
                                        addStatus.val === "error" ? "feature-row--error" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" "),
                            },
                            span({ class: "hat-rack-add-row__label" }, "SELECT HAT"),
                            () =>
                                select(
                                    {
                                        class: "select-base hat-rack-add-row__select",
                                        value: selectedAddItemId,
                                        onchange: (e) => (selectedAddItemId.val = e.target.value),
                                    },
                                    ...(missingOptions.val.length === 0
                                        ? [option({ value: "" }, "No eligible hats left to add")]
                                        : missingOptions.val.map((item) =>
                                              option({ value: item.itemId }, `${item.name} (${item.itemId})`)
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
                                        missingOptions.val.length === 0,
                                    onmousedown: (e) => e.preventDefault(),
                                    onclick: addSelected,
                                },
                                () => (addStatus.val === "loading" ? "..." : "ADD")
                            ),
                            button(
                                {
                                    class: () =>
                                        `feature-btn feature-btn--danger ${addStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                                    disabled: () =>
                                        mutating.val || addStatus.val === "loading" || missingOptions.val.length === 0,
                                    onmousedown: (e) => e.preventDefault(),
                                    onclick: addAllAvailable,
                                },
                                () => (addStatus.val === "loading" ? "..." : "ADD ALL")
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
                h3({}, "HAT RACK"),
                p(
                    { class: "feature-header__desc" },
                    "Manage Spelunk hat rack entries. Remove any rack hat, or add eligible premium helmets. Note: adding/removing hats here also adds/removes them from Slab (Cards[1])."
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
