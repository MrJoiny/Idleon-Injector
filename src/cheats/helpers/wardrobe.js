import { cList, events, gga, itemDefs } from "../core/globals.js";
import { planPerfectEquipment, planFoodStacks } from "./perfectEquipment.js";
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
export function planWardrobe(a, definitions, lists, preset, craftingBonus, cardLevel) {
    const baseClass = wardrobeClass(Number(a.CharacterClass));
    if (!preset.classes.includes(baseClass)) throw new Error("This loadout is not valid for the active class.");
    const world = equipmentWorld(a),
        primaryStat = primaryStats[baseClass];
    const entries = [],
        sections = [];
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
        EquipmentOrder: a.EquipmentOrder.map((r) => r.slice()),
        EquipmentMap: a.EquipmentMap.map((r) => r.map(() => ({ h: {} }))),
    };
    const names = ["Equipment & specials", "Tools", "Food"];
    const requested = [
        preset.equipment.map((id) => (id === "Weapon" ? preset.weapons[baseClass] : id)),
        preset.tools,
        preset.food,
    ];
    if (
        !Number.isInteger(Number(a.FoodSlotsOwned)) ||
        Number(a.FoodSlotsOwned) < preset.food.filter((id) => id !== "Blank").length
    )
        throw new Error("This loadout needs five unlocked food slots.");
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
            if (group === 2 && slot >= Number(a.FoodSlotsOwned)) return;
            if (id !== "Blank") definition(id);
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
    const gear = planPerfectEquipment(generated, definitions, lists, craftingBonus, 0, {}, world);
    for (const entry of entries) {
        if (entry.key !== "h") continue;
        const match = gear.equipment.find((e) => a.EquipmentMap[e.group][e.slot] === entry.target);
        if (match) entry.value = match.stats;
    }
    for (const slot of [9, 11]) {
        const id = requested[0][slot];
        if (id === "Keep" || id === "Blank") continue;
        if (definition(id).typeGen !== "aKeychain") throw new Error("Invalid keychain preset.");
        entries.find((e) => e.target === a.EquipmentMap[0][slot] && e.key === "h").value = keychainRoll(
            id,
            primaryStat
        );
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
    const prayers = preset.prayers.filter((id) => id >= 0);
    if (prayers.length > prayerSlots || prayers.some((id) => !(Number(a.PrayersUnlocked[id]) > 0)))
        throw new Error("Unlock the preset prayers and enough prayer slots before applying this loadout.");
    if (a.PrayersActive.length !== 12 || saved.Prayers.length !== 12) throw new Error("Prayer layout is unavailable.");
    preset.prayers.forEach((id, slot) => {
        put(a.PrayersActive, slot, id);
        put(saved.Prayers, slot, id);
    });
    sections.push({
        title: "Prayers",
        items: preset.prayers.map((id) => (id < 0 ? "Empty" : clean(lists.PrayerInfo[id][0]))),
    });
    if (Number(a.Lv0[12]) < 75) throw new Error("This loadout requires Laboratory level 75 for seven chip slots.");
    if (!a.Lab[playerIndex + 1] || a.Lab[playerIndex + 1].length !== 7)
        throw new Error("Lab chip slots are unavailable.");
    for (const [slot, id] of preset.chips.entries()) {
        if (!lists.ChipDesc[id] || !(Number(a.Lab[15][id]) > 0))
            throw new Error("Unlock all preset lab chips before applying this loadout.");
        put(a.Lab[playerIndex + 1], slot, id);
    }
    sections.push({ title: "Lab chips", items: preset.chips.map((id) => clean(lists.ChipDesc[id][0])) });
    const knownCards = new Set(lists.CardStuff.flat().map((row) => row[0]));
    if (4 + Number(a.GemItemsPurchased[63]) < preset.cards.length)
        throw new Error("This loadout requires eight unlocked card slots.");
    if (preset.cards.some((id) => !knownCards.has(id) || !(Number(a.Cards[0].h[id]) > 0)))
        throw new Error("Collect all preset cards before applying this loadout.");
    const cards = a.Cards[2].map((_, i) => preset.cards[i] || "B");
    if (cards.length < 8) throw new Error("Equipped card layout is unavailable.");
    cards.forEach((id, slot) => put(a.Cards[2], slot, id));
    const presetIndex = Number(a.PlayerStuff[2]);
    put(a.CardPreset, presetIndex, cards.slice());
    put(saved, "CardEquip", cards.slice());
    put(saved.CardPreset, presetIndex, cards.slice());
    const setCards = lists.CardStuff[preset.cardSet].filter((row) => row[0] !== "Blank");
    const levels = setCards.map((row) => Number(cardLevel(row[0])));
    if (!levels.length || levels.some((l) => !Number.isFinite(l) || l < 0))
        throw new Error("Card set level is unavailable.");
    const set = lists.CardSets[preset.cardSet];
    const value = Math.round(Math.floor(levels.reduce((s, v) => s + v, 0) / levels.length) * Number(set[1]));
    if (!(value > 0)) throw new Error("Unlock the preset card-set bonus before applying this loadout.");
    const setMap = { [set[0]]: value };
    put(a.Cards[3], "h", setMap);
    put(saved.CSetEq, "h", { ...setMap });
    sections.push({
        title: "Cards · Smoulderin' Plateau",
        items: preset.cards.map((id) => clean(a.MonsterDefinitionsGET.h[id].h.Name)),
    });
    for (let group = 0; group < 2; group++) {
        a.ObolEquippedOrder[group].forEach((current, slot) => {
            if (/Locked/.test(current)) return;
            const shape = lists.ObolShapes[Number(lists.ObolXYcoords[group]?.[slot]?.[2])];
            const id = preset.obols[shape],
                d = definition(id);
            if (d.typeGen !== "aObol" + shape) throw new Error("Obol shape does not match its destination.");
            put(a.ObolEquippedOrder[group], slot, id);
            put(a.ObolEquippedMap[group][slot], "h", obolStats(d, primaryStat));
        });
    }
    sections.push({
        title: "Personal & family obols · unlocked slots",
        items: Object.values(preset.obols).map((id) => clean(definition(id).displayName)),
    });
    return {
        entries,
        sections,
        world,
        baseClass,
        primaryStat,
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
function createPlan(id) {
    const preset = wardrobePresets.find((p) => p.id === id);
    if (!preset) throw new Error("Unknown wardrobe loadout.");
    return planWardrobe(
        gga,
        itemDefs,
        cList,
        preset,
        Math.floor(4 + 8 * events(189)._customBlock_GetBribeBonus("28")),
        (id) => events(12)._customBlock_RunCodeOfTypeXforThingY("CardLv", id)
    );
}
function fingerprint(plan) {
    return JSON.stringify([
        plan.character,
        plan.baseClass,
        Number(gga.CharacterClass),
        plan.world,
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
            baseClass,
            world: equipmentWorld(gga),
            presets: wardrobePresets
                .filter((p) => p.classes.includes(baseClass))
                .map((p) => ({ id: p.id, name: p.name, description: p.description })),
        });
    }
    if (action === "cancel") {
        pending = null;
        return JSON.stringify({ cancelled: true });
    }
    if (action === "preview") {
        pending = null;
        const plan = createPlan(id);
        const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
        pending = { id, token, fingerprint: fingerprint(plan), expires: Date.now() + 120000 };
        return JSON.stringify({
            token,
            character: plan.character,
            name: plan.name,
            baseClass: plan.baseClass,
            world: plan.world,
            sections: plan.sections,
        });
    }
    if (action === "apply") {
        const consent = pending;
        pending = null;
        if (!consent || consent.id !== id || consent.token !== token || Date.now() > consent.expires)
            throw new Error("Preview this loadout and confirm again.");
        const plan = createPlan(id);
        if (fingerprint(plan) !== consent.fingerprint)
            throw new Error("Character or loadout state changed. Preview and confirm again.");
        if (
            !gga.DNSM.h.TotStatMAP?.h ||
            !gga.PixelHelperActor[6].behaviors.getBehavior("ActorEvents_312")._GenINFO[45]?.h
        )
            throw new Error("Game stat caches are not ready. Open Cards once, close it, and try again.");
        applyWardrobePlan(plan, gga, recalculate, () => Math.floor(events(12)._customBlock_MaxCapacity("cFood")));
        return JSON.stringify({
            message:
                plan.name +
                " applied permanently to " +
                plan.character +
                ". Reopen the game inventory to refresh its display.",
        });
    }
    throw new Error("Unknown Wardrobe action.");
}
