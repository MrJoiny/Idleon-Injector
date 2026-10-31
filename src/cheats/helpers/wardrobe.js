import { cList, events, gga, itemDefs } from "../core/globals.js";
import { planPerfectEquipment, planFoodStacks } from "./perfectEquipment.js";
import { cheatState } from "../core/state.js";
import { equippedSpecialRolls } from "./specialEquipment.js";
import { equipmentWorld } from "./equipmentStones.js";
import { keychainRoll } from "./keychainRolls.js";
import { wardrobeClass, wardrobePresets } from "./wardrobePresets.js";

const clean = (name) => String(name).replace(/[_|]/g, " ");
const primaryStats = { Beginner: "LUK", Warrior: "STR", Archer: "AGI", Mage: "WIS" };
export function obolStats(definition, primaryStat) {
    const stats = {};
    let rollsLeft = 2;
    for (const field of ["UQ1", "UQ2"]) {
        if (String(definition[field + "txt"]) !== "0") {
            stats[field + "txt"] = definition[field + "txt"];
            stats[field + "val"] = 1;
            rollsLeft--;
        }
    }
    if (definition.Weapon_Power > 0 && ["HEXAGON_OBOL", "SPARKLE_OBOL"].includes(definition.Type))
        stats.Weapon_Power = 1;
    else stats[primaryStat] = Number(definition.ID) + 1;
    rollsLeft--;
    if (rollsLeft > 0) stats[primaryStat === "LUK" ? "AGI" : "LUK"] = Number(definition.ID) + 1;
    return stats;
}

