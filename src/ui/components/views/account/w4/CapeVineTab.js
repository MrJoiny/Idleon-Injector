/**
 * W4 - Cape Vine Tab
 *
 * Reverse-engineered from:
 *   gga.Spelunk[54] - cape ids on the vine, in vine order
 *   gga.Cards[1] - slab history item ids
 *   gga.OptionsListAccount[669] - Golden Vine milestones bought
 *   gga.BundlesReceived.h.ban_o - Cathie pack, adds 3 Golden Vines
 *   gga.ItemDefinitionsGET.h - item definitions map
 *
 * Golden Vines owned = 1 + OLA[669] + 3 * ban_o; the first that many vine slots are golden.
 * Eligible capes match the game's vine scan: typeGen === "aCape", lvReqToCraft !== 69420,
 * never "EquipmentCape1" (the dev cape, which flags non-dev saves).
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga } from "../../../../services/api.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { AccountSection } from "../components/AccountSection.js";
import { AccountRow } from "../components/AccountRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import {
    cleanName,
    createStaticRowReconciler,
    resolveNumberInput,
    unwrapH,
    useWriteStatus,
    writeVerified,
} from "../accountShared.js";
import { toIndexedArray } from "../../../../utils/index.js";

const { div, span } = van.tags;

const VINE_PATH = "Spelunk[54]";
const SLAB_HISTORY_PATH = "Cards[1]";
const MILESTONES_PATH = "OptionsListAccount[669]";
const PACK_PATH = "BundlesReceived.h.ban_o";
const ITEM_DEFS_PATH = "ItemDefinitionsGET.h";
const DEV_CAPE_ID = "EquipmentCape1";

const STATUS_TEXT = { loading: "Saving", success: "Saved", error: "Action failed" };

const readIdList = async (path, label) => {
    const raw = await gga(path);
    if (!raw || typeof raw !== "object") throw new Error(`${label} is unavailable. Enter the game and refresh.`);
    return toIndexedArray(raw)
        .map((entry) => String(entry ?? "").trim())
        .filter((entry) => entry.length > 0);
};

const readVine = () => readIdList(VINE_PATH, "Cape vine");

const readMilestones = async () => {
    const raw = await gga(MILESTONES_PATH);
    // Untouched account options read as 0, null, undefined, or "".
    const value = raw === null || raw === undefined || raw === "" ? 0 : Number(raw);
    if (!Number.isInteger(value) || value < 0) throw new Error(`Unexpected Golden Vine milestone value: ${raw}`);
    return value;
};

export const CapeVineTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Cape Vine" });
    const vineIds = van.state([]);
    const capes = van.state([]);
    const packVines = van.state(0);
    const goldenOwned = van.state(1);
    const busy = van.state(false);
    const outOfRange = van.state(false);
    const addAll = useWriteStatus();
    const rowStates = new Map();
    const listNode = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const minGolden = () => 1 + packVines.val;
    const maxGolden = () => capes.val.length;
    const vineIndex = van.derive(() => new Map(vineIds.val.map((itemId, index) => [itemId, index]).reverse()));
    const onVineCount = () => capes.val.filter((cape) => vineIndex.val.has(cape.itemId)).length;
    const cannotWrite = () => loading.val || busy.val || Boolean(error.val);

    const applyVine = (vine) => {
        vineIds.val = vine;
        const onVine = new Set(vine);
        const order = [
            ...vine.filter((itemId, index) => rowStates.has(itemId) && vine.indexOf(itemId) === index),
            ...capes.val.map((cape) => cape.itemId).filter((itemId) => !onVine.has(itemId)),
        ];
        reconcileRows(order.join("|"), () => order.map((itemId) => rowStates.get(itemId).node));
    };

    // Second click of a double-click lands on whichever row moved under the pointer.
    const isRepeatClick = (event) => event?.detail > 1;

    const mutate = async (status, task) => {
        if (cannotWrite()) return;
        // Saving disables the button and the row may move, so the browser drops focus; give it back.
        const focused = document.activeElement;
        busy.val = true;
        try {
            await status.run(async () => {
                try {
                    return await task(await readVine());
                } catch (caughtError) {
                    applyVine(await readVine());
                    throw caughtError;
                }
            });
        } finally {
            busy.val = false;
            // VanJS re-enables the button on its next render tick.
            setTimeout(() => {
                if (focused?.isConnected && document.activeElement === document.body) focused.focus();
            });
        }
    };

    const appendToVine = async (vine, itemIds) => {
        if (itemIds.some((itemId) => !rowStates.has(itemId))) throw new Error("Refusing to add an ineligible cape");
        for (let i = 0; i < itemIds.length; i++) {
            await writeVerified(`${VINE_PATH}[${vine.length + i}]`, itemIds[i]);
        }
        await writeVerified(`${VINE_PATH}.length`, vine.length + itemIds.length);
        applyVine([...vine, ...itemIds]);
    };

    const addCape = (itemId, event) => {
        if (isRepeatClick(event)) return;
        return mutate(rowStates.get(itemId).write, async (vine) => {
            if (vine.includes(itemId)) {
                applyVine(vine);
                return { cancelled: true };
            }
            await appendToVine(vine, [itemId]);
        });
    };

    const removeCape = (itemId, event) => {
        if (isRepeatClick(event)) return;
        return mutate(rowStates.get(itemId).write, async (vine) => {
            const nextVine = vine.filter((entry) => entry !== itemId);
            if (nextVine.length !== vine.length) await writeVerified(VINE_PATH, nextVine);
            // The game re-adds slab-registered capes to the vine when Cathie's menu opens.
            const slab = await readIdList(SLAB_HISTORY_PATH, "Slab history");
            const nextSlab = slab.filter((entry) => entry !== itemId);
            if (nextSlab.length !== slab.length) await writeVerified(SLAB_HISTORY_PATH, nextSlab);
            applyVine(nextVine);
        });
    };

    const addAllCapes = (event) => {
        if (isRepeatClick(event)) return;
        return mutate(addAll, async (vine) => {
            const toAdd = capes.val.map((cape) => cape.itemId).filter((itemId) => !vine.includes(itemId));
            if (!toAdd.length) {
                applyVine(vine);
                return { cancelled: true };
            }
            await appendToVine(vine, toAdd);
        });
    };

    const createRow = (cape, state) =>
        AccountRow({
            rowClass: "cape-vine-row",
            status: state.write.status,
            info: span({ class: "account-row__name" }, cape.name),
            badge: () => (vineIndex.val.get(cape.itemId) < goldenOwned.val ? "GOLDEN" : ""),
            controls: [
                ActionButton({
                    label: () => (vineIndex.val.has(cape.itemId) ? "REMOVE" : "ADD"),
                    variant: "",
                    className: () =>
                        vineIndex.val.has(cape.itemId)
                            ? "account-btn account-btn--danger"
                            : "account-btn account-btn--apply",
                    status: state.write.status,
                    disabled: cannotWrite,
                    onClick: (event) =>
                        vineIndex.val.has(cape.itemId) ? removeCape(cape.itemId, event) : addCape(cape.itemId, event),
                }),
                span(
                    { class: "account-write-feedback", role: "status" },
                    () => STATUS_TEXT[state.write.status.val] ?? ""
                ),
            ],
        });

    const load = async () => {
        if (busy.val) return;
        await run(async () => {
            const defs = await gga(ITEM_DEFS_PATH);
            if (!defs || typeof defs !== "object") throw new Error("Item definitions are unavailable.");
            const eligible = Object.entries(defs)
                .map(([itemId, raw]) => ({ itemId, def: unwrapH(raw) }))
                .filter(
                    ({ itemId, def }) =>
                        itemId !== DEV_CAPE_ID && def?.typeGen === "aCape" && Number(def?.lvReqToCraft) !== 69420
                )
                .map(({ itemId, def }) => ({
                    itemId,
                    name: cleanName(def.displayName || itemId, "", { stripMarker: true }),
                }));

            const [vine, milestones, pack] = await Promise.all([readVine(), readMilestones(), gga(PACK_PATH)]);

            for (const cape of eligible) {
                if (!rowStates.has(cape.itemId)) {
                    const state = { write: useWriteStatus(), node: null };
                    state.node = createRow(cape, state);
                    rowStates.set(cape.itemId, state);
                }
            }
            capes.val = eligible;
            packVines.val = Number(pack) === 1 ? 3 : 0;
            goldenOwned.val = 1 + milestones + packVines.val;
            outOfRange.val = false;
            applyVine(vine);
        });
    };

    let applyGolden = null;
    const goldenRow = EditableNumberRow({
        valueState: goldenOwned,
        // Empty or unparseable input becomes 0, which is always below the minimum.
        normalize: (raw) => resolveNumberInput(raw, { fallback: 0 }),
        write: async (next) => {
            outOfRange.val = next < minGolden() || next > maxGolden();
            if (outOfRange.val) return { cancelled: true };
            await writeVerified(MILESTONES_PATH, next - minGolden());
            return next;
        },
        renderInfo: () =>
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, "Golden Vines"),
                // The range line turns into the error so the list below never shifts.
                span(
                    {
                        class: () =>
                            outOfRange.val ? "account-row__sub-label cape-vine-range--error" : "account-row__sub-label",
                    },
                    () => `${outOfRange.val ? "Must be " : ""}${minGolden()} to ${maxGolden()}`
                ),
                span({ class: "account-write-feedback", role: "alert" }, () =>
                    outOfRange.val ? `Golden Vines must be ${minGolden()} to ${maxGolden()}.` : ""
                )
            ),
        renderBadge: (owned) => `${owned} OWNED`,
        adjustInput: (raw, delta, current) =>
            Math.max(minGolden(), Math.min(maxGolden(), resolveNumberInput(raw, { fallback: current }) + delta)),
        // ponytail: EditableNumberRow resets drafts on blur, so Enter is the keyboard path to SET.
        renderExtraActions: ({ applyValue }) => {
            applyGolden = applyValue;
            return null;
        },
        disabled: () => loading.val || Boolean(error.val),
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        inputProps: {
            "aria-label": "Golden Vines",
            onkeydown: (event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                const inputEl = event.target;
                // Saving disables the input, which drops focus; return it once VanJS re-enables it.
                void applyGolden().then(() =>
                    setTimeout(() => {
                        if (document.activeElement === document.body) inputEl.focus();
                    })
                );
            },
        },
    });

    load();

    return PersistentAccountListPage({
        title: "CAPE VINE",
        description:
            "Add or remove capes on the Cape Vine. Removing a cape also takes it off your Slab, so the game doesn't put it back. Golden Vines are the first slots on the vine.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val || busy.val }),
        state: { loading, error },
        loadingText: "READING CAPE VINE",
        errorTitle: "CAPE VINE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            goldenRow,
            AccountSection({
                title: "ALL CAPES",
                note: () => `${onVineCount()}/${capes.val.length} ON VINE`,
                meta: [
                    ActionButton({
                        label: "ADD ALL",
                        variant: "danger",
                        status: addAll.status,
                        disabled: () => cannotWrite() || onVineCount() === capes.val.length,
                        onClick: addAllCapes,
                    }),
                    span(
                        { class: "account-write-feedback", role: "status" },
                        () => STATUS_TEXT[addAll.status.val] ?? ""
                    ),
                ],
                body: listNode,
            })
        ),
    });
};
