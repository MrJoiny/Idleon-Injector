/**
 * W3 - Construction: Cogs Tab
 *
 * Data sources:
 *   gga.FlagUnlock[0..119]          - unlock/charge state per slot:
 *                                      0 = locked, positive = charging toward unlock, <= -11 = unlocked
 *   cList.FlagReqs[0..95]     - raw charge cap for each main-board slot;
 *                                      game multiplies by x25 to get the displayed cap
 *   gga.FlagsPlaced[0..N]           - array of slot indices where flags are placed;
 *                                      -1 marks an empty/cleared entry
 *   gga.CogOrder[0..251]            - cog or player name per game slot:
 *                                      board [0-95], player shelf [96-107],
 *                                      cog shelf [108-227], tiny cogs [228-251]
 *   gga.CogMap[0..251].h            - stat fields per slot (a-k); each key is a named bonus
 *
 * Side-rail UI slots (96-119) map to CogOrder[228-251] (tiny cog range).
 *
 * When locking/unlocking a slot that has a flag, the corresponding FlagsPlaced
 * entry must also be cleared (set to -1) to prevent the flag-charge system from
 * overwriting the -11 sentinel and re-locking the slot.
 *
 * Locking is blocked whenever a cog or player occupies the slot (CogOrder != "Blank").
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputed, gga, readCList } from "../../../../services/api.js";
import { Cogs } from "../../../../assets/cogs.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { formatNumber, parseNumber } from "../../../../utils/numberFormat.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { useAccountLoadState } from "../accountLoadPolicy.js";
import { toNum, useWriteStatus, writeVerified } from "../featureShared.js";

const { div, button, span, h3, input } = van.tags;
const { svg, path, line: svgLine } = van.tags("http://www.w3.org/2000/svg");

const FlagIcon = (props = {}) =>
    svg(
        {
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            "stroke-width": "2",
            "stroke-linecap": "round",
            "stroke-linejoin": "round",
            ...props,
        },
        path({ d: "M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" }),
        svgLine({ x1: "4", y1: "22", x2: "4", y2: "15" })
    );

const MAIN_COLS = 12;
const MAIN_ROWS = 8;
const MAIN_SLOT_COUNT = MAIN_COLS * MAIN_ROWS; // 96
const SIDE_SLOT_COUNT = 12;
const LEFT_SIDE_START = MAIN_SLOT_COUNT; // 96
const RIGHT_SIDE_START = LEFT_SIDE_START + SIDE_SLOT_COUNT; // 108
const TOTAL_SLOT_COUNT = MAIN_SLOT_COUNT + SIDE_SLOT_COUNT * 2; // 120

const UNLOCKED_SENTINEL = -11;
// CogOrder[228..251] = tiny cog slots (24 slots), mapped to side-rail UI indices 96..119
const COGORDER_SIDE_START = 228;

const POPOVER_WIDTH = 420;
const POPOVER_HEIGHT = 520;
const POPOVER_GAP = 4;

const PREMIUM_COG_IDS = new Set(["CogY", "CogZA00", "CogZA01", "CogZA02", "CogZA03"]);
const COG_MAP_FIELD_ORDER = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];
const COG_MAP_FIELD_META = {
    a: { keyName: "_Build_Rate/HR", meaning: "Flat build rate" },
    b: { keyName: "_Construct_Exp/HR", meaning: "Flat construction EXP/hr" },
    c: { keyName: "_Flaggy_Rate/HR", meaning: "Flat flaggy rate" },
    d: { keyName: "%_Bonus_Construct_EXP", meaning: "% bonus construction EXP" },
    e: { keyName: "%_Build_Rate", meaning: "% build rate" },
    f: { keyName: "%_Player_Construct_XP", meaning: "% player construction XP" },
    g: { keyName: "%_Flaggy_Rate", meaning: "% flaggy rate" },
    h: { keyName: "shape / surround pattern", meaning: "Area/target pattern for the percent effect" },
    i: { keyName: "internal board marker", meaning: "Internal marker used during board recompute" },
    j: { keyName: "%_Speed_to_Flags", meaning: "% speed to flags" },
    k: { keyName: "%_Nothing_sowwy", meaning: "Junk/placeholder stat ('Nothing sowwy')" },
};
const isMainSlot = (index) => index >= 0 && index < MAIN_SLOT_COUNT;
const isSideSlot = (index) => index >= MAIN_SLOT_COUNT && index < TOTAL_SLOT_COUNT;
const TINY_COG_TYPES = new Set(["_", "a", "b"]);
const renderCogSvg = (id, className) => {
    const SvgCog = Cogs[id];
    if (typeof SvgCog !== "function") return new Text("");
    return SvgCog({
        class: className,
        width: "100%",
        height: "100%",
        preserveAspectRatio: "xMidYMid meet",
    });
};

/**
 * Map a UI slot index to its CogOrder game-array index.
 * Main board (UI 0-95) -> CogOrder[0-95]
 * Side rails (UI 96-119) -> CogOrder[228-251]
 */