/** Read-only plan. Each entry references an existing container; Haxe wrappers stay intact on commit. */
export function planWardrobe(
    a,
    definitions,
    lists,
    preset,
    craftingBonus,
    cardLevel,
    specialRolls = {},
    prayerCheat = false
) {
    const baseClass = wardrobeClass(Number(a.CharacterClass));
    if (preset.classIds && !preset.classIds.includes(Number(a.CharacterClass)))
        throw new Error("This loadout is not valid for this subclass.");
    if (!preset.classes.includes(baseClass)) throw new Error("This loadout is not valid for the active class.");
    if (preset.characterClass !== undefined && Number(a.CharacterClass) !== preset.characterClass)
        throw new Error("This saved loadout requires its original character class.");
    const world = equipmentWorld(a),
        primaryStat = primaryStats[baseClass];
    const entries = [],
        sections = [],
        notes = [];
    const put = (target, key, value) => {
        if (!target || !(key in target)) throw new Error("Loadout destination is unavailable. Nothing changed.");
        entries.push({ target, key, value });
    };
    const definition = (id) => {
        const d = definitions[id]?.h;
        if (!d) throw new Error("Unknown loadout item: " + id + ". Nothing changed.");
        return d;
    };
    const generated = {
        ...a,
        EquipmentOrder: a.EquipmentOrder.map((r) => r.map(() => "Blank")),
        EquipmentMap: a.EquipmentMap.map((r) => r.map(() => ({ h: {} }))),
    };
    const names = ["Equipment & specials", "Tools", "Food"];
    const requested = [
        preset.equipment.map((id) =>
            id === "Weapon" ? preset.weapons[baseClass] : id === "PortalRing" ? portalRing(a) : id
        ),
        preset.tools.map((id, slot) => (id === "BestTool" ? bestWardrobeTool(a, definitions, slot) : id)),
        preset.food,
    ];
    if (!Number.isInteger(Number(a.FoodSlotsOwned))) throw new Error("Food slot data is unavailable.");
    requested.forEach((items, group) => {
        const rows = [];
        items.forEach((id, slot) => {
            if (group === 0 && [8, 10, 14].includes(slot) && id !== "Keep")
                throw new Error("Protected cosmetic slot in loadout.");
            if (id === "Keep") {
                rows.push("Keep current item");
                return;
            }
            // Empty template food beyond the player's unlocked slots does not unlock or clear them.
            if (group === 2 && slot >= Number(a.FoodSlotsOwned)) {
                if (id !== "Blank")
                    notes.push(clean(definition(id).displayName) + ": food slot " + (slot + 1) + " is locked.");
                rows.push("Locked - unchanged");
                return;
            }
            if (id !== "Blank") {
                const d = definition(id);
                if (group < 2) {
                    if (
                        (d.Class && d.Class !== "ALL" && d.Class !== baseClass.toUpperCase()) ||
                        (/Arc0$|Tempest[0-8]$/.test(id) && !specialRolls[id])
                    ) {
                        notes.push(
                            clean(d.displayName) +
                                ": class or special-equipment requirement not met; kept current item."
                        );
                        rows.push("Keep current item");
                        return;
                    }
                    // Native equipment eligibility uses the tool's skill, otherwise character level.
                    const skills = {
                        aPick: [1, "Mining"],
                        aHatchet: [3, "Chopping"],
                        aFishingRod: [4, "Fishing"],
                        aBugNet: [6, "Catching"],
                        aTrap: [7, "Trapping"],
                        aSkull: [9, "Worship"],
                    };
                    const [index, label] = skills[d.typeGen] || [0, "Character"];
                    const required = Number(d.lvReqToEquip),
                        current = Number(a.Lv0[index]);
                    if (!Number.isFinite(required) || required < 0 || !Number.isFinite(current))
                        throw new Error(
                            "Equipment level requirement is unavailable for " +
                                clean(d.displayName) +
                                ". Nothing changed."
                        );
                    if (current < required) {
                        const reason =
                            clean(d.displayName) +
                            " requires " +
                            label +
                            " level " +
                            required +
                            "; current level is " +
                            current;
                        const fallback = group === 1 ? bestWardrobeTool(a, definitions, slot) : "Blank";
                        if (fallback === "Blank") {
                            notes.push(reason + ". Kept current item.");
                            rows.push("Keep current item");
                            return;
                        }
                        id = fallback;
                        notes.push(reason + ". Equipped " + clean(definition(id).displayName) + " instead.");
                    }
                }
            }
            generated.EquipmentOrder[group][slot] = id;
            put(a.EquipmentOrder[group], slot, id);
            put(a.EquipmentMap[group][slot], "h", {});
            const quantity =
                id === "Blank"
                    ? 0
                    : group === 2 && a.EquipmentOrder[group][slot] === id
                      ? Number(a.EquipmentQuantity[group][slot])
                      : 1;
            if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("Invalid equipped quantity.");
            put(a.EquipmentQuantity[group], slot, quantity);
            rows.push(id === "Blank" ? "Empty" : clean(definition(id).displayName));
        });
        sections.push({ title: names[group], items: rows });
    });
    const gear = planPerfectEquipment(generated, definitions, lists, craftingBonus, 0, specialRolls, world);
    for (const entry of entries) {
        if (entry.key !== "h") continue;
        const match = gear.equipment.find((e) => a.EquipmentMap[e.group][e.slot] === entry.target);
        if (match) entry.value = match.stats;
    }
    for (const slot of [9, 11]) {
        const id = requested[0][slot];
        if (id === "Keep" || id === "Blank") continue;
        if (definition(id).typeGen !== "aKeychain") throw new Error("Invalid keychain preset.");
        const entry = entries.find((e) => e.target === a.EquipmentMap[0][slot] && e.key === "h");
        if (entry)
            entry.value = preset.keychainStats?.[slot] || keychainRoll(id, preset.keychainPrimaryStat || primaryStat);
    }
    const playerIndex = a.GetPlayersUsernames.indexOf(a.UserInfo[0]);
    const saved = a.PlayerDATABASE.h[a.UserInfo[0]]?.h;
    if (playerIndex < 0 || !saved) throw new Error("Active character record is unavailable.");
    const wizardLevel = Math.max(
        0,
        ...a.GetPlayersUsernames.map((name) => {
            const player = name === a.UserInfo[0] ? a : a.PlayerDATABASE.h[name]?.h;
            return player && [32, 34, 35].includes(Number(player.CharacterClass)) ? Number(player.Lv0[0]) : 0;
        })
    );
    const prayerSlots = Math.min(
        12,
        lists.RANDOlist[9].slice(0, 8).filter((t) => wizardLevel >= Number(t)).length + Number(a.GemItemsPurchased[114])
    );
    const availablePrayers = (requested, report) => {
        const result = [];
        for (const id of requested) {
            if (id < 0) continue;
            if (!(Number(a.PrayersUnlocked[id]) > 0) || result.length >= prayerSlots) {
                if (report)
                    notes.push(
                        clean(lists.PrayerInfo[id]?.[0] || "Prayer " + id) + ": prayer or prayer slot not unlocked."
                    );
            } else result.push(id);
        }
        return result.concat(Array(12 - result.length).fill(-1));
    };
    const activePrayers = availablePrayers(
        prayerCheat && preset.prayersWithCheat ? preset.prayersWithCheat : preset.prayers,
        true
    );
    if (a.PrayersActive.length !== 12 || saved.Prayers.length !== 12) throw new Error("Prayer layout is unavailable.");
    activePrayers.forEach((id, slot) => {
        put(a.PrayersActive, slot, id);
        put(saved.Prayers, slot, id);
    });
    sections.push({
        title: prayerCheat && preset.prayersWithCheat ? "Prayers  -  cheat enabled" : "Prayers  -  vanilla",
        items: activePrayers.map((id) => (id < 0 ? "Empty" : clean(lists.PrayerInfo[id][0]))),
    });
    const chipThresholds = [5, 10, 15, 25, 35, 50, 75];
    if (!a.Lab[playerIndex + 1] || a.Lab[playerIndex + 1].length !== 7)
        throw new Error("Lab chip slots are unavailable.");
    const chips = a.Lab[playerIndex + 1].slice();
    for (const [slot, id] of preset.chips.entries()) {
        if (Number(a.Lv0[12]) < chipThresholds[slot] || (id !== -1 && !(Number(a.Lab[15][id]) > 0))) {
            if (id !== -1)
                notes.push(
                    clean(lists.ChipDesc[id]?.[0] || "Chip " + id) +
                        ": chip or lab slot not unlocked; kept current chip."
                );
            continue;
        }
        chips[slot] = id;
        put(a.Lab[playerIndex + 1], slot, id);
    }
    sections.push({
        title: "Lab chips",
        items: chips.map((id) => (id === -1 ? "Empty" : clean(lists.ChipDesc[id][0]))),
    });
    const knownCards = new Set(lists.CardStuff.flat().map((row) => row[0]));
    const cards = a.Cards[2].slice(),
        retained = [];
    const cardSlots = Math.min(8, 4 + Number(a.GemItemsPurchased[63]));
    for (let slot = 0; slot < 8; slot++) {
        const id = preset.cards[slot] || "B";
        if (slot >= cardSlots || (id !== "B" && (!knownCards.has(id) || !(Number(a.Cards[0].h[id]) > 0)))) {
            if (id !== "B")
                notes.push(clean(a.MonsterDefinitionsGET.h[id]?.h.Name || id) + ": card or card slot not unlocked.");
            retained.push(slot);
            cards[slot] = "B";
        } else cards[slot] = id;
    }
    for (const slot of retained) if (!cards.includes(a.Cards[2][slot])) cards[slot] = a.Cards[2][slot];
    if (cards.length < 8) throw new Error("Equipped card layout is unavailable.");
    cards.forEach((id, slot) => put(a.Cards[2], slot, id));
    const presetIndex = Number(a.PlayerStuff[2]);
    put(a.CardPreset, presetIndex, cards.slice());
    put(saved, "CardEquip", cards.slice());
    put(saved.CardPreset, presetIndex, cards.slice());
    let setMap = {};
    if (preset.cardSet !== -1) {
        const setCards = lists.CardStuff[preset.cardSet].filter((row) => row[0] !== "Blank");
        const levels = setCards.map((row) => Number(cardLevel(row[0])));
        if (!levels.length || levels.some((l) => !Number.isFinite(l) || l < 0))
            throw new Error("Card set level is unavailable.");
        const set = lists.CardSets[preset.cardSet];
        const value = Math.round(Math.floor(levels.reduce((s, v) => s + v, 0) / levels.length) * Number(set[1]));
        if (!(value > 0)) {
            notes.push("Card set bonus is not unlocked; kept current set.");
            setMap = { ...a.Cards[3].h };
        } else setMap = { [set[0]]: value };
    }
    put(a.Cards[3], "h", setMap);
    put(saved.CSetEq, "h", { ...setMap });
    sections.push({
        title: "Cards - " + (preset.cardSetName || "Saved set"),
        items: cards.slice(0, 8).map((id) => (id === "B" ? "Empty" : clean(a.MonsterDefinitionsGET.h[id].h.Name))),
    });
    for (let group = 0; group < 2; group++) {
        if (preset.obolSlots && preset.obolSlots[group].length !== a.ObolEquippedOrder[group].length)
            throw new Error("Saved obol layout does not match this character.");
        a.ObolEquippedOrder[group].forEach((current, slot) => {
            if (/Locked/.test(current)) return;
            const shape = lists.ObolShapes[Number(lists.ObolXYcoords[group]?.[slot]?.[2])];
            const id = preset.obolSlots ? preset.obolSlots[group][slot] : preset.obols[shape];
            if (id === "Keep") return;
            if (id === "Blank") {
                put(a.ObolEquippedOrder[group], slot, id);
                put(a.ObolEquippedMap[group][slot], "h", {});
                return;
            }
            const d = definition(id);
            if (d.typeGen !== "aObol" + shape) throw new Error("Obol shape does not match its destination.");
            put(a.ObolEquippedOrder[group], slot, id);
            put(a.ObolEquippedMap[group][slot], "h", obolStats(d, primaryStat));
        });
    }
    sections.push({
        title: "Personal & family obols · unlocked slots",
        labels: preset.obolSlots
            ? preset.obolSlots.flatMap((row, group) =>
                  row.map(
                      (_, slot) =>
                          (group === 0 ? "Personal " : "Family ") +
                          lists.ObolShapes[Number(lists.ObolXYcoords[group]?.[slot]?.[2])] +
                          " obol"
                  )
              )
            : Object.keys(preset.obols).map((shape) => shape + " obol"),
        items: (preset.obolSlots ? preset.obolSlots.flat() : Object.values(preset.obols)).map((id) =>
            id === "Keep" ? "Keep" : id === "Blank" ? "Empty" : clean(definition(id).displayName)
        ),
    });
    return {
        entries,
        sections,
        world,
        baseClass,
        primaryStat,
        notes,
        vanillaPrayers: availablePrayers(preset.prayers, false),
        expandedPrayers: prayerCheat && preset.prayersWithCheat ? activePrayers.slice() : null,
        presetId: preset.id,
        name: preset.name,
        character: a.UserInfo[0],
    };
}

