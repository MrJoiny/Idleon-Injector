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
import { gga } from "../../../../services/api.js";
import { Icons } from "../../../../assets/icons.js";
import { AccountSection } from "../components/AccountSection.js";
import { AddFromListSection } from "../components/AddFromListSection.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { RemovableStoredRow } from "../components/RemovableStoredRow.js";
import { unwrapH, useWriteStatus, writeVerified } from "../accountShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div } = van.tags;

const EQUIP_SETS_PATHS = ["CustomMaps.h.EquipmentSets", "CustomMaps.EquipmentSets"];
const SET_ORDER_PATHS = ["CustomLists.h.RANDOlist[113]", "CustomLists.RANDOlist[113]"];
const STORED_SETS_PATH = "OptionsListAccount[379]";
const EQUIPPED_MAIN_PATH = "EquipmentOrder[0]";
const EQUIPPED_EXTRA_PATH = "EquipmentOrder[1]";

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

const normalizeStoredSetKeys = (rawOrList) => {
    if (Array.isArray(rawOrList)) {
        return uniq(
            rawOrList.map((entry) => String(entry ?? "").trim()).filter((entry) => entry.length > 0 && entry !== "0")
        );
    }
    return uniq(parseStoredSets(rawOrList));
};

const toObject = (raw) => {
    const value = unwrapH(raw);
    return value && typeof value === "object" ? value : {};
};

const isSetCompletedNow = (setKey, equipSets, equippedMainSet, equippedExtraSet) => {
    const setData = toIndexedArray(unwrapH(equipSets?.[setKey]) ?? []);
    if (!Array.isArray(setData) || setData.length === 0) return false;

    const mainParts = normalizeStringList(unwrapH(setData[0]));
    const extraParts = normalizeStringList(unwrapH(setData[1]));
    const optionalParts = normalizeStringList(unwrapH(setData[2]));
    const meta = toIndexedArray(unwrapH(setData[3]) ?? []);

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
            return await gga(path);
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError ?? new Error("Failed to read required game data");
};

const SmithyRow = ({ row, onRemove }) => {
    return RemovableStoredRow({
        index: row.index,
        primaryLabel: row.displayName,
        fallbackLabel: row.setKey,
        secondaryLabel: row.setKey,
        badge: () => (row.completedNow ? "EQUIPPED" : row.known ? "STORED" : "LEGACY"),
        rowClass: "smithy-row",
        nameGroupClass: "smithy-row__name-group",
        onRemove,
        isBusy: onRemove.isBusy,
    });
};

export const SmithyTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Smithy" });
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

    const load = async () => {
        return run(async () => {
            const [rawEquipSets, rawSetOrder, rawStoredSets, rawEquippedMain, rawEquippedExtra] = await Promise.all([
                readWithFallback(EQUIP_SETS_PATHS),
                readWithFallback(SET_ORDER_PATHS),
                gga(STORED_SETS_PATH),
                gga(EQUIPPED_MAIN_PATH),
                gga(EQUIPPED_EXTRA_PATH),
            ]);

            applySmithyState({
                rawEquipSets,
                rawSetOrder,
                rawStoredSets,
                rawEquippedMain,
                rawEquippedExtra,
            });
        });
    };

    const writeStoredSets = async (setKeys) => {
        writeWarning.val = null;
        const expectedSetKeys = normalizeStoredSetKeys(setKeys);
        try {
            await writeVerified(STORED_SETS_PATH, encodeStoredSets(expectedSetKeys));
        } catch (e) {
            const msg = "Failed writing smithy sets. Smithy may be inconsistent. Press REFRESH to resync.";
            writeWarning.val = msg;
            throw new Error(e?.message ? `${msg} (${e.message})` : msg);
        }
    };

    const refreshAfterWrite = async () => {
        const prevTop = scrollEl?.scrollTop ?? 0;
        await load();
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

    load();

    const body = div(
        {
            class: "scrollable-panel content-stack",
        },
        () => (writeWarning.val ? div({ class: "warning-banner" }, Icons.Warning(), " ", writeWarning.val) : null),

        AddFromListSection({
            title: "ADD EQUIPMENT SET",
            note: () => `${addableCount.val} AVAILABLE`,
            selectLabel: "SELECT SET",
            selectedValue: selectedAddSetKey,
            options: addOptions,
            emptyOptionLabel: "No equipment sets left to add",
            getOptionValue: (entry) => entry.setKey,
            getOptionLabel: (entry) => `${entry.displayName} (${entry.setKey})`,
            addStatus,
            addDisabled: () => mutating.val || !selectedAddSetKey.val || addOptions.val.length === 0,
            addAllDisabled: () => mutating.val || addOptions.val.length === 0,
            onAdd: addSelected,
            onAddAll: addAllAvailable,
        }),

        AccountSection({
            title: "ON SMITHY",
            note: () => `${unlockedCount.val}/${totalSetCount.val} TOTAL`,
            body: () => {
                const rows = smithyRows.val;
                return div(
                    { class: "smithy-rows" },
                    ...rows.map((row) =>
                        SmithyRow({
                            row,
                            onRemove: removeAtIndex,
                        })
                    )
                );
            },
        })
    );
    scrollEl = body;

    return PersistentAccountListPage({
        title: "SMITHY",
        description: "Manage Armor Set Smithy equipment sets. Remove stored sets, or add sets from the game list.",
        actions: RefreshButton({
            onRefresh: () => {
                if (mutating.val) return;
                load();
            },
            disabled: () => loading.val || mutating.val,
        }),
        state: { loading, error },
        loadingText: "READING SMITHY",
        errorTitle: "SMITHY READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body,
    });
};
