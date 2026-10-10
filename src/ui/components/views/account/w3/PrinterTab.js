import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { parseNumber } from "../../../../utils/numberFormat.js";
import { RefreshButton } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import {
    adjustFormattedIntInput,
    cleanName,
    createStaticRowReconciler,
    largeFormatter,
    largeParser,
    unwrapH,
    useWriteStatus,
    writeManyVerified,
} from "../accountShared.js";
import { AccountRow } from "../components/AccountRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { ActionButton } from "../components/ActionButton.js";
import { getNumberInputLiveRaw, NumberInput } from "../../../NumberInput.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";

const { div, span, select, option } = van.tags;

const slotLocation = (character, kind, slot) =>
    kind === "sample" && slot >= 5
        ? { array: "PrinterXtra", index: 10 * character + 2 * (slot - 5) }
        : { array: "Printer", index: (kind === "print" ? 15 : 5) + 14 * character + 2 * slot };

/** Edit stored printer samples and active prints. */
export const PrinterTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Printer" });
    const busy = van.state(false);
    const snapshot = van.state(null);
    const selected = van.state(-1);
    const rows = new Map();
    const panels = new Map();
    const panelsNode = div();
    const isBusy = () => loading.val || busy.val;
    const characterSelect = select({
        class: "select-base printer-character-select",
        "aria-label": "Printer character",
        disabled: () => isBusy() || !snapshot.val,
        value: selected,
        onchange: (event) => {
            if (isBusy()) return;
            selected.val = Number(event.target.value);
            showCharacter();
        },
    });
    const reconcileCharacters = createStaticRowReconciler(characterSelect);
    let accountIdentity = "";
    let cachedCatalogue = null;

    const cannotWrite = () => isBusy() || Boolean(error.val) || !snapshot.val;
    const isDirty = (state) => {
        state.dirty.val;
        const rawQty = getNumberInputLiveRaw(state.quantity) ?? state.quantity.val;
        if (rawQty === String(state.baseline.qty)) {
            return state.item.val !== state.baseline.item;
        }
        const parsed = parseNumber(rawQty);
        const qtyChanged = Number.isFinite(parsed)
            ? Math.round(parsed) !== Number(state.baseline.qty)
            : rawQty !== String(state.baseline.qty);
        return state.item.val !== state.baseline.item || qtyChanged;
    };
    const hasDrafts = () => [...rows.values()].some(isDirty);
    const getItemDisplayName = (id) => snapshot.val?.namesById?.get(id) ?? id;
    const isAllowedItem = (item, state, snap = snapshot.val) =>
        Boolean(snap?.ids?.has(item)) || (item !== "Blank" && item === state.baseline.item);

    const getCatalogue = async () => {
        if (cachedCatalogue) return cachedCatalogue;
        const [monsters, fishPools, drops, nonAfk] = await Promise.all([
            gga("MonsterDefinitionsGET.h"),
            gga("CustomMaps.h.FishPools"),
            gga("CustomMaps.h.MonsterDrops"),
            readCList("NonAFKmonsters"),
        ]);
        if (!monsters || !fishPools || !drops || !nonAfk) {
            throw new Error("Printer catalogue definitions are unavailable.");
        }

        const candidates = new Set();
        const excluded = new Set(toIndexedArray(nonAfk));
        const pools = unwrapH(fishPools);
        const monsterDrops = unwrapH(drops);
        for (const [target, rawDefinition] of Object.entries(unwrapH(monsters))) {
            if (excluded.has(target)) continue;
            const definition = unwrapH(rawDefinition);
            if (["MINING", "CHOPPIN", "CATCHING", "SPELUNKING"].includes(definition.AFKtype)) candidates.add(target);
            else if (definition.AFKtype === "FISHING") {
                for (const id of toIndexedArray(toIndexedArray(pools[target])[0])) candidates.add(id);
            } else if (definition.AFKtype === "FIGHTING") {
                const firstDrop = toIndexedArray(monsterDrops[target])
                    .slice(0, 4)
                    .map(toIndexedArray)
                    .find((row) => row[3] === "N/A" && row[0] !== "COIN" && !String(row[0]).includes("Cards"));
                if (firstDrop) candidates.add(firstDrop[0]);
            }
        }

        const definitions = await readGgaEntries("ItemDefinitionsGET.h", [...candidates], ["displayName"]);
        const catalogue = [...candidates]
            .filter((id) => definitions[id])
            .map((id) => ({ id, name: cleanName(unwrapH(definitions[id]).displayName, id) }))
            .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
        if (!catalogue.length) throw new Error("Printer item catalogue is unavailable.");
        const namesById = new Map(catalogue.map((entry) => [entry.id, entry.name]));
        cachedCatalogue = {
            catalogue,
            ids: new Set(catalogue.map(({ id }) => id)),
            namesById,
        };
        return cachedCatalogue;
    };

    const readSnapshot = async () => {
        const [rawNames, current, unlocked, gems, printer, extra, catalogueResult] = await Promise.all([
            gga("GetPlayersUsernames"),
            gga("UserInfo[0]"),
            gga("TowerInfo[0]"),
            gga("GemItemsPurchased"),
            gga("Printer"),
            gga("PrinterXtra"),
            getCatalogue(),
        ]);
        const names = toIndexedArray(rawNames).filter(
            (name) => typeof name === "string" && name.trim().length > 0 && !name.startsWith("__")
        );
        if (
            !names.length ||
            new Set(names).size !== names.length ||
            !Number.isInteger(Number(unlocked)) ||
            Number(unlocked) < 0 ||
            !printer ||
            !extra ||
            !gems
        ) {
            throw new Error("Printer data is unavailable or invalid. Refresh to try again.");
        }

        const { catalogue, ids, namesById } = catalogueResult;
        return {
            names,
            current,
            unlocked: Math.min(Number(unlocked), names.length),
            gems: toIndexedArray(gems),
            Printer: toIndexedArray(printer),
            PrinterXtra: toIndexedArray(extra),
            catalogue,
            ids,
            namesById,
        };
    };

    const updateRow = (state, item, qty, resetDraft = false) => {
        const retainDraft = !resetDraft && isDirty(state);
        state.saved.val = { item, qty };
        if (!retainDraft) {
            state.baseline = { item, qty };
            state.item.val = item;
            state.quantity.val = String(qty);
            state.dirty.val++;
        }
    };

    const syncSnapshot = (next, resetDrafts = false) => {
        snapshot.val = next;
        for (let character = 0; character < next.names.length; character++) {
            for (const kind of ["print", "sample"]) {
                for (let slot = 0; slot < (kind === "print" ? 2 : 10); slot++) {
                    const key = `${character}:${kind}:${slot}`;
                    const location = slotLocation(character, kind, slot);
                    const values = next[location.array];
                    const present = values[location.index] !== undefined && values[location.index + 1] !== undefined;
                    if (!rows.has(key)) {
                        rows.set(key, {
                            character,
                            kind,
                            slot,
                            location,
                            baseline: { item: "Blank", qty: 0 },
                            saved: van.state({ item: "Blank", qty: 0 }),
                            item: van.state("Blank"),
                            quantity: van.state("0"),
                            dirty: van.state(0),
                            write: useWriteStatus({ errorMs: 0 }),
                        });
                    }
                    const state = rows.get(key);
                    updateRow(
                        state,
                        present ? values[location.index] : "Blank",
                        present ? values[location.index + 1] : 0,
                        resetDrafts
                    );
                    if (resetDrafts) state.write.clearStatus();
                    if (state.syncOptions) state.syncOptions();
                }
            }
        }
        showCharacter();
    };

    const readFresh = async () => {
        try {
            const next = await readSnapshot();
            if (JSON.stringify(next.names) !== accountIdentity) {
                throw new Error("The account or character list changed. Refresh before editing Printer.");
            }
            syncSnapshot(next);
            return next;
        } catch (caughtError) {
            error.val = `Refresh before editing Printer. ${caughtError.message}`;
            throw caughtError;
        }
    };

    const applyWrites = async (writes) => {
        try {
            await writeManyVerified(writes);
        } catch (caughtError) {
            try {
                await readFresh();
            } catch (readError) {
                error.val = `Printer could not be reread. Refresh before editing. ${readError.message}`;
            }
            throw new Error(`Some changes may have applied or could not be verified. ${caughtError.message}`);
        }
    };

    const setSlot = async (state, clear = false) => {
        if (cannotWrite()) return;
        if (clear) {
            const charName = snapshot.val?.names?.[state.character] ?? "character";
            if (
                !window.confirm(
                    `${state.kind === "print" ? "Stop" : "Clear"} ${charName} ${state.kind} ${state.slot + 1}?`
                )
            )
                return;
        }
        const item = clear ? "Blank" : state.item.val;
        const rawQty = getNumberInputLiveRaw(state.quantity) ?? state.quantity.val;
        const isUnchangedQty = rawQty === String(state.baseline.qty);
        const parsed = Math.round(parseNumber(rawQty));
        if (!clear && (!isAllowedItem(item, state) || !Number.isFinite(parsed) || parsed <= 0)) return;
        const qty = clear
            ? 0
            : isUnchangedQty || parsed === Number(state.baseline.qty)
              ? state.baseline.qty
              : typeof state.baseline.qty === "string"
                ? String(parsed)
                : parsed;
        busy.val = true;
        try {
            await state.write.run(
                async () => {
                    const next = await readFresh();
                    const cap = Math.round(
                        (state.kind === "print" ? 1 : 4) + Number(next.gems[state.kind === "print" ? 111 : 112] ?? 0)
                    );
                    if (state.character >= next.unlocked) throw new Error("This character's Printer is locked.");
                    if (!clear && (state.slot >= cap || !isAllowedItem(item, state, next))) {
                        throw new Error("This slot or item is no longer available. Refresh and check the draft.");
                    }
                    const { array, index } = state.location;
                    if (!(clear && next[array][index] === "Blank" && Number(next[array][index + 1]) === 0)) {
                        await applyWrites([
                            { path: `${array}[${index}]`, value: item },
                            { path: `${array}[${index + 1}]`, value: qty },
                        ]);
                    }
                    updateRow(state, item, qty, true);
                    state.syncOptions();
                },
                { onError: (caughtError) => (error.val = caughtError.message) }
            );
        } finally {
            busy.val = false;
        }
    };

    const renderSlot = (state, name) => {
        const slotName = `${state.kind} ${state.slot + 1}`;
        const lockedCharacter = () => state.character >= (snapshot.val?.unlocked ?? 0);
        const lockedSlot = () => {
            const kindCap = Math.round(
                (state.kind === "print" ? 1 : 4) + Number(snapshot.val?.gems?.[state.kind === "print" ? 111 : 112] ?? 0)
            );
            return state.slot >= kindCap;
        };
        const unavailable = () => cannotWrite() || lockedCharacter();
        const itemSelect = select({
            class: "select-base printer-item-select",
            "aria-label": `${name} ${slotName} item`,
            disabled: () => unavailable() || lockedSlot(),
            onchange: (event) => (state.item.val = event.target.value),
        });
        const reconcileOptions = createStaticRowReconciler(itemSelect);
        state.syncOptions = () => {
            const { catalogue, ids } = snapshot.val;
            const unknown = [...new Set([state.baseline.item, state.item.val])].filter(
                (id) => id !== "Blank" && !ids.has(id)
            );
            reconcileOptions(unknown.join(","), () => [
                option({ value: "Blank" }, "Select an item"),
                ...unknown.map((id) => option({ value: id }, String(id))),
                ...catalogue.map(({ id, name: itemName }) => option({ value: id }, `${itemName} (${id})`)),
            ]);
            itemSelect.value = state.item.val;
        };
        state.syncOptions();
        return div(
            { "data-printer-slot": `${state.kind}-${state.slot + 1}` },
            AccountRow({
                rowClass: "printer-row account-row--wide-controls",
                controlsClass: "account-row__controls--xl",
                status: state.write.status,
                info: div(
                    { class: "account-row__name-group" },
                    span(
                        { class: "account-row__name" },
                        `${state.kind === "print" ? "Print" : "Sample"} ${state.slot + 1}`
                    ),
                    span({ class: "account-row__sub-label" }, () =>
                        state.saved.val.item !== "Blank"
                            ? `${getItemDisplayName(state.saved.val.item)} · ${largeFormatter(state.saved.val.qty)}${state.kind === "print" ? "/hr" : ""}`
                            : "Empty slot"
                    )
                ),
                badge: () =>
                    lockedCharacter()
                        ? "CHARACTER LOCKED"
                        : lockedSlot()
                          ? "SLOT LOCKED"
                          : state.saved.val.item !== "Blank"
                            ? state.kind === "print"
                                ? "PRINTING"
                                : "STORED"
                            : "EMPTY",
                controls: [
                    itemSelect,
                    NumberInput({
                        value: state.quantity,
                        mode: "int",
                        formatter: largeFormatter,
                        parser: largeParser,
                        "aria-label": `${name} ${slotName} quantity`,
                        disabled: () => unavailable() || lockedSlot(),
                        oninput: () => {
                            state.dirty.val++;
                        },
                        onDecrement: () => {
                            if (unavailable() || lockedSlot()) return;
                            const raw = getNumberInputLiveRaw(state.quantity) ?? state.quantity.val;
                            state.quantity.val = String(adjustFormattedIntInput(raw, -1, 0, { min: 0 }));
                            state.dirty.val++;
                        },
                        onIncrement: () => {
                            if (unavailable() || lockedSlot()) return;
                            const raw = getNumberInputLiveRaw(state.quantity) ?? state.quantity.val;
                            state.quantity.val = String(adjustFormattedIntInput(raw, 1, 0, { min: 0 }));
                            state.dirty.val++;
                        },
                    }),
                    ActionButton({
                        label: "SET",
                        status: state.write.status,
                        disabled: () =>
                            unavailable() ||
                            !isDirty(state) ||
                            lockedSlot() ||
                            !isAllowedItem(state.item.val, state) ||
                            !(Math.round(parseNumber(getNumberInputLiveRaw(state.quantity) ?? state.quantity.val)) > 0),
                        onClick: () => setSlot(state),
                    }),
                    ActionButton({
                        label: state.kind === "print" ? "STOP" : "CLEAR",
                        status: state.write.status,
                        variant: "danger",
                        disabled: () =>
                            unavailable() || (state.saved.val.item === "Blank" && !Number(state.saved.val.qty)),
                        onClick: () => setSlot(state, true),
                    }),
                ],
            })
        );
    };

    const showCharacter = () => {
        const next = snapshot.val;
        if (!next || selected.val < 0 || panels.has(selected.val)) return;
        const character = selected.val;
        const name = next.names[character];
        const panel = div(
            {
                class: "content-stack",
                "data-printer-character": name,
                style: () => (selected.val === character ? "" : "display: none;"),
            },
            AccountSection({
                title: "ACTIVE PRINTS",
                body: div(
                    { class: "account-item-stack" },
                    ...[0, 1].map((slot) => renderSlot(rows.get(`${character}:print:${slot}`), name))
                ),
            }),
            AccountSection({
                title: "SAVED SAMPLES",
                body: div(
                    { class: "account-item-stack" },
                    ...Array.from({ length: 10 }, (_, slot) =>
                        renderSlot(rows.get(`${character}:sample:${slot}`), name)
                    )
                ),
            })
        );
        panels.set(character, panel);
        panelsNode.append(panel);
    };

    const load = async () => {
        if (
            busy.val ||
            (!loading.val && hasDrafts() && !window.confirm("Refresh Printer and discard all character drafts?"))
        )
            return;
        busy.val = true;
        try {
            await runLoad(async () => {
                const next = await readSnapshot();
                const identity = JSON.stringify(next.names);
                if (identity !== accountIdentity) {
                    rows.clear();
                    panels.clear();
                    panelsNode.replaceChildren();
                }
                if (identity !== accountIdentity || selected.val < 0) {
                    const currentIdx = next.names.indexOf(next.current);
                    selected.val = currentIdx >= 0 ? currentIdx : 0;
                }
                accountIdentity = identity;
                reconcileCharacters(identity, () => next.names.map((name, index) => option({ value: index }, name)));
                characterSelect.value = String(selected.val);
                syncSnapshot(next, true);
            });
        } finally {
            busy.val = false;
        }
    };

    load();
    return PersistentAccountListPage({
        rootClass: "tab-container scroll-container",
        title: "PRINTER",
        description: "Edit stored samples and active prints independently.",
        actions: RefreshButton({ onRefresh: load, disabled: isBusy }),
        state: { loading, error },
        loadingText: "READING PRINTER",
        errorTitle: "PRINTER READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "CHARACTER",
                body: AccountRow({
                    info: [
                        span({ class: "account-row__name" }, "Selected Character"),
                        span({ class: "account-row__sub-label" }, "Inspect and edit 3D printer for this character"),
                    ],
                    controls: characterSelect,
                }),
            }),
            panelsNode
        ),
    });
};