export function applyWardrobePlan(plan, attributes, recalculate, foodCapacity) {
    const applied = [];
    const assign = (target, key, value) => {
        applied.push({ target, key, before: target[key] });
        target[key] = value;
    };
    try {
        for (const { target, key, value } of plan.entries) assign(target, key, value);
        recalculate();
        for (const { slot, quantity } of planFoodStacks(attributes, foodCapacity()))
            assign(attributes.EquipmentQuantity[2], slot, quantity);
        recalculate();
        for (const { target, key, value } of plan.entries) {
            // Food quantities can legitimately be raised after the plan is applied.
            if (target === attributes.EquipmentQuantity[2]) continue;
            if (JSON.stringify(target[key]) !== JSON.stringify(value)) throw new Error("Loadout verification failed.");
        }
    } catch (error) {
        for (const { target, key, before } of applied.reverse()) target[key] = before;
        let rollbackError = "";
        try {
            recalculate();
        } catch (caught) {
            rollbackError = " Recalculation after rollback failed: " + caught.message;
        }
        throw new Error("Loadout rolled back. " + error.message + rollbackError);
    }
}

let pending = null;
function createPlan(id, custom = null) {
    const preset = custom || wardrobePresets.find((p) => p.id === id);
    if (!preset) throw new Error("Unknown wardrobe loadout.");
    return planWardrobe(
        gga,
        itemDefs,
        cList,
        preset,
        Math.floor(4 + 8 * events(189)._customBlock_GetBribeBonus("28")),
        (id) => events(12)._customBlock_RunCodeOfTypeXforThingY("CardLv", id),
        equippedSpecialRolls(
            preset.equipment.map((item) =>
                item === "Weapon" ? preset.weapons[wardrobeClass(Number(gga.CharacterClass))] : item
            ),
            true
        ),
        Boolean(cheatState.w3.prayer)
    );
}
function fingerprint(plan) {
    return JSON.stringify([
        plan.character,
        plan.baseClass,
        Number(gga.CharacterClass),
        plan.world,
        Boolean(cheatState.w3.prayer),
        plan.entries.filter((e) => e.target !== gga.EquipmentQuantity[2]).map((e) => [e.target[e.key], e.value]),
    ]);
}
function recalculate() {
    delete gga.DNSM.h.PrayNonEq;
    events(345)._customBlock_ActionBlock("RecalcChipBonuses", "0", 0, 0);
    events(124)._customBlock_TalentCalc(-4);
    gga.DNSM.h.TotStatMAP.h = {};
    events(12)._customBlock_TotalStats("calcEtcBonuses");
}
export function wardrobeCommand(params) {
    const [action = "status", id, token] = params.slice(1);
    if (typeof gga.UserInfo[0] !== "string" || !gga.GetPlayersUsernames.includes(gga.UserInfo[0])) {
        pending = null;
        throw new Error("Select a character in the game before using Wardrobe.");
    }
    if (action === "status") {
        const baseClass = wardrobeClass(Number(gga.CharacterClass));
        return JSON.stringify({
            character: gga.UserInfo[0],
            characterClass: Number(gga.CharacterClass),
            baseClass,
            world: equipmentWorld(gga),
            prayerCheat: Boolean(cheatState.w3.prayer),
            presets: wardrobePresets
                .filter(
                    (p) =>
                        p.classes.includes(baseClass) &&
                        (!p.classIds || p.classIds.includes(Number(gga.CharacterClass)))
                )
                .map((p) => ({ id: p.id, name: p.name, description: p.description })),
        });
    }
    if (action === "capture") return JSON.stringify(captureWardrobe(gga, cList));
    if (action === "cancel") {
        pending = null;
        return JSON.stringify({ cancelled: true });
    }
    if (action === "preview" || action === "preview-saved") {
        pending = null;
        const custom = action === "preview-saved" ? validateSavedWardrobe(JSON.parse(decodeURIComponent(id))) : null;
        const loadoutId = custom ? custom.id : id;
        const plan = createPlan(loadoutId, custom);
        const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
        pending = { id: loadoutId, custom, token, fingerprint: fingerprint(plan), expires: Date.now() + 120000 };
        return JSON.stringify({
            token,
            character: plan.character,
            name: plan.name,
            baseClass: plan.baseClass,
            world: plan.world,
            sections: plan.sections,
            notes: plan.notes,
        });
    }
    if (action === "apply") {
        const consent = pending;
        pending = null;
        if (!consent || consent.id !== id || consent.token !== token || Date.now() > consent.expires)
            throw new Error("Preview this loadout and confirm again.");
        const plan = createPlan(id, consent.custom);
        if (fingerprint(plan) !== consent.fingerprint)
            throw new Error("Character or loadout state changed. Preview and confirm again.");
        if (
            !gga.DNSM.h.TotStatMAP?.h ||
            !gga.PixelHelperActor[6].behaviors.getBehavior("ActorEvents_312")._GenINFO[45]?.h
        )
            throw new Error("Game stat caches are not ready. Open Cards once, close it, and try again.");
        applyWardrobePlan(plan, gga, recalculate, () => Math.floor(events(12)._customBlock_MaxCapacity("cFood")));
        if (plan.expandedPrayers)
            appliedPrayerLoadouts.set(plan.character, { vanilla: plan.vanillaPrayers, expanded: plan.expandedPrayers });
        else appliedPrayerLoadouts.delete(plan.character);
        return JSON.stringify({
            notes: plan.notes,
            message:
                plan.name +
                " applied permanently to " +
                plan.character +
                ". Reopen the game inventory to refresh its display.",
        });
    }
    throw new Error("Unknown Wardrobe action.");
}