const getCogOrderIndex = (uiIndex) =>
    uiIndex < MAIN_SLOT_COUNT ? uiIndex : COGORDER_SIDE_START + (uiIndex - MAIN_SLOT_COUNT);

const getTinyTier = (cogId) => {
    const id = String(cogId ?? "");
    if (!id.startsWith("CogSm")) return null;
    const tier = Number(id.substring(6));
    return Number.isFinite(tier) ? tier : null;
};

const getTinyTypeCode = (cogId) => {
    const id = String(cogId ?? "");
    return id.startsWith("CogSm") ? id.charAt(5) || null : null;
};

const cloneCogMapStats = (entry) => {
    if (!entry || typeof entry !== "object" || !entry.h || typeof entry.h !== "object") return {};
    const out = {};
    for (const key of Object.keys(entry.h)) {
        out[key] = entry.h[key];
    }
    return out;
};

const getSlotState = (rawValue) => {
    const val = toNum(rawValue);
    if (val <= UNLOCKED_SENTINEL) return "unlocked";
    if (val === 0) return "locked";
    return "charging";
};

const getSlotName = (index) => {
    if (isMainSlot(index)) {
        const row = Math.floor(index / MAIN_COLS) + 1;
        const col = index % MAIN_COLS;
        const letter = String.fromCharCode(65 + col); // A..L
        return `${letter}-${row}`;
    }

    if (index >= LEFT_SIDE_START && index < TOTAL_SLOT_COUNT) {
        return `Z-${index - LEFT_SIDE_START + 1}`;
    }

    return `SLOT-${index}`;
};

// FlagReq formula for main slots: 25 * cList.FlagReqs[index]
// FlagReq formula for side slots (index >= 96):
//   5e6 * (1 + min(9, 9*(b-96)) + max(0, 10*(b-97))) * 4^(b-96)
// Source: p._customBlock_WorkbenchStuff("FlagReq", b, e) - game line 12134
const getSideSlotCap = (index) => {
    const r0 = Math.round(index - 96);
    const r1 = Math.round(index - 97);
    return Math.round(5e6 * (1 + Math.min(9, 9 * r0) + Math.max(0, 10 * r1)) * Math.pow(4, r0));
};

const formatMainCharge = (rawValue, rawCap) => {
    const state = getSlotState(rawValue);
    const cap = Math.max(0, Math.round(toNum(rawCap) * 25));
    const capLabel = cap > 0 ? formatNumber(cap) : "?";
    const cur = state === "locked" ? 0 : Math.max(0, Math.round(toNum(rawValue)));
    return `${formatNumber(cur)} / ${capLabel}`;
};

const formatSideCharge = (rawValue, index) => {
    const cur = Math.max(0, Math.round(toNum(rawValue)));
    const cap = getSideSlotCap(index);
    return `${formatNumber(cur)} / ${formatNumber(cap)}`;
};

const stateLabel = (state) => {
    if (state === "unlocked") return "UNLOCKED";
    if (state === "locked") return "LOCKED";
    return "UNLOCKING";
};

