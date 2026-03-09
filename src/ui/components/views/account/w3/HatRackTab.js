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
import { readGga, writeGga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { AsyncFeatureBody, useWriteStatus } from "../featureShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div, button, span, h3, p, select, option } = van.tags;

const RACK_PATH = "Spelunk[46]";
const ITEM_DEFS_PATH = "ItemDefinitionsGET.h";

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
        .replace(/製.*$/, "")
        .replace(/_/g, " ")
        .trim();

const normalizeRackIds = (rawRack) =>
    toIndexedArray(rawRack ?? [])
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
                name: cleanName(getName(itemId, raw)),
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
        name: cleanName(getName(itemId, itemDefs[itemId])),
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
                    status.val === "success" ? "flash-success" : "",
                    status.val === "error" ? "flash-error" : "",
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
                    disabled: () => status.val === "loading",
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

        writeWarning.val = null;
    };

    const load = async (showSpinner = true, forceDefsReload = false) => {
        if (showSpinner) loading.val = true;
        error.val = null;
        try {
            if (forceDefsReload || !itemDefsCache) {
                const defs = await readGga(ITEM_DEFS_PATH);
                itemDefsCache = defs && typeof defs === "object" ? defs : {};
            }
            const rawRack = await readGga(RACK_PATH);
            applyRackState(rawRack);
            data.val = { loaded: true };
        } catch (e) {
            error.val = e?.message ?? "Failed to load hat rack data";
            data.val = null;
        } finally {
            if (showSpinner) loading.val = false;
        }
    };

    const rewriteRack = async (nextRack) => {
        writeWarning.val = null;
        for (let i = 0; i < nextRack.length; i++) {
            try {
                await writeGga(`${RACK_PATH}[${i}]`, nextRack[i]);
            } catch (e) {
                const msg = `Failed writing rack item at index ${i}. Rack may be inconsistent. Press REFRESH to resync.`;
                writeWarning.val = msg;
                throw new Error(e?.message ? `${msg} (${e.message})` : msg);
            }
        }
        try {
            await writeGga(`${RACK_PATH}.length`, nextRack.length);
        } catch (e) {
            const msg = "Failed updating rack length. Rack may be inconsistent. Press REFRESH to resync.";
            writeWarning.val = msg;
            throw new Error(e?.message ? `${msg} (${e.message})` : msg);
        }
    };

    const removeAtIndex = async (index) => {
        const currentRack = [...currentRackIds.val];
        if (index < 0 || index >= currentRack.length) return;

        const nextRack = currentRack.filter((_, i) => i !== index);
        await rewriteRack(nextRack);
        withPreservedScroll(() => applyRackState(nextRack));
    };

    const addSelected = async () => {
        const itemId = selectedAddItemId.val;
        if (!itemId) return;

        await runAdd(async () => {
            const currentRack = [...currentRackIds.val];
            if (currentRack.includes(itemId)) return;
            const nextRack = [...currentRack, itemId];
            await rewriteRack(nextRack);
            withPreservedScroll(() => applyRackState(nextRack));
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
                            span({ class: "hat-rack-section__note" }, () =>
                                `${rackCount.val} ON RACK, ${onRackCount.val}/${eligibleCount.val} TOTAL`
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
                                        addStatus.val === "success" ? "flash-success" : "",
                                        addStatus.val === "error" ? "flash-error" : "",
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
                                        addStatus.val === "loading" ||
                                        !selectedAddItemId.val ||
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
                h3({}, "HAT RACK"),
                p(
                    { class: "feature-header__desc" },
                    "Manage Spelunk hat rack entries. Remove any rack hat, or add eligible premium helmets."
                )
            ),
            div(
                { class: "feature-header__actions" },
                button({ class: "btn-secondary", onclick: () => load(true, true) }, "REFRESH")
            )
        ),
        renderBody
    );
};
