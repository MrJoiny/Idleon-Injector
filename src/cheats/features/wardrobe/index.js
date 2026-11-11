import { cList, events, gga, itemDefs } from "../../core/globals.js";
import { cheatState } from "../../core/state.js";
import { craftingBonuses } from "../../helpers/perfectEquipment.js";
import { equippedSpecialRolls } from "../../helpers/specialEquipment.js";
import { equipmentWorld } from "../../helpers/equipmentStones.js";
import { planWardrobe, applyWardrobePlan, keychainRoll, foodStackLimits } from "./planner.js";
import { wardrobeClass, wardrobePresets, primaryStats } from "./presets.js";

let pending = null;
const goldenFoodMaxima = new Map();
function createPlan(id, custom = null) {
    const preset = custom || wardrobePresets.find((p) => p.id === id);
    if (!preset) throw new Error("Unknown wardrobe loadout.");
    return planWardrobe(
        gga,
        itemDefs,
        cList,
        preset,
        craftingBonuses(),
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
export function wardrobeAction(action = "status", { id, token, loadout, goldenFoodHistory = {} } = {}) {
    if (typeof gga.UserInfo[0] !== "string" || !gga.GetPlayersUsernames.includes(gga.UserInfo[0])) {
        pending = null;
        throw new Error("Select a character in the game before using Wardrobe.");
    }
    if (action === "status") {
        const character = gga.UserInfo[0];
        const recorded = goldenFoodHistory[character] || 0;
        const foodLimits = foodStackLimits(
            gga,
            Math.floor(events(12)._customBlock_MaxCapacity("cFood")),
            Math.max(recorded, goldenFoodMaxima.get(character) || 0)
        );
        goldenFoodMaxima.set(character, foodLimits.golden);
        const baseClass = wardrobeClass(Number(gga.CharacterClass));
        return {
            character: gga.UserInfo[0],
            characterClass: Number(gga.CharacterClass),
            baseClass,
            world: equipmentWorld(gga),
            prayerCheat: Boolean(cheatState.w3.prayer),
            foodLimits,
            presets: wardrobePresets
                .filter(
                    (p) =>
                        p.classes.includes(baseClass) &&
                        (!p.classIds || p.classIds.includes(Number(gga.CharacterClass)))
                )
                .map((p) => ({ id: p.id, name: p.name, description: p.description })),
        };
    }
    if (action === "capture") return captureWardrobe(gga, cList);
    if (action === "cancel") {
        pending = null;
        return { cancelled: true };
    }
    if (action === "preview") {
        pending = null;
        const custom = loadout ? validateSavedWardrobe(loadout) : null;
        const loadoutId = custom ? custom.id : id;
        const plan = createPlan(loadoutId, custom);
        const foodLimits = foodStackLimits(
            gga,
            Math.floor(events(12)._customBlock_MaxCapacity("cFood")),
            goldenFoodMaxima.get(plan.character) || 0
        );
        const food = plan.sections.find((section) => section.title === "Food");
        food.quantities = food.items.map((_, slot) => {
            if (slot >= Number(gga.FoodSlotsOwned)) return null;
            const id =
                plan.entries.find((entry) => entry.target === gga.EquipmentOrder[2] && entry.key === slot)?.value ||
                gga.EquipmentOrder[2][slot];
            return id === "Blank" ? null : /^FoodG[0-9]+$/.test(id) ? foodLimits.golden : foodLimits.regular;
        });
        const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
        pending = { id: loadoutId, custom, token, fingerprint: fingerprint(plan), expires: Date.now() + 120000 };
        return {
            token,
            character: plan.character,
            name: plan.name,
            baseClass: plan.baseClass,
            world: plan.world,
            sections: plan.sections,
            foodLimits,
            notes: plan.notes,
        };
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
        const foodLimits = applyWardrobePlan(
            plan,
            gga,
            recalculate,
            () => Math.floor(events(12)._customBlock_MaxCapacity("cFood")),
            goldenFoodMaxima.get(plan.character) || 0
        );
        goldenFoodMaxima.set(plan.character, foodLimits.golden);
        if (plan.expandedPrayers)
            appliedPrayerLoadouts.set(plan.character, { vanilla: plan.vanillaPrayers, expanded: plan.expandedPrayers });
        else appliedPrayerLoadouts.delete(plan.character);
        return {
            notes: plan.notes,
            foodLimits,
            message: plan.name + " applied to " + plan.character + ".",
        };
    }
    throw new Error("Unknown Wardrobe action.");
}

/** Capture choices only. Applying rebuilds gear for the active character, never restores old rolls. */
export function captureWardrobe(a, lists) {
    const player = a.GetPlayersUsernames.indexOf(a.UserInfo[0]);
    if (player < 0) throw new Error("Select a character before saving a loadout.");
    const equipment = a.EquipmentOrder[0].slice(0, 16);
    for (const slot of [8, 10, 12, 14]) equipment[slot] = "Keep";
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
