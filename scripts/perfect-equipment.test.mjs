import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(new URL("../src/cheats/helpers/perfectEquipment.js", import.meta.url), "utf8");
const { planPerfectEquipment, perfectEquipped, bindFixture } = await import(
    `data:text/javascript,${encodeURIComponent(source.replace(/^import .*;\r?\n/, "let cList, events, gga, itemDefs; export function bindFixture(f) { ({cList, events, gga, itemDefs} = f); }"))}`
);

function fixture() {
    const attributes = {
        CharacterClass: 19,
        FoodSlotsOwned: 6,
        EquipmentOrder: Array.from({ length: 3 }, () => Array(16).fill("Blank")),
        EquipmentMap: Array.from({ length: 3 }, () => Array.from({ length: 16 }, () => ({ h: {} }))),
        EquipmentQuantity: Array.from({ length: 3 }, () => Array(16).fill(0)),
    };
    const definitions = {
        Hat: { h: { typeGen: "aHelmet", Upgrade_Slots_Left: 12, UQ1val: 25, AGI: 140 } },
        Pick: { h: { typeGen: "aPick", Upgrade_Slots_Left: 7, UQ1val: 35, AGI: 25, Weapon_Power: 62 } },
        Weapon: { h: { typeGen: "aWeapon", Upgrade_Slots_Left: 3, UQ1val: 0 } },
        Ring: { h: { typeGen: "aRing", Upgrade_Slots_Left: 2, UQ1val: 0 } },
        StoneA8: { h: { Trigger: 1, Effect: "Weapon_Power,2.Defence,20.Main_Stat,15.Misc_Bonus,1" } },
        StoneW9: { h: { Trigger: 1, Effect: "Weapon_Power,10.Main_Stat,10.Misc_Bonus,3" } },
        StoneT8: { h: { Trigger: 1, Effect: "Weapon_Power,12.Main_Stat,15.Misc_Bonus,2" } },
    };
    const lists = { ItemToCraftNAME: [["Hat", "Pick", "Weapon"]], EquiptypeGens: [["aHelmet", "aRing"], ["aPick"]] };
    const equip = (group, slot, item) => {
        attributes.EquipmentOrder[group][slot] = item;
        attributes.EquipmentMap[group][slot].h = { AGI: 999, STR: 999, UQ2val: 50, Upgrade_Slots_Left: -99 };
    };
    const plan = (bonus = 12, capacity = 1000) => planPerfectEquipment(attributes, definitions, lists, bonus, capacity);
    return { attributes, definitions, lists, equip, plan };
}

test("VII tool result matches the observed eight-stone pickaxe, without doubling base stats", () => {
    const f = fixture();
    f.equip(1, 0, "Pick");
    const before = structuredClone(f.attributes);
    const stats = f.plan().equipment[0].stats;
    assert.equal(stats.Weapon_Power + 62, 158);
    assert.equal(stats.AGI + 25, 157);
    assert.equal(stats.UQ1val + 35, 51);
    assert.equal(stats.UQ2val, 0);
    assert.equal(stats.Upgrade_Slots_Left + 7, 0);
    assert.deepEqual(f.attributes, before, "planning is read-only");
});

test("armor and weapons use separate stones; only craftable items gain a slot and crafting bonus", () => {
    const f = fixture();
    f.equip(0, 0, "Hat");
    f.equip(0, 1, "Weapon");
    f.equip(0, 5, "Ring");
    const [hat, weapon, ring] = f.plan().equipment.map((entry) => entry.stats);
    assert.equal(hat.AGI, 207);
    assert.equal(hat.Weapon_Power, 26);
    assert.equal(hat.Defence, 260);
    assert.equal(hat.UQ1val, 13);
    assert.equal(hat.Upgrade_Slots_Left, -12);
    assert.equal(weapon.Weapon_Power, 40);
    assert.equal(weapon.AGI, 52);
    assert.equal(weapon.Defence, 12);
    assert.equal(ring.AGI, 30);
    assert.equal(ring.Defence, 42);
    assert.equal(ring.Weapon_Power, 4);
});

test("main stats follow native base-class ranges and crafting bribe is player-specific", () => {
    for (const [characterClass, stat] of [
        [0, "LUK"],
        [5, "LUK"],
        [7, "STR"],
        [16, "STR"],
        [19, "AGI"],
        [29, "AGI"],
        [31, "WIS"],
        [40, "WIS"],
    ]) {
        const f = fixture();
        f.attributes.CharacterClass = characterClass;
        f.equip(1, 0, "Pick");
        const plan = f.plan(4);
        assert.equal(plan.primaryStat, stat);
        assert.equal(plan.equipment[0].stats[stat], 124);
    }
});