/** Capture choices only. Applying rebuilds gear for the active character, never restores old rolls. */
export function captureWardrobe(a, lists) {
    const player = a.GetPlayersUsernames.indexOf(a.UserInfo[0]);
    if (player < 0) throw new Error("Select a character before saving a loadout.");
    const equipment = a.EquipmentOrder[0].slice(0, 16);
    for (const slot of [8, 10, 14]) equipment[slot] = "Keep";
    const setKeys = Object.keys(a.Cards[3].h);
    const cardSet = setKeys.length ? lists.CardSets.findIndex((row) => row[0] === setKeys[0]) : -1;
    if (setKeys.length && cardSet < 0) throw new Error("Current card set is unknown; nothing saved.");
    const baseClass = wardrobeClass(Number(a.CharacterClass));
    const keychainStats = {};
    for (const slot of [9, 11]) {
        if (equipment[slot] === "Blank") continue;
        try {
            keychainStats[slot] = keychainRoll(equipment[slot], primaryStats[baseClass]);
        } catch {
            keychainStats[slot] = { ...a.EquipmentMap[0][slot].h };
        }
    }
    return validateSavedWardrobe({
        version: 1,
        id: "saved-" + Date.now().toString(36) + Math.random().toString(36).slice(2),
        name: "My loadout",
        description: "Saved from " + a.UserInfo[0],
        classes: [baseClass],
        ...(equipment.some((id) => /Arc0$|Tempest[0-8]$/.test(id)) ? { characterClass: Number(a.CharacterClass) } : {}),
        equipment,
        tools: a.EquipmentOrder[1].slice(0, 7),
        food: a.EquipmentOrder[2].slice(0, 6).map((id, slot) => (slot < Number(a.FoodSlotsOwned) ? id : "Blank")),
        chips: a.Lab[player + 1].slice(),
        cards: a.Cards[2].slice(0, 8),
        cardSet,
        prayers: a.PrayersActive.slice(),
        obolSlots: a.ObolEquippedOrder.slice(0, 2).map((row) => row.map((id) => (/Locked/.test(id) ? "Keep" : id))),
        keychainStats,
    });
}