export const CogsTab = () => {
    const { loading, error, run } = useAccountLoadState({ label: "Cogs" });

    const selectedSlot = van.state(0);
    const activeSlot = van.state(null);
    const popupPos = van.state({ left: 24, top: 24, maxHeight: POPOVER_HEIGHT });
    const slotValues = Array.from({ length: TOTAL_SLOT_COUNT }, () => van.state(0));
    const slotCaps = Array.from({ length: MAIN_SLOT_COUNT }, () => van.state(0));
    const flaggedSlots = van.state(new Set());
    // Raw FlagsPlaced array - each entry is a slot UI index (or -1 for an empty entry).
    const flagsRaw = van.state([]);
    // CogOrder name per UI slot (e.g. "Cog0A00", "Player_name", "Blank")
    const cogOrders = Array.from({ length: TOTAL_SLOT_COUNT }, () => van.state("Blank"));
    // CogMap[slot].h stats per UI slot
    const cogMapStats = Array.from({ length: TOTAL_SLOT_COUNT }, () => van.state({}));
    const activeCogName = van.state("Blank");
    const activeCogNameStatus = van.state("idle");
    const cogNameCache = new Map();
    let activeCogNameRequestId = 0;
    const tinyTypeInput = van.state("_");
    const tinyTierInput = van.state("0");

    const { status: lockStatus, run: runLockWrite, clearStatus: clearLockStatus } = useWriteStatus();

    const { status: cogMapWriteStatus, run: runCogMapWrite } = useWriteStatus();
    const { status: tinyWriteStatus, run: runTinyWrite, clearStatus: clearTinyWriteStatus } = useWriteStatus();
    const getActiveIndex = () => (activeSlot.val === null ? selectedSlot.val : activeSlot.val);

    const syncTinyInputsFromSlot = (index) => {
        if (!isSideSlot(index)) return;
        const cogId = String(cogOrders[index].val ?? "Blank");
        const typeCode = getTinyTypeCode(cogId);
        const tier = getTinyTier(cogId);
        tinyTypeInput.val = TINY_COG_TYPES.has(typeCode) ? typeCode : "_";
        tinyTierInput.val = String(Math.max(0, Math.min(9, Number.isFinite(tier) ? tier : 0)));
    };

    const resolveCogName = async (cogId) => {
        const id = String(cogId ?? "Blank");
        if (!id || id === "Blank") return "Blank";
        if (id.startsWith("Player_")) return id.substring("Player_".length) || id;
        if (cogNameCache.has(id)) return cogNameCache.get(id);
        const computedName = await readComputed("runCodeType", id, []);
        const parsedName = computedName ? String(computedName).replaceAll("_", " ") : id;
        cogNameCache.set(id, parsedName);
        return parsedName;
    };

    const refreshActiveCogName = async (index) => {
        const reqId = ++activeCogNameRequestId;
        const cogId = String(cogOrders[index].val ?? "Blank");
        activeCogName.val = cogId;
        activeCogNameStatus.val = "loading";
        try {
            const name = await resolveCogName(cogId);
            if (reqId !== activeCogNameRequestId) return;
            activeCogName.val = name;
            activeCogNameStatus.val = "success";
        } catch {
            if (reqId !== activeCogNameRequestId) return;
            activeCogName.val = cogId;
            activeCogNameStatus.val = "error";
        }
    };

    const load = async () =>
        run(async () => {
            const [rawUnlock, rawCaps, rawFlags, rawCogOrder, rawCogMap] = await Promise.all([
                gga("FlagUnlock"),
                readCList("FlagReqs"),
                gga("FlagsPlaced"),
                gga("CogOrder"),
                gga("CogMap"),
            ]);

            const unlockArr = toIndexedArray(rawUnlock ?? []);
            const capArr = toIndexedArray(rawCaps ?? []);
            const flagsArr = toIndexedArray(rawFlags ?? []);
            const cogOrderArr = toIndexedArray(rawCogOrder ?? []);
            const cogMapArr = toIndexedArray(rawCogMap ?? []);
            const nextSlotValues = Array.from({ length: TOTAL_SLOT_COUNT }, (_, i) => toNum(unlockArr[i]));
            const nextSlotCaps = Array.from({ length: MAIN_SLOT_COUNT }, (_, i) => toNum(capArr[i]));
            const nextFlagsRaw = [...flagsArr];
            const nextFlaggedSlots = new Set(nextFlagsRaw.map((v) => toNum(v)).filter((v) => v >= 0));
            const nextCogOrders = Array.from({ length: TOTAL_SLOT_COUNT }, (_, i) => {
                const cogIdx = getCogOrderIndex(i);
                return cogOrderArr[cogIdx] ?? "Blank";
            });
            const nextCogMapStats = Array.from({ length: TOTAL_SLOT_COUNT }, (_, i) => {
                const cogIdx = getCogOrderIndex(i);
                return cloneCogMapStats(cogMapArr[cogIdx]);
            });

            for (let i = 0; i < TOTAL_SLOT_COUNT; i++) {
                slotValues[i].val = nextSlotValues[i];
                cogOrders[i].val = nextCogOrders[i];
                cogMapStats[i].val = nextCogMapStats[i];
            }
            for (let i = 0; i < MAIN_SLOT_COUNT; i++) slotCaps[i].val = nextSlotCaps[i];

            flaggedSlots.val = nextFlaggedSlots;
            flagsRaw.val = nextFlagsRaw;
            if (activeSlot.val !== null) {
                void refreshActiveCogName(activeSlot.val);
                syncTinyInputsFromSlot(activeSlot.val);
            }
        });

    const setSlotLockState = async (index, unlock) => {
        const next = unlock ? UNLOCKED_SENTINEL : 0;
        await runLockWrite(async () => {
            const unlockPath = `FlagUnlock[${index}]`;
            await writeVerified(unlockPath, next, { message: `Write mismatch at ${unlockPath}: expected ${next}` });
            slotValues[index].val = next;

            // If a flag is placed on this slot, clear its FlagsPlaced entry to prevent
            // the flag-charge system from overwriting the -11 sentinel and re-locking the slot.
            if (flaggedSlots.val.has(index)) {
                const arr = flagsRaw.val;
                const pos = arr.findIndex((v) => toNum(v) === index);
                if (pos >= 0) {
                    const flagPath = `FlagsPlaced[${pos}]`;
                    await writeVerified(flagPath, -1, { message: `Write mismatch at ${flagPath}: expected -1` });
                    const newRaw = [...arr];
                    newRaw[pos] = -1;
                    flagsRaw.val = newRaw;
                    const newFlagged = new Set(flaggedSlots.val);
                    newFlagged.delete(index);
                    flaggedSlots.val = newFlagged;
                }
            }
        });
    };

    const setCogMapField = async (field, rawValue) => {
        const index = getActiveIndex();
        const cogIdx = getCogOrderIndex(index);
        // parseNumber handles formatted strings like "50K" -> 50000
        const numVal = parseNumber(rawValue);
        const writeVal = numVal !== null ? numVal : rawValue;
        await runCogMapWrite(async () => {
            const writePath = `CogMap[${cogIdx}].h.${field}`;
            await writeVerified(writePath, writeVal, {
                message: `Write mismatch at ${writePath}: expected ${writeVal}`,
            });
            cogMapStats[index].val = { ...cogMapStats[index].val, [field]: writeVal };
        });
    };

    const setTinyCog = async () => {
        const index = getActiveIndex();
        if (!isSideSlot(index)) return;

        const slot = getCogOrderIndex(index);

        await runTinyWrite(async () => {
            const normalizedType = String(tinyTypeInput.val ?? "")
                .trim()
                .slice(0, 1);
            const normalizedTier = Math.max(0, Math.min(9, Number(tinyTierInput.val) || 0));
            if (!TINY_COG_TYPES.has(normalizedType)) {
                throw new Error('Tiny cog type must be "_", "a", or "b".');
            }
            const newId = `CogSm${normalizedType}${normalizedTier}`;

            const cogOrderPath = `CogOrder[${slot}]`;
            await writeVerified(cogOrderPath, newId, {
                message: `Write mismatch at ${cogOrderPath}: expected ${newId}`,
            });
            cogOrders[index].val = newId;
            tinyTypeInput.val = TINY_COG_TYPES.has(normalizedType) ? normalizedType : "_";
            tinyTierInput.val = String(Math.max(0, Math.min(9, Number.isFinite(normalizedTier) ? normalizedTier : 0)));
            void refreshActiveCogName(index);
        });
    };

    const renderTinyEditor = () => {
        const index = getActiveIndex();
        if (!isSideSlot(index)) return null;

        return div(
            { class: "cogs-tiny-editor" },
            div(
                {
                    class: () =>
                        [
                            "cogs-cog-stat-row",
                            tinyWriteStatus.val === "success" ? "feature-row--success" : "",
                            tinyWriteStatus.val === "error" ? "feature-row--error" : "",
                        ]
                            .filter(Boolean)
                            .join(" "),
                },
                div({ class: "cogs-cog-stat-row__code" }, "t"),
                div(
                    { class: "cogs-cog-stat-row__text" },
                    div({ class: "cogs-cog-stat-row__name" }, "Tiny Type"),
                    div({ class: "cogs-cog-stat-row__meaning" }, "Allowed values: _, a, b")
                ),
                div(
                    { class: "cogs-cog-stat-row__edit" },
                    input({
                        type: "text",
                        class: "cogs-cog-stat-input",
                        maxLength: 1,
                        value: () => tinyTypeInput.val,
                        oninput: (e) => {
                            tinyTypeInput.val = String(e.target.value ?? "")
                                .trim()
                                .slice(0, 1);
                        },
                    }),
                    button(
                        {
                            type: "button",
                            class: () =>
                                `cogs-cog-stat-set-btn feature-btn feature-btn--apply${tinyWriteStatus.val === "loading" ? " feature-btn--loading" : ""}`,
                            disabled: () => tinyWriteStatus.val === "loading",
                            onclick: () => setTinyCog(),
                        },
                        "SET"
                    )
                )
            ),
            div(
                {
                    class: () =>
                        [
                            "cogs-cog-stat-row",
                            tinyWriteStatus.val === "success" ? "feature-row--success" : "",
                            tinyWriteStatus.val === "error" ? "feature-row--error" : "",
                        ]
                            .filter(Boolean)
                            .join(" "),
                },
                div({ class: "cogs-cog-stat-row__code" }, "lvl"),
                div(
                    { class: "cogs-cog-stat-row__text" },
                    div({ class: "cogs-cog-stat-row__name" }, "Tiny Tier"),
                    div({ class: "cogs-cog-stat-row__meaning" }, "Range: 0 to 9")
                ),
                div(
                    { class: "cogs-cog-stat-row__edit" },
                    input({
                        type: "number",
                        class: "cogs-cog-stat-input",
                        min: "0",
                        max: "9",
                        step: "1",
                        value: () => tinyTierInput.val,
                        oninput: (e) => {
                            tinyTierInput.val = String(e.target.value ?? "");
                        },
                    }),
                    button(
                        {
                            type: "button",
                            class: () =>
                                `cogs-cog-stat-set-btn feature-btn feature-btn--apply${tinyWriteStatus.val === "loading" ? " feature-btn--loading" : ""}`,
                            disabled: () => tinyWriteStatus.val === "loading",
                            onclick: () => setTinyCog(),
                        },
                        "SET"
                    )
                )
            )
        );
    };

    const computePopupPos = (mouseX, mouseY) => {
        const vw = window.innerWidth || 1280;
        const vh = window.innerHeight || 720;

        // Horizontal: right of cursor, flip left only if it would overflow.
        let left = mouseX + POPOVER_GAP;
        if (left + POPOVER_WIDTH > vw) {
            left = Math.max(0, mouseX - POPOVER_WIDTH - POPOVER_GAP);
        }

        // Vertical: always open BELOW the cursor and stay as close as possible.
        // Shift the top upward only as far as needed to keep MIN_VISIBLE pixels
        // on screen - never jump all the way to the top of the viewport.
        // The popup body has overflow-y:auto so content beyond maxHeight scrolls.
        const MIN_VISIBLE = 200;
        let top = mouseY + POPOVER_GAP;
        const maxAllowedTop = Math.max(0, vh - MIN_VISIBLE);
        if (top > maxAllowedTop) top = maxAllowedTop;

        const maxHeight = Math.max(MIN_VISIBLE, vh - top - POPOVER_GAP);

        return { left, top, maxHeight };
    };

    const openSlotPopup = (index, event) => {
        const mouseX = event?.clientX ?? 0;
        const mouseY = event?.clientY ?? 0;
        selectedSlot.val = index;
        popupPos.val = computePopupPos(mouseX, mouseY);
        activeSlot.val = index;
        clearLockStatus();
        clearTinyWriteStatus();
        syncTinyInputsFromSlot(index);
        void refreshActiveCogName(index);
    };

    const closeSlotPopup = () => {
        activeSlot.val = null;
        clearLockStatus();
        clearTinyWriteStatus();
    };

    const renderCogOverlay = (index) => {
        const order = cogOrders[index].val;
        if (!order || order === "Blank") return new Text("");
        if (order.startsWith("Player_")) {
            return renderCogSvg("headBIG", "cogs-slot-cog");
        }
        return renderCogSvg(order, "cogs-slot-cog");
    };

    const renderSlotBackground = (index) => {
        const state = getSlotState(slotValues[index].val);
        const id = isMainSlot(index)
            ? state === "unlocked"
                ? "CogSq1"
                : "CogSq0"
            : state === "unlocked"
              ? "CogSq_S1"
              : "CogSq_S0";
        return renderCogSvg(id, "cogs-slot-bg");
    };

    const renderSlot = (index, sizeClass) =>
        button(
            {
                type: "button",
                class: () => {
                    const state = getSlotState(slotValues[index].val);
                    return [
                        "cogs-slot",
                        sizeClass,
                        `cogs-slot--${state}`,
                        activeSlot.val === index && "cogs-slot--selected",
                    ]
                        .filter(Boolean)
                        .join(" ");
                },
                onclick: (e) => openSlotPopup(index, e),
                title: () => `${getSlotName(index)} (Index ${index})`,
            },
            () => renderSlotBackground(index),
            () => renderCogOverlay(index),
            () =>
                flaggedSlots.val.has(index)
                    ? renderCogSvg(isMainSlot(index) ? "CogFLflag" : "CogFLflagS1", "cogs-slot-flag")
                    : new Text("")
        );

    const leftRail = div(
        { class: "cogs-side-grid cogs-side-grid--left" },
        ...Array.from({ length: SIDE_SLOT_COUNT }, (_, i) => renderSlot(LEFT_SIDE_START + i, "cogs-slot--small"))
    );

    const mainGrid = div(
        { class: "cogs-main-grid" },
        ...Array.from({ length: MAIN_SLOT_COUNT }, (_, i) => renderSlot(i, "cogs-slot--main"))
    );

    const rightRail = div(
        { class: "cogs-side-grid cogs-side-grid--right" },
        ...Array.from({ length: SIDE_SLOT_COUNT }, (_, i) => renderSlot(RIGHT_SIDE_START + i, "cogs-slot--small"))
    );

    const boardPane = div(
        { class: "cogs-scroll scrollable-panel" },
        div(
            { class: "cogs-board-shell" },
            div({ class: "cogs-board-content" }, div({ class: "cogs-board-layout" }, leftRail, mainGrid, rightRail))
        )
    );

    const popupCard = div(
        {
            class: "cogs-popup",
            onclick: (e) => e.stopPropagation(),
        },
        // ---- Header: slot coords + cog name + state badge -----------------
        div(
            { class: "cogs-modal-header" },
            div(
                { class: "cogs-modal-header-left" },
                h3({}, () => getSlotName(getActiveIndex())),
                span(
                    {
                        class: () => {
                            const status = activeCogNameStatus.val;
                            const name = activeCogName.val;
                            const hidden = status !== "loading" && (!name || name === "Blank");
                            return `cogs-modal-cog-name${hidden ? " cogs-modal-cog-name--hidden" : ""}`;
                        },
                    },
                    () => (activeCogNameStatus.val === "loading" ? "..." : activeCogName.val || "")
                )
            ),
            span(
                {
                    class: () =>
                        `cogs-selection-state cogs-selection-state--${getSlotState(slotValues[getActiveIndex()].val)}`,
                },
                () => stateLabel(getSlotState(slotValues[getActiveIndex()].val))
            )
        ),
        // ---- Body ----------------------------------------------------------
        div({ class: "cogs-modal-body" }, () => {
            const index = getActiveIndex();
            const slotState = getSlotState(slotValues[index].val);
            const showMainMode = isMainSlot(index);
            const isUnlocked = slotState === "unlocked";
            const stats = cogMapStats[index].val ?? {};
            const cogId = String(cogOrders[index].val ?? "Blank");
            const readOnly = cogId.startsWith("Player_") || PREMIUM_COG_IDS.has(cogId);
            const presentKeys = COG_MAP_FIELD_ORDER.filter((key) => Object.prototype.hasOwnProperty.call(stats, key));

            const statsNode = !presentKeys.length
                ? div({ class: "cogs-cog-stats__empty" }, "No CogMap.h values on this slot.")
                : div(
                      { class: "cogs-cog-stats__list" },
                      ...presentKeys.map((key) => {
                          const rawVal = stats[key];
                          const displayVal = rawVal !== null && rawVal !== undefined ? formatNumber(rawVal) : "";
                          const inputEl = input({
                              type: "text",
                              class: "cogs-cog-stat-input",
                              value: displayVal,
                              disabled: readOnly,
                          });
                          return div(
                              {
                                  class: () =>
                                      [
                                          "cogs-cog-stat-row",
                                          cogMapWriteStatus.val === "success" ? "feature-row--success" : "",
                                          cogMapWriteStatus.val === "error" ? "feature-row--error" : "",
                                      ]
                                          .filter(Boolean)
                                          .join(" "),
                              },
                              div({ class: "cogs-cog-stat-row__code" }, key),
                              div(
                                  { class: "cogs-cog-stat-row__text" },
                                  div({ class: "cogs-cog-stat-row__name" }, COG_MAP_FIELD_META[key]?.keyName ?? key),
                                  div(
                                      { class: "cogs-cog-stat-row__meaning" },
                                      COG_MAP_FIELD_META[key]?.meaning ?? "Unknown field"
                                  )
                              ),
                              div(
                                  { class: "cogs-cog-stat-row__edit" },
                                  inputEl,
                                  button(
                                      {
                                          type: "button",
                                          class: () =>
                                              "cogs-cog-stat-set-btn feature-btn feature-btn--apply" +
                                              (cogMapWriteStatus.val === "loading" ? " feature-btn--loading" : ""),
                                          disabled: () => readOnly || cogMapWriteStatus.val === "loading",
                                          onclick: () => setCogMapField(key, inputEl.value),
                                      },
                                      "SET"
                                  )
                              )
                          );
                      })
                  );

            return div(
                {},
                !isUnlocked
                    ? div(
                          { class: "cogs-selection-charge" },
                          span({ class: "cogs-selection-charge__label" }, "Charge"),
                          span(
                              { class: "cogs-selection-charge__value" },
                              showMainMode
                                  ? formatMainCharge(slotValues[index].val, slotCaps[index].val)
                                  : formatSideCharge(slotValues[index].val, index)
                          )
                      )
                    : null,
                flaggedSlots.val.has(index)
                    ? div(
                          { class: "cogs-flag-indicator" },
                          FlagIcon({ class: "cogs-flag-indicator__icon", width: "14", height: "14" }),
                          span("FLAG PLACED")
                      )
                    : null,
                !showMainMode && isUnlocked ? renderTinyEditor() : null,
                showMainMode && isUnlocked
                    ? div(
                          {
                              class: "cogs-modal-details",
                          },
                          div(
                              { class: "cogs-cog-stats" },
                              div(
                                  { class: "cogs-cog-stats__warning" },
                                  "Base values shown - final in-game values are influenced by surrounding cogs."
                              ),
                              statsNode
                          )
                      )
                    : null
            );
        }),
        // ---- Footer --------------------------------------------------------
        div(
            { class: "cogs-modal-footer" },
            div(
                {
                    class: () =>
                        [
                            "cogs-selection-actions",
                            lockStatus.val === "success" ? "feature-row--success" : "",
                            lockStatus.val === "error" ? "feature-row--error" : "",
                        ]
                            .filter(Boolean)
                            .join(" "),
                },
                button(
                    {
                        type: "button",
                        class: () =>
                            `feature-btn feature-btn--danger ${lockStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        // Block lock if: already locked, or a cog/player occupies the slot
                        disabled: () => {
                            const index = getActiveIndex();
                            const cogId = String(cogOrders[index].val ?? "Blank");
                            return (
                                lockStatus.val === "loading" ||
                                getSlotState(slotValues[index].val) === "locked" ||
                                cogId !== "Blank"
                            );
                        },
                        onclick: () => setSlotLockState(getActiveIndex(), false),
                    },
                    "LOCK"
                ),
                button(
                    {
                        type: "button",
                        class: () =>
                            `feature-btn feature-btn--apply ${lockStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => {
                            const index = getActiveIndex();
                            return (
                                lockStatus.val === "loading" ||
                                getSlotState(slotValues[index].val) === "unlocked" ||
                                PREMIUM_COG_IDS.has(String(cogOrders[index].val ?? ""))
                            );
                        },
                        onclick: () => setSlotLockState(getActiveIndex(), true),
                    },
                    "UNLOCK"
                )
            ),
            div(
                { class: "cogs-modal-footer-right" },
                () =>
                    lockStatus.val
                        ? span(
                              { class: `cogs-write-status cogs-write-status--${lockStatus.val}` },
                              lockStatus.val === "loading"
                                  ? "SAVING..."
                                  : lockStatus.val === "success"
                                    ? "SAVED"
                                    : "WRITE FAILED"
                          )
                        : null,
                () =>
                    cogMapWriteStatus.val
                        ? span(
                              {
                                  class: `cogs-write-status cogs-write-status--${cogMapWriteStatus.val}`,
                              },
                              cogMapWriteStatus.val === "loading"
                                  ? "SAVING FIELD..."
                                  : cogMapWriteStatus.val === "success"
                                    ? "FIELD SAVED"
                                    : "FIELD WRITE FAILED"
                          )
                        : null,
                () =>
                    tinyWriteStatus.val
                        ? span(
                              {
                                  class: `cogs-write-status cogs-write-status--${tinyWriteStatus.val}`,
                              },
                              tinyWriteStatus.val === "loading"
                                  ? "SAVING TINY..."
                                  : tinyWriteStatus.val === "success"
                                    ? "TINY SAVED"
                                    : "TINY WRITE FAILED"
                          )
                        : null,
                button({ type: "button", class: "btn-secondary", onclick: closeSlotPopup }, "CLOSE")
            )
        )
    );

    const popup = div(
        {
            class: () => `cogs-popup-overlay ${activeSlot.val === null ? "cogs-popup-overlay--hidden" : ""}`,
            onclick: (e) => {
                if (e.target === e.currentTarget) closeSlotPopup();
            },
        },
        popupCard
    );

    van.derive(() => {
        popupCard.style.setProperty("--cogs-popup-left", `${popupPos.val.left}px`);
        popupCard.style.setProperty("--cogs-popup-top", `${popupPos.val.top}px`);
        popupCard.style.setProperty("--cogs-popup-max-height", `${popupPos.val.maxHeight}px`);
    });

    load();

    // Mount the popup overlay directly on document.body so that position:fixed
    // is always relative to the true viewport, regardless of any CSS transforms
    // (transform/filter/perspective) that may exist on ancestor elements in the
    // injected UI hierarchy.
    van.add(document.body, popup);

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "CONSTRUCTION - COGS",
            description: "Click a slot to view details and edit CogMap fields.",
            actions: button({ class: "btn-secondary", onclick: load }, "REFRESH"),
        }),
        persistentState: { loading, error },
        body: boardPane,
    });
};
