/**
 * W3 - Smithy Tab (Armor Set Smithy)
 *
 * Reverse-engineered from:
 *   gga.CustomMaps(.h).EquipmentSets      - set definitions
 *   gga.CustomLists(.h).RANDOlist[113]    - smithy display/order list
 *   gga.EquipmentOrder[0/1]               - currently equipped parts
 *   gga.OptionsListAccount[379]           - permanently stored/unlocked set keys (comma list)
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { AsyncFeatureBody, useWriteStatus } from "../featureShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div, button, span, h3, p, select, option } = van.tags;

const EQUIP_SETS_PATHS = ["CustomMaps.h.EquipmentSets", "CustomMaps.EquipmentSets"];
const SET_ORDER_PATHS = ["CustomLists.h.RANDOlist[113]", "CustomLists.RANDOlist[113]"];
const STORED_SETS_PATH = "OptionsListAccount[379]";
const EQUIPPED_MAIN_PATH = "EquipmentOrder[0]";
const EQUIPPED_EXTRA_PATH = "EquipmentOrder[1]";

const unwrap = (value) => (value && typeof value === "object" && "h" in value ? value.h : value);

const cleanText = (txt, fallback = "") =>
    String(txt ?? fallback)
        .replace(/_SET$/i, "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();

const getSetDisplayName = (setKey) => `${cleanText(setKey)} Set`.replace(/\s+Set Set$/i, " Set");

const normalizeStringList = (raw) =>
    toIndexedArray(raw ?? [])
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0);

const parseStoredSets = (raw) =>
    String(raw ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0 && entry !== "0");

const uniq = (arr) => {
    const out = [];
    const seen = new Set();
    for (const item of arr) {
        if (seen.has(item)) continue;
        seen.add(item);
        out.push(item);
    }
    return out;
};

const toObject = (raw) => {
    const value = unwrap(raw);
    return value && typeof value === "object" ? value : {};
};

const isSetCompletedNow = (setKey, equipSets, equippedMainSet, equippedExtraSet) => {
    const setData = toIndexedArray(unwrap(equipSets?.[setKey]) ?? []);
    if (!Array.isArray(setData) || setData.length === 0) return false;

    const mainParts = normalizeStringList(unwrap(setData[0]));
    const extraParts = normalizeStringList(unwrap(setData[1]));
    const optionalParts = normalizeStringList(unwrap(setData[2]));
    const meta = toIndexedArray(unwrap(setData[3]) ?? []);

    const extraCap = Math.max(0, Number(meta[0] ?? 0) || 0);
    const needsOptionalOne = Number(meta[1] ?? 0) === 1;

    let partsOn = 0;
    let extraMatched = 0;

    for (const itemId of mainParts) {
        if (equippedMainSet.has(itemId)) partsOn++;
    }

    for (const itemId of extraParts) {
        if (equippedExtraSet.has(itemId) && extraMatched < extraCap) {
            partsOn++;
            extraMatched++;
        }
    }

    if (needsOptionalOne) {
        for (const itemId of optionalParts) {
            if (equippedMainSet.has(itemId)) {
                partsOn++;
                break;
            }
        }
    }

    const partsReq = mainParts.length + extraCap + (needsOptionalOne ? 1 : 0);
    return partsOn >= partsReq;
};

const buildSmithyState = ({ rawEquipSets, rawSetOrder, rawStoredSets, rawEquippedMain, rawEquippedExtra }) => {
    const equipSets = toObject(rawEquipSets);
    const storedSets = uniq(parseStoredSets(rawStoredSets));
    const storedSetKeys = new Set(storedSets);
    const equippedMainSet = new Set(normalizeStringList(rawEquippedMain));
    const equippedExtraSet = new Set(normalizeStringList(rawEquippedExtra));

    const normalizedSetOrder = normalizeStringList(rawSetOrder);
    const orderedSetKeys = uniq(normalizedSetOrder.length > 0 ? normalizedSetOrder : Object.keys(equipSets));

    const allSets = orderedSetKeys.map((setKey) => {
        const completedNow = isSetCompletedNow(setKey, equipSets, equippedMainSet, equippedExtraSet);
        const stored = storedSetKeys.has(setKey);
        return {
            setKey,
            displayName: getSetDisplayName(setKey),
            completedNow,
            stored,
            unlocked: stored || completedNow,
        };
    });

    const byKey = new Map(allSets.map((entry) => [entry.setKey, entry]));

    const storedRows = storedSets.map((setKey, index) => {
        const known = byKey.get(setKey);
        return {
            index,
            setKey,
            displayName: known?.displayName ?? getSetDisplayName(setKey),
            completedNow: known?.completedNow ?? false,
            known: Boolean(known),
        };
    });

    const addableSets = allSets.filter((entry) => !entry.stored);
    const unlockedCount = allSets.filter((entry) => entry.unlocked).length;

    return {
        allSets,
        storedRows,
        addableSets,
        storedSetKeys: storedSets,
        totalSetCount: allSets.length,
        unlockedCount,
        lockedCount: allSets.length - unlockedCount,
    };
};

const encodeStoredSets = (setKeys) => {
    const normalized = uniq(
        setKeys.map((setKey) => String(setKey ?? "").trim()).filter((setKey) => setKey.length > 0 && setKey !== "0")
    );
    return normalized.length > 0 ? ["0", ...normalized].join(",") : "0";
};

const readWithFallback = async (paths) => {
    let lastError = null;
    for (const path of paths) {
        try {
            return await readGga(path);
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError ?? new Error("Failed to read required game data");
};

const SmithyRow = ({ row, onRemove }) => {
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
                    "smithy-row",
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
                { class: "smithy-row__name-group" },
                span({ class: "feature-row__name" }, row.displayName || row.setKey),
                span({ class: "smithy-row__set-key" }, row.setKey)
            )
        ),
        span({ class: "feature-row__badge" }, () => (row.completedNow ? "EQUIPPED" : row.known ? "STORED" : "LEGACY")),
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

export const SmithyTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const currentStoredSetKeys = van.state([]);
    const smithyRows = van.state([]);
    const addOptions = van.state([]);
    const selectedAddSetKey = van.state("");
    const totalSetCount = van.state(0);
    const unlockedCount = van.state(0);
    const lockedCount = van.state(0);
    const storedCount = van.state(0);
    const addableCount = van.state(0);
    const writeWarning = van.state(null);
    const mutating = van.state(false);

    const { status: addStatus, run: runAdd } = useWriteStatus();
    let scrollEl = null;
    let loadSeq = 0;

    const applySmithyState = (rawLoadedData) => {
        const result = buildSmithyState(rawLoadedData);

        currentStoredSetKeys.val = [...result.storedSetKeys];
        smithyRows.val = result.storedRows;
        addOptions.val = result.addableSets;
        totalSetCount.val = result.totalSetCount;
        unlockedCount.val = result.unlockedCount;
        lockedCount.val = result.lockedCount;
        storedCount.val = result.storedRows.length;
        addableCount.val = result.addableSets.length;

        if (!result.addableSets.some((entry) => entry.setKey === selectedAddSetKey.val)) {
            selectedAddSetKey.val = result.addableSets[0]?.setKey ?? "";
        }

        writeWarning.val = null;
    };

    const load = async (showSpinner = true) => {
        const seq = ++loadSeq;
        if (showSpinner) loading.val = true;
        error.val = null;
        try {
            const [rawEquipSets, rawSetOrder, rawStoredSets, rawEquippedMain, rawEquippedExtra] = await Promise.all([
                readWithFallback(EQUIP_SETS_PATHS),
                readWithFallback(SET_ORDER_PATHS).catch(() => null),
                readGga(STORED_SETS_PATH),
                readGga(EQUIPPED_MAIN_PATH),
                readGga(EQUIPPED_EXTRA_PATH),
            ]);

            if (seq !== loadSeq) return;
            applySmithyState({
                rawEquipSets,
                rawSetOrder,
                rawStoredSets,
                rawEquippedMain,
                rawEquippedExtra,
            });
            data.val = { loaded: true };
        } catch (e) {
            if (seq !== loadSeq) return;
            error.val = e?.message ?? "Failed to load smithy data";
            data.val = null;
        } finally {
            if (showSpinner && seq === loadSeq) loading.val = false;
        }
    };

    const writeStoredSets = async (setKeys) => {
        writeWarning.val = null;
        try {
            await writeGga(STORED_SETS_PATH, encodeStoredSets(setKeys));
        } catch (e) {
            const msg = "Failed writing smithy sets. Smithy may be inconsistent. Press REFRESH to resync.";
            writeWarning.val = msg;
            throw new Error(e?.message ? `${msg} (${e.message})` : msg);
        }
    };

    const refreshAfterWrite = async () => {
        const prevTop = scrollEl?.scrollTop ?? 0;
        await load(false);
        requestAnimationFrame(() => {
            if (scrollEl) scrollEl.scrollTop = prevTop;
        });
    };

    const removeAtIndex = async (index) => {
        if (mutating.val) return;
        const current = [...currentStoredSetKeys.val];
        if (index < 0 || index >= current.length) return;

        mutating.val = true;
        try {
            const next = current.filter((_, i) => i !== index);
            await writeStoredSets(next);
            await refreshAfterWrite();
        } finally {
            mutating.val = false;
        }
    };
    removeAtIndex.isBusy = () => mutating.val;

    const addSelected = async () => {
        const setKey = selectedAddSetKey.val;
        if (!setKey || mutating.val) return;

        await runAdd(async () => {
            mutating.val = true;
            try {
                const current = [...currentStoredSetKeys.val];
                if (current.includes(setKey)) return;
                const next = [...current, setKey];
                await writeStoredSets(next);
                await refreshAfterWrite();
            } finally {
                mutating.val = false;
            }
        });
    };

    const addAllAvailable = async () => {
        if (mutating.val || addOptions.val.length === 0) return;
        const shouldContinue = window.confirm(
            "This will add every available set from the dropdown to smithy.\n\nAre you sure you want to continue?"
        );
        if (!shouldContinue) return;

        await runAdd(async () => {
            mutating.val = true;
            try {
                const current = [...currentStoredSetKeys.val];
                const toAdd = addOptions.val.map((entry) => entry.setKey).filter((setKey) => !current.includes(setKey));
                if (toAdd.length === 0) return;
                const next = [...current, ...toAdd];
                await writeStoredSets(next);
                await refreshAfterWrite();
            } finally {
                mutating.val = false;
            }
        });
    };

    load(true);

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        renderLoading: () => div({ class: "feature-loader" }, Loader()),
        renderError: (message) => EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: message }),
        isEmpty: () => totalSetCount.val === 0,
        renderEmpty: () =>
            EmptyState({
                icon: Icons.SearchX(),
                title: "NO SMITHY SETS",
                subtitle: "No armor set smithy definitions were found.",
            }),
        renderContent: () =>
            (() => {
                const root = div(
                    {
                        class: "smithy-scroll scrollable-panel",
                    },
                    () =>
                        writeWarning.val
                            ? div({ class: "warning-banner" }, Icons.Warning(), " ", writeWarning.val)
                            : null,

                    div(
                        { class: "smithy-section" },
                        div(
                            { class: "smithy-section__header" },
                            span({ class: "smithy-section__title" }, "ON SMITHY"),
                            span(
                                { class: "smithy-section__note" },
                                () => `${unlockedCount.val}/${totalSetCount.val} TOTAL`
                            )
                        ),
                        () => {
                            const rows = smithyRows.val;
                            if (rows.length === 0)
                                return div({ class: "smithy-empty" }, "No equipment sets currently stored.");

                            return div(
                                { class: "smithy-rows" },
                                ...rows.map((row) =>
                                    SmithyRow({
                                        row,
                                        onRemove: removeAtIndex,
                                    })
                                )
                            );
                        }
                    ),

                    div(
                        { class: "smithy-section" },
                        div(
                            { class: "smithy-section__header" },
                            span({ class: "smithy-section__title" }, "ADD EQUIPMENT SET"),
                            span({ class: "smithy-section__note" }, () => `${addableCount.val} AVAILABLE`)
                        ),
                        div(
                            {
                                class: () =>
                                    [
                                        "smithy-add-row",
                                        addStatus.val === "success" ? "flash-success" : "",
                                        addStatus.val === "error" ? "flash-error" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" "),
                            },
                            span({ class: "smithy-add-row__label" }, "SELECT SET"),
                            () =>
                                select(
                                    {
                                        class: "select-base smithy-add-row__select",
                                        value: selectedAddSetKey,
                                        onchange: (e) => (selectedAddSetKey.val = e.target.value),
                                    },
                                    ...(addOptions.val.length === 0
                                        ? [option({ value: "" }, "No equipment sets left to add")]
                                        : addOptions.val.map((entry) =>
                                              option({ value: entry.setKey }, `${entry.displayName} (${entry.setKey})`)
                                          ))
                                ),
                            button(
                                {
                                    class: () =>
                                        `feature-btn feature-btn--apply ${addStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                                    disabled: () =>
                                        mutating.val ||
                                        addStatus.val === "loading" ||
                                        !selectedAddSetKey.val ||
                                        addOptions.val.length === 0,
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
                                        mutating.val || addStatus.val === "loading" || addOptions.val.length === 0,
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
                h3({}, "SMITHY"),
                p(
                    { class: "feature-header__desc" },
                    "Manage Armor Set Smithy equipment sets. Remove stored sets, or add sets from the game list."
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
                            load(true);
                        },
                    },
                    "REFRESH"
                )
            )
        ),
        renderBody
    );
};