export function validateSavedWardrobe(value) {
    const fail = () => {
        throw new Error("Invalid saved loadout. Save the current loadout again.");
    };
    if (
        !value ||
        value.version !== 1 ||
        typeof value.id !== "string" ||
        !/^saved-[a-z0-9-]{1,80}$/.test(value.id) ||
        typeof value.name !== "string" ||
        !value.name.trim() ||
        value.name.length > 80
    )
        fail();
    const ids = (row, length) =>
        Array.isArray(row) &&
        row.length === length &&
        row.every((id) => typeof id === "string" && /^[A-Za-z0-9_]+$/.test(id));
    const nums = (row, length) =>
        Array.isArray(row) &&
        row.length === length &&
        row.every((id) => Number.isInteger(id) && id >= -1 && id < 10000);
    if (
        !ids(value.equipment, 16) ||
        !ids(value.tools, 7) ||
        !ids(value.food, 6) ||
        !ids(value.cards, 8) ||
        !nums(value.chips, 7) ||
        !nums(value.prayers, 12) ||
        !Number.isInteger(value.cardSet) ||
        value.cardSet < -1 ||
        value.cardSet > 1000
    )
        fail();
    if (![8, 10, 14].every((slot) => value.equipment[slot] === "Keep")) fail();
    if (
        !Array.isArray(value.classes) ||
        value.classes.length !== 1 ||
        !Object.keys(primaryStats).includes(value.classes[0])
    )
        fail();
    if (
        value.characterClass !== undefined &&
        (!Number.isInteger(value.characterClass) || wardrobeClass(value.characterClass) !== value.classes[0])
    )
        fail();
    if (
        !Array.isArray(value.obolSlots) ||
        value.obolSlots.length !== 2 ||
        value.obolSlots.some((row) => !Array.isArray(row) || row.length > 100 || !ids(row, row.length))
    )
        fail();
    const keychainStats = {};
    for (const slot of [9, 11]) {
        const stats = value.keychainStats?.[slot] || {};
        if (!stats || typeof stats !== "object" || Array.isArray(stats)) fail();
        keychainStats[slot] = {};
        for (const [key, val] of Object.entries(stats)) {
            if (["UQ1txt", "UQ2txt"].includes(key)) {
                if (typeof val !== "string" || val.length > 100) fail();
            } else if (
                ![
                    "UQ1val",
                    "UQ2val",
                    "Weapon_Power",
                    "Defence",
                    "STR",
                    "AGI",
                    "WIS",
                    "LUK",
                    "Upgrade_Slots_Left",
                    "AwesomeStats",
                ].includes(key) ||
                typeof val !== "number" ||
                !Number.isFinite(val)
            )
                fail();
            keychainStats[slot][key] = val;
        }
    }
    return JSON.parse(
        JSON.stringify({
            version: 1,
            id: value.id,
            name: value.name.trim(),
            description: "Player-made loadout",
            classes: value.classes,
            ...(value.characterClass === undefined ? {} : { characterClass: value.characterClass }),
            equipment: value.equipment,
            tools: value.tools,
            food: value.food,
            chips: value.chips,
            cards: value.cards,
            cardSet: value.cardSet,
            prayers: value.prayers,
            obolSlots: value.obolSlots,
            keychainStats,
        })
    );
}

