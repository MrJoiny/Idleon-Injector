import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { parseNumber } from "../../../../utils/numberFormat.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    unwrapH,
    useWriteStatus,
    writeManyVerified,
    writeVerified,
} from "../accountShared.js";
import { AccountRow } from "../components/AccountRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";

const { div, span, h3, label, input, select, option } = van.tags;

const slotLocation = (character, kind, slot) =>
    kind === "sample" && slot >= 5
        ? { array: "PrinterXtra", index: 10 * character + 2 * (slot - 5) }
        : { array: "Printer", index: (kind === "print" ? 15 : 5) + 14 * character + 2 * slot };

/** Edit stored printer samples, active prints, and capacity without spending gems. */
export const PrinterTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Printer" });
    const busy = van.state(false);
    const message = van.state("");
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
    const capacities = [
        { index: 111, label: "Extra print purchases", base: 1, maxSlots: 2 },
        { index: 112, label: "Extra sample purchases", base: 4, maxSlots: 10 },
    ].map((entry) => ({ ...entry, draft: van.state("0"), baseline: 0, write: useWriteStatus({ errorMs: 0 }) }));
    let accountIdentity = "";

    const cannotWrite = () => isBusy() || Boolean(error.val) || !snapshot.val;
    const isDirty = (state) =>
        state.item.val !== state.baseline.item || state.quantity.val !== String(state.baseline.qty);
    const hasDrafts = () =>
        [...rows.values()].some(isDirty) || capacities.some((entry) => entry.draft.val !== String(entry.baseline));

    const readSnapshot = async () => {
        const [rawNames, current, unlocked, gems, printer, extra, monsters, fishPools, drops, nonAfk, mtx] =
            await Promise.all([
                gga("GetPlayersUsernames"),
                gga("UserInfo[0]"),
                gga("TowerInfo[0]"),
                gga("GemItemsPurchased"),
                gga("Printer"),
                gga("PrinterXtra"),
                gga("MonsterDefinitionsGET.h"),
                gga("CustomMaps.h.FishPools"),
                gga("CustomMaps.h.MonsterDrops"),
                readCList("NonAFKmonsters"),
                readCList("MTXinfo"),
            ]);
        const names = toIndexedArray(rawNames);
        if (
            !names.length ||
            names.some((name) => typeof name !== "string" || !name.trim() || name.startsWith("__")) ||
            new Set(names).size !== names.length ||
            !names.includes(current) ||
            !Number.isInteger(Number(unlocked)) ||
            Number(unlocked) < 0 ||
            !printer ||
            !extra ||
            !gems ||
            !monsters ||
            !fishPools ||
            !drops ||
            !nonAfk ||
            !mtx
        ) {
            throw new Error("Printer data is unavailable or invalid. Refresh to try again.");
        }

        const limits = {};
        const visit = (raw) => {
            const node = unwrapH(raw);
            if (!node || typeof node !== "object") return;
            if (String(node[4]) === "111" || String(node[4]) === "112") limits[node[4]] = Number(node[5]);
            else Object.values(node).forEach(visit);
        };
        visit(mtx);
        for (const entry of capacities) {
            const count = Number(gems[entry.index]);
            const max = limits[entry.index];
            if (
                !Number.isInteger(max) ||
                max < 0 ||
                max + entry.base > entry.maxSlots ||
                !Number.isInteger(count) ||
                count < 0 ||
                count > max
            ) {
                throw new Error("Printer capacity metadata or purchase counters are invalid.");
            }
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
        return {
            names,
            current,
            unlocked: Math.min(Number(unlocked), names.length),
            gems,
            Printer: printer,
            PrinterXtra: extra,
            limits,
            catalogue,
            ids: new Set(catalogue.map(({ id }) => id)),
        };
    };

    const updateRow = (state, item, qty, resetDraft = false) => {
        const retainDraft = !resetDraft && isDirty(state);
        state.saved.val = { item, qty };
        if (!retainDraft) {
            state.baseline = { item, qty };
            state.item.val = item;
            state.quantity.val = String(qty);
        }
    };

    const syncSnapshot = (next, resetDrafts = false) => {
        snapshot.val = next;
        for (const entry of capacities) {
            const retainDraft = !resetDrafts && entry.draft.val !== String(entry.baseline);
            if (!retainDraft) {
                entry.baseline = next.gems[entry.index];
                entry.draft.val = String(entry.baseline);
            }
            if (resetDrafts) entry.write.clearStatus();
        }
        for (let character = 0; character < next.names.length; character++) {
            for (const kind of ["print", "sample"]) {
                for (let slot = 0; slot < (kind === "print" ? 2 : 10); slot++) {
                    const key = `${character}:${kind}:${slot}`;
                    const location = slotLocation(character, kind, slot);
                    const values = next[location.array];
                    const present = values[location.index] !== undefined && values[location.index + 1] !== undefined;
                    if (character < next.unlocked && !present) {
                        throw new Error(`Printer data for ${next.names[character]} ${kind} ${slot + 1} is missing.`);
                    }
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
            if (writes.length === 1) await writeVerified(writes[0].path, writes[0].value);
            else await writeManyVerified(writes);
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
        const item = clear ? "Blank" : state.item.val;
        const parsed = parseNumber(state.quantity.val);
        if (!clear && (!snapshot.val.ids.has(item) || !Number.isFinite(parsed) || parsed <= 0)) return;
        const qty = clear
            ? 0
            : state.quantity.val === String(state.baseline.qty)
              ? state.baseline.qty
              : typeof state.baseline.qty === "string"
                ? String(parsed)
                : parsed;
        busy.val = true;
        message.val = "";
        try {
            const result = await state.write.run(
                async () => {
                    const next = await readFresh();
                    const cap = Math.round(
                        (state.kind === "print" ? 1 : 4) + Number(next.gems[state.kind === "print" ? 111 : 112])
                    );
                    if (state.character >= next.unlocked) throw new Error("This character's Printer is locked.");
                    if (!clear && (state.slot >= cap || !next.ids.has(item))) {
                        throw new Error("This slot or item is no longer available. Refresh and check the draft.");
                    }
                    const { array, index } = state.location;
                    if (clear && next[array][index] === "Blank" && Number(next[array][index + 1]) === 0) return false;
                    if (
                        clear &&
                        !window.confirm(
                            `${state.kind === "print" ? "Stop" : "Clear"} ${next.names[state.character]} ${state.kind} ${state.slot + 1}?`
                        )
                    )
                        return false;
                    if (clear) {
                        const confirmed = await readFresh();
                        if (state.character >= confirmed.unlocked)
                            throw new Error("This character's Printer is locked.");
                    }
                    await applyWrites([
                        { path: `${array}[${index}]`, value: item },
                        { path: `${array}[${index + 1}]`, value: qty },
                    ]);
                    updateRow(state, item, qty, true);
                    state.syncOptions();
                },
                { onError: (caughtError) => (message.val = caughtError.message) }
            );
            if (result.ok && result.result === false) state.write.clearStatus();
        } finally {
            busy.val = false;
        }
    };

    const setCapacity = async (entry) => {
        if (cannotWrite() || !entry.draft.val.trim()) return;
        const value = Number(entry.draft.val);
        if (!Number.isInteger(value)) return;
        busy.val = true;
        message.val = "";
        try {
            const result = await entry.write.run(
                async () => {
                    let next = await readFresh();
                    if (value < 0 || value > next.limits[entry.index])
                        throw new Error("Capacity is outside the available purchase range.");
                    if (value < Number(next.gems[entry.index])) {
                        if (
                            !window.confirm(
                                `Reduce ${entry.label.toLowerCase()} to ${value}? All saved samples and active prints will stay unchanged.${entry.index === 111 ? " A populated second print will keep printing until you stop it." : ""}`
                            )
                        )
                            return false;
                        next = await readFresh();
                        if (value > next.limits[entry.index])
                            throw new Error("Capacity is outside the available purchase range.");
                    }
                    await applyWrites([{ path: `GemItemsPurchased[${entry.index}]`, value }]);
                    next.gems[entry.index] = value;
                    entry.baseline = value;
                    entry.draft.val = String(value);
                    syncSnapshot({ ...next });
                },
                { onError: (caughtError) => (message.val = caughtError.message) }
            );
            if (result.ok && result.result === false) entry.write.clearStatus();
        } finally {
            busy.val = false;
        }
    };

    const renderSlot = (state, name) => {
        const slotName = `${state.kind} ${state.slot + 1}`;
        const lockedCharacter = () => state.character >= snapshot.val.unlocked;
        const lockedSlot = () =>
            state.slot >=
            Math.round(
                (state.kind === "print" ? 1 : 4) + Number(snapshot.val.gems[state.kind === "print" ? 111 : 112])
            );
        const unavailable = () => cannotWrite() || lockedCharacter();
        const itemSelect = select({
            class: "select-base printer-item-select",
            "aria-label": `${name} ${slotName} item`,
            disabled: () => unavailable() || lockedSlot(),
            value: state.item,
            onchange: (event) => (state.item.val = event.target.value),
        });
        const reconcileOptions = createStaticRowReconciler(itemSelect);
        state.syncOptions = () => {
            const catalogue = snapshot.val.catalogue;
            const unknown = [...new Set([state.item.val, state.saved.val.item])].filter(
                (id) => id !== "Blank" && !snapshot.val.ids.has(id)
            );
            reconcileOptions(JSON.stringify([catalogue, unknown]), () => [
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
                rowClass: "printer-row",
                status: state.write.status,
                info: div(
                    { class: "account-row__name-group" },
                    span(
                        { class: "account-row__name" },
                        `${state.kind === "print" ? "Print" : "Sample"} ${state.slot + 1}`
                    ),
                    span({ class: "account-row__sub-label" }, () => `${state.saved.val.item} · ${state.saved.val.qty}`)
                ),
                badge: () => (lockedCharacter() ? "CHARACTER LOCKED" : lockedSlot() ? "SLOT LOCKED" : "AVAILABLE"),
                controls: [
                    itemSelect,
                    input({
                        type: "text",
                        class: "printer-quantity",
                        "aria-label": `${name} ${slotName} quantity`,
                        value: state.quantity,
                        disabled: () => unavailable() || lockedSlot(),
                        oninput: (event) => (state.quantity.val = event.target.value),
                    }),
                    ActionButton({
                        label: "APPLY",
                        status: state.write.status,
                        disabled: () =>
                            unavailable() ||
                            lockedSlot() ||
                            !snapshot.val.ids.has(state.item.val) ||
                            !Number.isFinite(parseNumber(state.quantity.val)) ||
                            parseNumber(state.quantity.val) <= 0,
                        onClick: () => setSlot(state),
                    }),
                    ActionButton({
                        label: state.kind === "print" ? "STOP" : "CLEAR",
                        variant: "danger",
                        disabled: () =>
                            unavailable() || (state.saved.val.item === "Blank" && Number(state.saved.val.qty) === 0),
                        onClick: () => setSlot(state, true),
                    }),
                    span({ class: "write-status", role: "status" }, () =>
                        state.write.status.val === "loading"
                            ? "SAVING"
                            : state.write.status.val === "success"
                              ? "SAVED"
                              : state.write.status.val === "error"
                                ? "FAILED"
                                : ""
                    ),
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
            { "data-printer-character": name, style: () => (selected.val === character ? "" : "display: none;") },
            h3({ class: "printer-section-title" }, "Active prints"),
            div(
                { class: "account-item-stack" },
                ...[0, 1].map((slot) => renderSlot(rows.get(`${character}:print:${slot}`), name))
            ),
            h3({ class: "printer-section-title" }, "Saved samples"),
            div(
                { class: "account-item-stack" },
                ...Array.from({ length: 10 }, (_, slot) => renderSlot(rows.get(`${character}:sample:${slot}`), name))
            )
        );
        panels.set(character, panel);
        panelsNode.append(panel);
    };

    const load = async () => {
        if (
            busy.val ||
            (!loading.val &&
                hasDrafts() &&
                !window.confirm("Refresh Printer and discard all character and capacity drafts?"))
        )
            return;
        busy.val = true;
        try {
            await runLoad(async () => {
                const next = await readSnapshot();
                const identity = JSON.stringify(next.names);
                if (accountIdentity && identity !== accountIdentity) {
                    rows.forEach((state) => state.write.clearStatus());
                    rows.clear();
                    panels.clear();
                    panelsNode.replaceChildren();
                }
                if (identity !== accountIdentity || selected.val < 0) selected.val = next.names.indexOf(next.current);
                accountIdentity = identity;
                reconcileCharacters(identity, () => next.names.map((name, index) => option({ value: index }, name)));
                characterSelect.value = String(selected.val);
                syncSnapshot(next, true);
                message.val = "";
            });
        } finally {
            busy.val = false;
        }
    };

    const capacityControls = capacities.map((entry) =>
        div(
            { class: "printer-capacity-control" },
            label(
                span(entry.label),
                input({
                    type: "number",
                    min: 0,
                    max: () => (snapshot.val ? snapshot.val.limits[entry.index] : 0),
                    step: 1,
                    "aria-label": entry.label,
                    value: entry.draft,
                    disabled: cannotWrite,
                    oninput: (event) => (entry.draft.val = event.target.value),
                })
            ),
            span({ class: "write-status" }, () => (snapshot.val ? `0–${snapshot.val.limits[entry.index]}` : "")),
            ActionButton({
                label: "APPLY",
                status: entry.write.status,
                disabled: () =>
                    cannotWrite() ||
                    !entry.draft.val.trim() ||
                    !Number.isInteger(Number(entry.draft.val)) ||
                    Number(entry.draft.val) < 0 ||
                    Number(entry.draft.val) > snapshot.val.limits[entry.index],
                onClick: () => setCapacity(entry),
            })
        )
    );

    load();
    return PersistentAccountListPage({
        rootClass: "printer-tab tab-container",
        title: "PRINTER",
        description: "Edit stored samples and active prints independently. Capacity edits do not spend gems.",
        wrapActions: false,
        actions: BulkActionBar({ refresh: { onClick: load, disabled: isBusy } }),
        state: { loading, error },
        loadingText: "READING PRINTER",
        errorTitle: "PRINTER READ FAILED",
        body: div(
            { class: "scrollable-panel content-stack" },
            div({ class: "write-status write-status--error", role: "alert" }, () => message.val),
            div({ class: "printer-capacities" }, ...capacityControls),
            div(
                { class: "printer-note" },
                "Reducing capacity preserves every sample and print. A populated second print keeps printing until stopped."
            ),
            div(
                { class: "printer-character-control" },
                label("Character", characterSelect),
                span({ class: "write-status" }, () =>
                    snapshot.val
                        ? `${snapshot.val.unlocked}/${snapshot.val.names.length} characters unlocked. Unlock level is edited in Construction.`
                        : ""
                )
            ),
            div(
                { class: "printer-note" },
                "Print quantities are stored base quantities. Bonuses can change actual production. Editing a sample does not update an active print."
            ),
            panelsNode
        ),
    });
};
