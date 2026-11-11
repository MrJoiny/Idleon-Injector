import { planPerfectEquipment, planFoodStacks } from "../../helpers/perfectEquipment.js";
import { equipmentWorld } from "../../helpers/equipmentStones.js";
import { perfectObolStats } from "../../helpers/obolRolling.js";
import { wardrobeClass, primaryStats } from "./presets.js";
const clean = (name) => String(name).replace(/[_|]/g, " ");

/** Explicit Wardrobe preferences, stored as modifiers. Fixed Spiritlord stats stay in definitions. */
export function keychainRoll(item, primaryStat) {
    const roll = (text, first, second = first) => ({ UQ1txt: text, UQ1val: first, UQ2txt: text, UQ2val: second });
    if (item === "EquipmentKeychain11") return roll("%_DROP_CHANCE", 15, 10);
    if (item === "EquipmentKeychain22") return roll("%_MOB_RESPAWN", 6);
    if (item === "EquipmentKeychain19") return roll("%_ALL_AFK_GAIN", 5);
    if (item === "EquipmentKeychain16") return roll("%_MULTIKILL", 12);
    if (item === "EquipmentKeychain18" && ["STR", "AGI"].includes(primaryStat)) return roll("%_" + primaryStat, 6);
    if (item === "EquipmentKeychain29") return {};
    throw new Error("No preferred keychain rolls are configured for this class and item.");
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
        preset.equipment.map((id, slot) =>
            slot === 12
                ? "Keep"
                : id === "Weapon"
                  ? preset.weapons[baseClass]
                  : id === "PortalRing"
                    ? portalRing(a)
                    : id
        ),
        preset.tools.map((id, slot) => (id === "BestTool" ? bestWardrobeTool(a, definitions, slot) : id)),
        preset.food,
    ];
    if (!Number.isInteger(Number(a.FoodSlotsOwned))) throw new Error("Food slot data is unavailable.");
    requested.forEach((items, group) => {
        const rows = [];
        items.forEach((id, slot) => {
            if (group === 0 && [8, 10, 12, 14].includes(slot) && id !== "Keep")
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
                        notes.push(reason + ". Equipping " + clean(definition(id).displayName) + " instead.");
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
            rows.push(
                id === "Blank"
                    ? group === 1 && preset.tools[slot] === "BestTool"
                        ? "No eligible tool at your current skill level"
                        : "Empty"
                    : clean(definition(id).displayName)
            );
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
            put(a.ObolEquippedMap[group][slot], "h", perfectObolStats(d, primaryStat));
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
        // Capture the old loadout before replacement resets food quantities.
        planFoodStacks(attributes, 0);
        let previousFoodStack = 0;
        for (let slot = 0; slot < Number(attributes.FoodSlotsOwned); slot++) {
            if (attributes.EquipmentOrder[2][slot] !== "Blank")
                previousFoodStack = Math.max(previousFoodStack, Number(attributes.EquipmentQuantity[2][slot]));
        }
        for (const { target, key, value } of plan.entries) assign(target, key, value);
        recalculate();
        const capacity = foodCapacity();
        if (!Number.isSafeInteger(capacity) || capacity < 0) throw new Error("Invalid food capacity.");
        for (const { slot, quantity } of planFoodStacks(attributes, Math.max(capacity, previousFoodStack)))
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