export function bestWardrobeTool(a, definitions, slot) {
    const types = ["aPick", "aHatchet", "aFishingRod", "aBugNet", "aTrap", "aSkull", "aDNAgun"];
    const skill = [1, 3, 4, 6, 7, 9, 0][slot];
    const level = Number(a.Lv0[skill]);
    if (!Number.isFinite(level)) throw new Error("Tool skill level is unavailable.");
    const candidates = Object.entries(definitions).filter(
        ([, { h: d }]) =>
            d.typeGen === types[slot] &&
            Number.isFinite(Number(d.lvReqToEquip)) &&
            Number(d.lvReqToEquip) <= level &&
            (d.Class === "ALL" || d.Class === wardrobeClass(Number(a.CharacterClass)).toUpperCase())
    );
    candidates.sort(
        ([, x], [, y]) =>
            Number(y.h.lvReqToEquip) - Number(x.h.lvReqToEquip) || Number(y.h.Weapon_Power) - Number(x.h.Weapon_Power)
    );
    return candidates[0]?.[0] || "Blank";
}
function portalRing(a) {
    const map = Number(a.CurrentMap);
    if (!Number.isInteger(map) || map < 0) throw new Error("Current world is unavailable for portal rings.");
    return (
        {
            1: "EquipmentRings33",
            2: "EquipmentRings31",
            3: "EquipmentRings32",
            4: "EquipmentRings34",
            5: "EquipmentRings37",
        }[Math.floor(map / 50)] || "Keep"
    );
}

