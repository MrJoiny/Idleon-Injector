import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const stoneSource = readFileSync(new URL("../src/cheats/helpers/equipmentStones.js", import.meta.url), "utf8");
const source = readFileSync(new URL("../src/cheats/helpers/perfectEquipment.js", import.meta.url), "utf8");
const { planPerfectEquipment, perfectEquipped, bindFixture } = await import(
    `data:text/javascript,${encodeURIComponent(stoneSource + "\n" + source.replace(/^import .*;\r?$/gm, "") + "\nlet cList, events, gga, itemDefs; const equippedSpecialRolls = () => ({}); export function bindFixture(f) { ({cList, events, gga, itemDefs} = f); }")}`
);

function fixture() {
    const attributes = {
        CharacterClass: 19,
        KillsLeft2Advance: Array.from({ length: 301 }, () => [0]),
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

test("premium chat rings use their three premium stones for each class and remain repeatable", () => {
    for (const [characterClass, stat] of [
        [5, "LUK"],
        [16, "STR"],
        [29, "AGI"],
        [40, "WIS"],
    ]) {
        const f = fixture();
        f.attributes.CharacterClass = characterClass;
        f.definitions.EquipmentRingsChat11 = { h: { typeGen: "aChatRingMTX", Upgrade_Slots_Left: 3, UQ1val: 10 } };
        f.definitions[`StonePrem${stat}`] = { h: { Trigger: 1, Effect: `${stat},5` } };
        f.equip(0, 13, "EquipmentRingsChat11");
        // Slot protection takes priority even if an item has an upgradeable definition.
        for (const slot of [8, 10, 14]) f.equip(0, slot, "EquipmentRingsChat11");
        const plan = f.plan();
        assert.equal(plan.equipment.length, 1);
        const result = plan.equipment[0];
        assert.equal(result.slot, 13);
        assert.equal(result.stats[stat], 15);
        assert.equal(result.stats.Upgrade_Slots_Left, -3);
        assert.equal(result.stats.Weapon_Power, 0);
        assert.equal(result.stats.UQ1val, 0);
        f.attributes.EquipmentMap[0][13].h = result.stats;
        assert.deepEqual(f.plan(), plan);
    }
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

const specialSource = readFileSync(new URL("../src/cheats/helpers/specialEquipment.js", import.meta.url), "utf8");
const { arcaneRoll, tempestRoll, highestTempestDropWorld, equippedSpecialRolls, bindSpecial } = await import(
    `data:text/javascript,${encodeURIComponent(specialSource.replace(/^import .*;\r?$/gm, "") + "\nlet cList, events, gga; export function bindSpecial(f) { ({cList, events, gga} = f); }")}`
);

test("AC maxima use separate native quality values, speed cap, and no stones", () => {
    assert.deepEqual(arcaneRoll("EquipmentWandsArc0", 1500), {
        Speed: 6,
        Weapon_Power: 75,
        UQ1val: 125,
        UQ2val: 130,
        AwesomeStats: 1,
    });
    assert.equal(arcaneRoll("EquipmentWandsArc0", 299).Speed, 2);
    assert.equal(arcaneRoll("EquipmentWandsArc0", 300).Speed, 3);
    assert.deepEqual(arcaneRoll("EquipmentRingsArc0", 1500), { UQ1val: 140, UQ2val: 180, AwesomeStats: 1 });
    assert.throws(() => arcaneRoll("EquipmentWandsArc0", NaN));
    assert.throws(() => arcaneRoll("EquipmentWandsArc0", 0));
    const f = fixture();
    f.equip(0, 1, "EquipmentWandsArc0");
    f.definitions.EquipmentWandsArc0 = { h: { typeGen: "aWeapon", Upgrade_Slots_Left: 0 } };
    const special = { EquipmentWandsArc0: { stats: arcaneRoll("EquipmentWandsArc0", 1500), stone: null } };
    const plan = planPerfectEquipment(f.attributes, f.definitions, f.lists, 12, 0, special);
    assert.equal(plan.equipment[0].stats.WIS, 0);
    assert.equal(plan.equipment[0].stats.Weapon_Power, 75);
    assert.equal(plan.equipment[0].stats.Upgrade_Slots_Left, 0);
});

test("Tempest maximum rolls plus 10% stones use base slot counts, including Punchies", () => {
    for (const [item, slots, stone, wp, uq] of [
        ["EquipmentBowsTempest0", 5, "StoneTempestB2", 120, 280],
        ["EquipmentRingsTempest6", 3, "StoneTempestR2", 9, 100],
        ["EquipmentRingsTempest8", 1, "StoneTempestR2", 3, 50],
    ]) {
        const f = fixture();
        f.equip(0, 1, item);
        f.definitions[item] = { h: { typeGen: "aWeapon", Upgrade_Slots_Left: slots, UQ1val: 20 } };
        f.definitions[stone] = {
            h: {
                Trigger: 1,
                Effect: stone === "StoneTempestB2" ? "Weapon_Power,12.Misc_Bonus,50" : "Weapon_Power,3.Misc_Bonus,25",
            },
        };
        f.lists.ItemToCraftNAME[0].push(item); // Even bad recipe membership must not grant special gear a crafting slot.
        const special = { [item]: { stats: tempestRoll(item, 5), stone } };
        const plan = planPerfectEquipment(f.attributes, f.definitions, f.lists, 12, 0, special);
        assert.equal(plan.equipment[0].stats.Weapon_Power, wp);
        assert.equal(plan.equipment[0].stats.UQ1val, uq);
        assert.equal(plan.equipment[0].stats.AGI, 0);
        assert.equal(plan.equipment[0].stats.Upgrade_Slots_Left, -slots);
        f.attributes.EquipmentMap[0][1].h = plan.equipment[0].stats;
        assert.deepEqual(planPerfectEquipment(f.attributes, f.definitions, f.lists, 12, 0, special), plan);
    }
});

test("highest Tempest world respects variant drops, Titan gates, and optional normal gates", () => {
    const attrs = {
        MonsterDefinitionsGET: {
            h: {
                low: { h: { AFKtype: "FIGHTING" } },
                high: { h: { AFKtype: "FIGHTING" } },
                later: { h: { AFKtype: "FIGHTING" } },
                fish: { h: { AFKtype: "FISHING" } },
            },
        },
        OptionsListAccount: [],
        KillsLeft2Advance: Array.from({ length: 251 }, () => [0]),
        CustomMaps: {
            h: { MonsterDrops: { h: { low: [["COIN", 1, 0]], high: [["COIN", 1, 1]], later: [["COIN", 1, 2]] } } },
        },
    };
    const lists = { MapAFKtarget: Array(351).fill("Z"), MapAFKtargetSide: [] };
    lists.MapAFKtarget[1] = "low";
    lists.MapAFKtarget[201] = "high";
    lists.MapAFKtarget[251] = "later";
    lists.MapAFKtarget[301] = "low"; // W7 cannot be counted as a Tempest world.
    attrs.CustomMaps.h.MonsterDrops.h.fish = [["COIN", 1, 0]];
    lists.MapAFKtarget[252] = "fish"; // Some skilling definitions also have a COIN entry.
    let titans = 30;
    const wind = (key, n) =>
        key === "TotalTitansKilled" ? titans : key === "TitanKillReqTown" ? [3, 8, 17, 25, 30][n / 50] : n;
    assert.equal(highestTempestDropWorld(attrs, lists, wind, "EquipmentBowsTempest0"), 0);
    assert.equal(highestTempestDropWorld(attrs, lists, wind, "EquipmentBowsTempest1"), 4);
    assert.equal(highestTempestDropWorld(attrs, lists, wind, "EquipmentBowsTempest2"), 5);
    titans = 25;
    assert.equal(highestTempestDropWorld(attrs, lists, wind, "EquipmentBowsTempest2"), -1);
    attrs.OptionsListAccount[387] = 1;
    attrs.KillsLeft2Advance[150][0] = 1;
    assert.equal(highestTempestDropWorld(attrs, lists, wind, "EquipmentBowsTempest1"), -1);
});

test("special runtime is current-class-only and reads each AC quality from native accessors", () => {
    const gga = { CharacterClass: 40, EquipmentOrder: [Array(16).fill("Blank")] };
    gga.EquipmentOrder[0][1] = "EquipmentWandsArc0";
    gga.EquipmentOrder[0][5] = "EquipmentRingsArc0";
    const calls = [];
    bindSpecial({
        gga,
        cList: {},
        events: (id) => {
            assert.equal(id, 579);
            return {
                _customBlock_ArcaneType: (key) => {
                    calls.push(key);
                    return key === "WepDropQuality" ? 1500 : 300;
                },
            };
        },
    });
    const rolls = equippedSpecialRolls();
    assert.deepEqual(calls, ["WepDropQuality", "RingDropQuality"]);
    assert.equal(rolls.EquipmentRingsArc0.stats.UQ1val, 60);
    gga.CharacterClass = 29;
    assert.deepEqual(equippedSpecialRolls(), {});
});