test("protected slots stay untouched regardless of their item definition", () => {
    const f = fixture();
    for (const slot of [8, 9, 10, 11, 14]) f.equip(0, slot, "Hat");
    const before = structuredClone(f.attributes);
    assert.equal(f.plan().equipment.length, 0);
    assert.deepEqual(f.attributes, before);
});

test("special rules, premiumified items and zero-slot gear are skipped", () => {
    const f = fixture();
    for (const [slot, id] of [
        "EquipmentWandsArc0",
        "EquipmentRingsArc0",
        "EquipmentBowsTempest0",
        "EquipmentRingsTempest0",
    ].entries()) {
        f.definitions[id] = f.definitions.Hat;
        f.equip(0, slot, id);
    }
    f.equip(0, 4, "Hat");
    f.attributes.EquipmentMap[0][4].h.Premiumified = 1;
    f.definitions.Zero = { h: { ...f.definitions.Hat.h, Upgrade_Slots_Left: 0 } };
    f.equip(1, 0, "Zero");
    assert.equal(f.plan().equipment.length, 0);
    assert.equal(f.plan().skipped.length, 6);
});

test("food only grows, including golden food and bullets; blanks and locked slots are ignored", () => {
    const f = fixture();
    for (const [slot, quantity] of [0, 999, 1000, 2000].entries()) {
        f.attributes.EquipmentOrder[2][slot] = slot === 0 ? "Bullet3" : "FoodG11";
        f.attributes.EquipmentQuantity[2][slot] = quantity;
    }
    f.attributes.EquipmentOrder[2][6] = "FoodG2";
    assert.deepEqual(f.plan().food, [
        { slot: 0, quantity: 1000 },
        { slot: 1, quantity: 1000 },
    ]);
});

test("repeated application does not stack bonuses", () => {
    const f = fixture();
    f.equip(0, 0, "Hat");
    const first = f.plan();
    f.attributes.EquipmentMap[0][0].h = first.equipment[0].stats;
    assert.deepEqual(f.plan(), first);
});

test("invalid later entries fail before any earlier item can be modified", () => {
    const f = fixture();
    f.equip(0, 0, "Hat");
    f.equip(1, 0, "Unknown");
    const before = structuredClone(f.attributes);
    assert.throws(() => f.plan(), /Nothing changed/);
    assert.deepEqual(f.attributes, before);
    f.attributes.EquipmentOrder[1][0] = "Blank";
    f.definitions.StoneA8.h.Effect += ".Unknown,2";
    assert.throws(() => f.plan(), /Unsupported/);
    assert.deepEqual(f.attributes.EquipmentMap, before.EquipmentMap);
});

test("one-shot runtime uses updated native capacity, preserves protected maps and rolls back on failure", () => {
    const f = fixture();
    f.equip(0, 0, "Hat");
    f.equip(0, 8, "Hat");
    f.attributes.DNSM = { h: { TotStatMAP: { h: { old: 1 } } } };
    f.attributes.EquipmentOrder[2][0] = "FoodG11";
    const protectedMap = f.attributes.EquipmentMap[0][8].h;
    let recalculated = false;
    const actor12 = {
        _customBlock_TotalStats(key) {
            assert.equal(key, "calcEtcBonuses");
            recalculated = true;
        },
        _customBlock_MaxCapacity(key) {
            assert.equal(key, "cFood");
            assert.equal(recalculated, true);
            assert.equal(f.attributes.EquipmentMap[0][0].h.AGI, 207);
            return 2000;
        },
    };
    bindFixture({
        gga: f.attributes,
        itemDefs: f.definitions,
        cList: f.lists,
        events: (id) =>
            id === 12
                ? actor12
                : {
                      _customBlock_GetBribeBonus: (key) => {
                          assert.equal(key, "28");
                          return 1;
                      },
                  },
    });
    assert.match(perfectEquipped(), /increased 1 food stacks/);
    assert.equal(f.attributes.EquipmentQuantity[2][0], 2000);
    assert.strictEqual(f.attributes.EquipmentMap[0][8].h, protectedMap);
    const before = structuredClone(f.attributes.EquipmentMap);
    actor12._customBlock_MaxCapacity = () => NaN;
    assert.throws(() => perfectEquipped(), /rolled back/);
    assert.deepEqual(f.attributes.EquipmentMap, before);
    assert.equal(f.attributes.EquipmentQuantity[2][0], 2000);
});