const appliedPrayerLoadouts = new Map();
export function restoreWardrobePrayers(attributes, recalc) {
    const writes = [];
    for (const [name, record] of appliedPrayerLoadouts) {
        const saved = attributes.PlayerDATABASE.h[name]?.h.Prayers;
        const current = name === attributes.UserInfo[0] ? attributes.PrayersActive : null;
        for (const target of [saved, current]) {
            if (!target || JSON.stringify(target) !== JSON.stringify(record.expanded)) continue;
            target.forEach((before, slot) => writes.push({ target, slot, before, after: record.vanilla[slot] }));
        }
    }
    try {
        for (const w of writes) w.target[w.slot] = w.after;
        if (writes.some((w) => w.target === attributes.PrayersActive)) recalc();
    } catch (error) {
        for (const w of writes) w.target[w.slot] = w.before;
        throw error;
    }
    appliedPrayerLoadouts.clear();
}
export function setupWardrobePrayerSync() {
    let enabled = Boolean(cheatState.w3.prayer);
    Object.defineProperty(cheatState.w3, "prayer", {
        enumerable: true,
        configurable: true,
        get: () => enabled,
        set: (next) => {
            const before = enabled;
            enabled = Boolean(next);
            if (before && !enabled && appliedPrayerLoadouts.size) {
                try {
                    restoreWardrobePrayers(gga, recalculate);
                } catch (error) {
                    enabled = before;
                    recalculate();
                    throw error;
                }
            }
        },
    });
}
