/** Account-wide prayer levels and per-character equipment. */
import van from "../../../../vendor/van-1.6.0.js";
import { deleteGga, gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { ActionButton } from "../components/ActionButton.js";
import { WarningBanner } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    resolveNumberInput,
    unwrapH,
    useWriteStatus,
    writeManyVerified,
    writeVerified,
} from "../accountShared.js";

const { div, span, select, option, label } = van.tags;

export const savedPath = (name, slot) => `PlayerDATABASE.h[${name}].h.Prayers[${slot}]`;

export const effectText = (text, coefficient, level) =>
    cleanName(String(text).replace(/\{/g, String(Math.round(Number(coefficient) * Math.max(1, 1 + (level - 1) / 10)))));

export const calculateCapacity = (wizardLevel, thresholds, gemSlots) => {
    let capacity = 0;
    thresholds.forEach((threshold, index) => {
        if (wizardLevel >= threshold) capacity = index + 1;
    });
    return Math.max(0, Math.min(12, Math.round(capacity + Number(gemSlots || 0))));
};

export const calculateGamingPercent = (gamingBits, letters) => {
    if (typeof gamingBits !== "string") return 0;
    const letterList = toIndexedArray(letters ?? []);
    const bits = [9, 39, 53].map(
        (index) => Boolean(letterList[index]) && gamingBits.includes(String(letterList[index]))
    );
    return 20 * bits.filter(Boolean).length;
};

export const equipmentPlan = (state, player, ids) => {
    const writes = [];
    player.saved.forEach((id, slot) => {
        if (ids.includes(id)) writes.push({ path: savedPath(player.name, slot), value: -1 });
    });
    if (player.name === state.current) {
        player.prayers.forEach((id, slot) => {
            if (ids.includes(id)) writes.push({ path: `PrayersActive[${slot}]`, value: -1 });
        });
    }
    return writes;
};

export const levelPlan = (state, id, requested) => {
    const definition = state.definitions.find((entry) => entry.id === id);
    if (!definition) throw new Error("Prayer metadata changed. Refresh and try again.");
    const next = Math.max(0, Math.min(Number(definition.data[9]), requested));
    const affected =
        next === 0
            ? state.players.filter((player) => player.prayers.includes(id) || player.saved.includes(id))
            : [];
    return {
        equipment: next === 0 ? affected.flatMap((player) => equipmentPlan(state, player, [id])) : [],
        levels: state.levels[id] !== next ? [{ path: `PrayersUnlocked[${id}]`, value: next }] : [],
        confirmation:
            next === 0 && (affected.length || state.levels[id] !== 0)
                ? `Set ${cleanName(definition.data[0])} to level 0 and lock it?${affected.length ? ` Unequip from ${affected.length} character(s): ${affected.map((player) => player.name).join(", ")}.` : ""}`
                : null,
        value: next,
    };
};

/** Render the prayer editor without invoking normal-game purchases or unlocks. */
export const PrayersTab = () => {
    const { loading, error, run: runLoad } = useAccountLoad({ label: "Prayers" });
    const busy = van.state(false);
    const selected = van.state("");
    const snapshot = van.state(null);
    const message = van.state("");
    const levelStates = new Map();
    const metadataStates = new Map();
    const bulkStatus = useWriteStatus();
    const rows = div({ class: "account-list" });
    const reconcileRows = createStaticRowReconciler(rows);
    const selector = select({
        class: "select-base",
        id: "prayers-character",
        value: selected,
        disabled: () => busy.val || loading.val || Boolean(error.val),
        onchange: (event) => {
            if (!busy.val) selected.val = event.target.value;
        },
    });
    const reconcileNames = createStaticRowReconciler(selector);
    const unavailable = () => busy.val || loading.val || Boolean(error.val) || !snapshot.val;

    const readSnapshot = async () => {
        const current = await gga("UserInfo[0]");
        const [
            rawNames,
            rawLevels,
            rawDefinitions,
            rawActive,
            gemSlots,
            rawThresholds,
            gamingBits,
            letters,
            rawTrials,
        ] = await Promise.all([
            gga("GetPlayersUsernames"),
            gga("PrayersUnlocked"),
            readCList("PrayerInfo"),
            gga("PrayersActive"),
            gga("GemItemsPurchased[114]"),
            readCList("RANDOlist[9]"),
            gga("Gaming[12]"),
            gga("Number2Letter"),
            readCList("WorshipBASEinfos"),
        ]);
        const roster = toIndexedArray(rawNames);
        const names = roster.filter((name) => typeof name === "string" && name && !name.startsWith("__"));
        const entries = await readGgaEntries("PlayerDATABASE.h", names, ["Prayers", "CharacterClass", "Lv0"]);
        const trials = toIndexedArray(rawTrials).map((raw) => toIndexedArray(raw)[2]);
        const trialKeys = [...new Set(trials.filter((key) => typeof key === "string" && key.length > 0))];
        const trialMonsters =
            trialKeys.length > 0 ? await readGgaEntries("MonsterDefinitionsGET.h", trialKeys, ["Name"]) : {};
        if (!names.includes(current) || (await gga("UserInfo[0]")) !== current) {
            throw new Error("The active character changed while reading. Refresh and try again.");
        }
        const levels = toIndexedArray(rawLevels).map(Number);
        const definitions = toIndexedArray(rawDefinitions)
            .map((raw, id) => ({ id, data: toIndexedArray(raw) }))
            .filter(({ data }) => data[0] !== "Some_Prayer_Name0" && Number(data[9]) > 0);
        const active = toIndexedArray(rawActive).map(Number);
        const thresholds = toIndexedArray(rawThresholds).slice(0, 8).map(Number);
        const players = names.map((name) => {
            const entry = unwrapH(entries[name]);
            const rawSaved = entry?.Prayers ? toIndexedArray(entry.Prayers).map(Number) : Array(12).fill(-1);
            const saved = rawSaved.length === 12 ? rawSaved : Array(12).fill(-1);
            return {
                name,
                saved,
                prayers: name === current ? active : saved,
                classId: Number(entry?.CharacterClass ?? 0),
                level: Number(toIndexedArray(entry?.Lv0 ?? [])[0] ?? 0),
            };
        });
        if (
            !definitions.length ||
            active.length !== 12 ||
            thresholds.length !== 8 ||
            !Number.isFinite(Number(gemSlots ?? 0)) ||
            definitions.some(({ id, data }) => !Number.isFinite(levels[id]) || !Number.isFinite(Number(data[9])))
        ) {
            throw new Error("Prayer metadata or account state is incomplete. Refresh and try again.");
        }
        const wizardLevel = Math.max(
            0,
            ...players.filter((player) => [32, 34, 35].includes(player.classId)).map((player) => player.level)
        );
        const capacity = calculateCapacity(wizardLevel, thresholds, gemSlots);
        const gamingPercent = calculateGamingPercent(gamingBits, letters);
        return {
            current,
            players,
            levels,
            definitions,
            trialNames: trials.map((key) => cleanName(unwrapH(trialMonsters[key])?.Name || key || "")),
            capacity,
            gamingPercent,
        };
    };

    const applySnapshot = (next) => {
        if (!next.players.some((player) => player.name === selected.val)) selected.val = next.current;
        snapshot.val = next;
        reconcileNames(next.players.map((player) => player.name).join("|"), () =>
            next.players.map((player) => option({ value: player.name }, player.name))
        );
        selector.value = selected.val;
        next.definitions.forEach(({ id, data }) => {
            getOrCreateState(levelStates, id).val = next.levels[id];
            getOrCreateState(metadataStates, id, data).val = data;
        });
        reconcileRows(next.definitions.map(({ id }) => id).join("|"), () =>
            next.definitions.map(({ id }) => renderRow(id))
        );
    };

    const load = async () => {
        if (busy.val) return;
        busy.val = true;
        try {
            await runLoad(async () => applySnapshot(await readSnapshot()));
        } finally {
            busy.val = false;
        }
    };

    const checkContext = async (current, target) => {
        if (selected.val !== target || (await gga("UserInfo[0]")) !== current) {
            throw new Error("The character changed during the operation. Refresh and try again.");
        }
    };

    const refreshEffectCache = async (current, target) => {
        await checkContext(current, target);
        await deleteGga("DNSM.h.PrayNonEq");
        const [flag, rawActive] = await Promise.all([gga("DNSM.h.PrayNonEq"), gga("PrayersActive")]);
        await checkContext(current, target);
        const active = toIndexedArray(rawActive);
        if (active.length !== 12)
            throw new Error("Prayer effect cache verification could not read all equipment slots.");
        const expected = active.every((id) => Number(id) === -1) ? 1 : 0;
        if (flag !== null && flag !== undefined && Number(flag) !== expected) {
            throw new Error("Prayer effect cache did not refresh to match the current equipment.");
        }
    };

    const execute = async (buildPlan) => {
        if (unavailable()) throw new Error("Prayers are busy or unavailable. Refresh and try again.");
        busy.val = true;
        message.val = "";
        let attempted = 0;
        let verified = 0;
        let touchedLive = false;
        let initial = null;
        const target = selected.val;
        try {
            initial = await readSnapshot();
            if (initial.current !== snapshot.val.current) {
                throw new Error("The active character changed. Refresh and try again.");
            }
            let plan = buildPlan(initial);
            if (plan.cancelled) {
                return { cancelled: true };
            }
            if (!plan.equipment.length && !plan.levels.length && !plan.confirmation) {
                return { value: plan.value };
            }
            if (plan.confirmation) {
                if (!window.confirm(plan.confirmation)) return { cancelled: true };
                const fresh = await readSnapshot();
                const refreshed = buildPlan(fresh);
                if (fresh.current !== initial.current || JSON.stringify(refreshed) !== JSON.stringify(plan)) {
                    throw new Error("The confirmed targets changed. Refresh and confirm again.");
                }
                plan = refreshed;
            }
            const writeBatch = async (writes) => {
                if (!writes.length) return;
                await checkContext(initial.current, target);
                attempted += writes.length;
                touchedLive = touchedLive || writes.some((write) => write.path.startsWith("PrayersActive["));
                try {
                    if (writes.length === 1) await writeVerified(writes[0].path, writes[0].value);
                    else await writeManyVerified(writes);
                    verified += writes.length;
                } catch (caught) {
                    if (caught.results) verified += caught.results.filter((result) => result.ok).length;
                    throw caught;
                }
                await checkContext(initial.current, target);
            };
            // Equipment cleanup must verify before an account-wide level is locked.
            await writeBatch(plan.equipment);
            if (touchedLive) {
                await refreshEffectCache(initial.current, target);
                touchedLive = false;
            }
            await writeBatch(plan.levels);
            applySnapshot(await readSnapshot());
            if (attempted > 0) message.val = `${verified} write(s) verified.`;
            return { value: plan.value };
        } catch (caught) {
            message.val = attempted
                ? `Operation incomplete: ${verified}/${attempted} attempted writes verified. Some changes may have applied. ${caught.message}`
                : caught.message;
            if (touchedLive) {
                try {
                    await refreshEffectCache(initial.current, target);
                } catch (cacheError) {
                    message.val += ` Prayer effect cache refresh failed: ${cacheError.message}`;
                }
            }
            await runLoad(async () => applySnapshot(await readSnapshot()));
            throw caught;
        } finally {
            busy.val = false;
        }
    };

    const setLevel = async (id, next) => {
        const result = await execute((state) => levelPlan(state, id, next));
        return result.cancelled ? result : result.value;
    };

    const toggleEquipment = (id, wasEquipped) =>
        execute((state) => {
            const player = state.players.find((entry) => entry.name === selected.val);
            if (!player) throw new Error("Selected character no longer exists.");
            const equipped = player.prayers.includes(id);
            if (equipped !== wasEquipped) throw new Error("Equipment changed. Refresh and try again.");
            if (equipped) return { equipment: equipmentPlan(state, player, [id]), levels: [] };
            if (!(state.levels[id] > 0)) throw new Error("Unlock this prayer before equipping it.");
            if (player.prayers.filter((val) => val !== -1).length >= state.capacity) {
                throw new Error("No usable prayer slots remain.");
            }
            const slot = player.prayers.indexOf(-1);
            if (slot === -1) throw new Error("No usable prayer slots remain.");
            const equipment = [{ path: savedPath(player.name, slot), value: id }];
            if (player.name === state.current) equipment.push({ path: `PrayersActive[${slot}]`, value: id });
            return { equipment, levels: [] };
        });

    const bulk = async (mode) => {
        if (unavailable()) return;
        await bulkStatus.run(() =>
            execute((state) => {
                if (mode === "unequip") {
                    const player = state.players.find((entry) => entry.name === selected.val);
                    if (!player) throw new Error("Selected character no longer exists.");
                    const ids = state.definitions
                        .map((entry) => entry.id)
                        .filter((id) => player.prayers.includes(id));
                    if (!ids.length) {
                        message.val = `No prayers equipped on ${player.name}.`;
                        return { equipment: [], levels: [], cancelled: true };
                    }
                    return {
                        equipment: equipmentPlan(state, player, ids),
                        levels: [],
                        confirmation: `Unequip ${ids.length} named prayer(s) from ${player.name}?`,
                    };
                }
                const levels = state.definitions
                    .filter(({ id, data }) =>
                        mode === "unlock" ? state.levels[id] === 0 : state.levels[id] !== Number(data[9])
                    )
                    .map(({ id, data }) => ({
                        path: `PrayersUnlocked[${id}]`,
                        value: mode === "unlock" ? 1 : Number(data[9]),
                    }));
                if (!levels.length) {
                    message.val = `All prayers are already ${mode === "unlock" ? "unlocked" : "maxed"}.`;
                    return { equipment: [], levels: [], cancelled: true };
                }
                return {
                    equipment: [],
                    levels,
                    confirmation: `${mode === "unlock" ? "Unlock" : "Max"} ${levels.length} named prayer(s) account-wide?`,
                };
            })
        );
    };

    const renderRow = (id) => {
        const level = getOrCreateState(levelStates, id);
        const metadata = getOrCreateState(metadataStates, id);
        const equipmentStatus = useWriteStatus();
        const isEquipped = () =>
            Boolean(snapshot.val?.players.find((player) => player.name === selected.val)?.prayers.includes(id));
        return EditableNumberRow({
            valueState: level,
            normalize: (raw) => resolveNumberInput(raw, { min: 0, max: Number(metadata.val[9]) }),
            write: (next) => setLevel(id, next),
            disabled: unavailable,
            rowClass: "prayer-row account-row--wide-controls",
            inputProps: { "aria-label": `${cleanName(metadata.val[0])} level` },
            maxAction: { label: "MAX", value: Number.MAX_SAFE_INTEGER },
            renderInfo: () =>
                div(
                    { class: "account-row__name-group" },
                    span({ class: "account-row__name" }, () => cleanName(metadata.val[0])),
                    span(
                        { class: "prayer-row__effect" },
                        () =>
                            `${level.val === 0 ? "Level 1 preview. " : ""}Bonus: ${effectText(metadata.val[1], metadata.val[3], Math.max(1, level.val))}`
                    ),
                    span(
                        { class: "prayer-row__effect" },
                        () => `Curse: ${effectText(metadata.val[2], metadata.val[4], Math.max(1, level.val))}`
                    ),
                    span(
                        { class: "prayer-row__effect" },
                        () =>
                            `Unlock: ${snapshot.val?.trialNames?.[Number(metadata.val[8])] || `Trial ${metadata.val[8]}`}, wave ${metadata.val[7]}`
                    )
                ),
            renderBadge: () =>
                `LV ${level.val}/${metadata.val[9]}${level.val === 0 ? " · LOCKED" : ""}${isEquipped() ? " · EQUIPPED" : ""}`,
            renderExtraActions: () =>
                ActionButton({
                    label: () => (isEquipped() ? "UNEQUIP" : "EQUIP"),
                    status: equipmentStatus.status,
                    className: "prayer-row__equip-btn",
                    disabled: () => unavailable() || (!isEquipped() && level.val === 0),
                    onClick: () => {
                        if (unavailable()) return;
                        const wasEquipped = isEquipped();
                        void equipmentStatus.run(() => toggleEquipment(id, wasEquipped));
                    },
                }),
        });
    };

    void load();
    return PersistentAccountListPage({
        title: "PRAYERS",
        rootClass: "tab-container prayers-page",
        description: "Edit account levels and character equipment. Level edits bypass soul costs and trial unlocks.",
        actions: BulkActionBar({
            actions: [
                {
                    label: "UNLOCK ALL",
                    status: bulkStatus.status,
                    disabled: unavailable,
                    onClick: () => bulk("unlock"),
                },
                { label: "MAX ALL", status: bulkStatus.status, disabled: unavailable, onClick: () => bulk("max") },
                {
                    label: "UNEQUIP ALL",
                    status: bulkStatus.status,
                    disabled: unavailable,
                    onClick: () => bulk("unequip"),
                },
            ],
            refresh: { onClick: load, disabled: () => busy.val || loading.val },
        }),
        wrapActions: false,
        state: { loading, error },
        topNotices: WarningBanner("Setting a prayer to level 0 removes it from every character before locking it."),
        body: div(
            { class: "scrollable-panel content-stack" },
            div(
                { class: "account-setall-row" },
                label({ for: "prayers-character", class: "account-setall-row__label" }, "CHARACTER"),
                selector,
                span(() => {
                    if (!snapshot.val) return "";
                    const player = snapshot.val.players.find((entry) => entry.name === selected.val);
                    if (!player) return "";
                    return `${player.prayers.filter((id) => id !== -1).length}/${snapshot.val.capacity} slots used`;
                })
            ),
            () => {
                if (!snapshot.val || !snapshot.val.gamingPercent) return div();
                const player = snapshot.val.players.find((entry) => entry.name === selected.val);
                if (!player) return div();
                return div(
                    { class: "prayer-row__effect" },
                    player.prayers.every((id) => id === -1)
                        ? `Gaming bonus active: ${snapshot.val.gamingPercent}% of owned prayer bonuses, excluding Tachion of the Titans, with no curses.`
                        : `Gaming bonus: ${snapshot.val.gamingPercent}% of owned bonuses with no curses when all 12 slots are empty. Tachion of the Titans is excluded.`
                );
            },
            div({ class: "write-status", role: "status", "aria-live": "polite" }, message),
            rows
        ),
        initialWrapperClass: "scrollable-panel",
        loadingText: "READING PRAYERS",
        errorTitle: "PRAYERS READ FAILED",
    });
};
