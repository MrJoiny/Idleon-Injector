import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const files = ["equipmentStones", "keychainRolls", "wardrobePresets", "perfectEquipment", "wardrobe"];
const code = files
    .map((name) =>
        readFileSync(new URL("../src/cheats/helpers/" + name + ".js", import.meta.url), "utf8").replace(
            /^import .*;\r?$/gm,
            ""
        )
    )
    .join("\n");
const api = await import(
    "data:text/javascript," +
        encodeURIComponent(
            code +
                "\nlet gga,itemDefs,cList,events;const equippedSpecialRolls=()=>({});export function bind(f){({gga,itemDefs,cList,events}=f);}"
        )
);
const {
    wardrobePresets,
    wardrobeClass,
    planWardrobe,
    applyWardrobePlan,
    equipmentWorld,
    equipmentStones,
    keychainRoll,
    wardrobeCommand,
} = api;
const preset = wardrobePresets[0];
function fixture(classId = 16) {
    const a = {
        CharacterClass: classId,
        UserInfo: ["Test"],
        GetPlayersUsernames: ["Test"],
        KillsLeft2Advance: Array.from({ length: 301 }, () => [0]),
        EquipmentOrder: Array.from({ length: 3 }, () => Array(16).fill("Blank")),
        EquipmentMap: Array.from({ length: 3 }, () => Array.from({ length: 16 }, () => ({ h: { marker: 1 } }))),
        EquipmentQuantity: Array.from({ length: 3 }, () => Array(16).fill(0)),
        FoodSlotsOwned: 6,
        Lv0: Array(16).fill(100),
        GemItemsPurchased: Array(120).fill(4),
        PrayersActive: Array(12).fill(-1),
        PrayersUnlocked: Array(25).fill(1),
        Lab: Array.from({ length: 16 }, () => Array(30).fill(1)),
        Cards: [{ h: {} }, [], Array(12).fill("B"), { h: { old: 5 } }],
        PlayerStuff: [0, 0, 0],
        CardPreset: [Array(12).fill("B")],
        ObolEquippedOrder: [Array(4).fill("Blank"), ["ObolLockedCircle", "Blank", "Blank", "Blank"]],
        ObolEquippedMap: Array.from({ length: 2 }, () => Array.from({ length: 4 }, () => ({ h: { old: 1 } }))),
        MonsterDefinitionsGET: { h: {} },
        DNSM: { h: { TotStatMAP: { h: {} } } },
    };
    a.Lab[1] = Array(7).fill(-1);
    for (const id of preset.cards) {
        a.Cards[0].h[id] = 100;
        a.MonsterDefinitionsGET.h[id] = { h: { Name: id } };
    }
    a.PlayerDATABASE = {
        h: {
            Test: {
                h: {
                    CharacterClass: classId,
                    Lv0: a.Lv0.slice(),
                    Prayers: Array(12).fill(-1),
                    CardEquip: Array(12).fill("B"),
                    CardPreset: [Array(12).fill("B")],
                    CSetEq: { h: { old: 5 } },
                },
            },
        },
    };
    for (const slot of [8, 10, 14]) {
        a.EquipmentOrder[0][slot] = "Precious";
        a.EquipmentQuantity[0][slot] = 1;
    }
    const defs = {};
    const add = (id, type = "aHelmet", slots = 2) =>
        (defs[id] = {
            h: {
                displayName: id,
                typeGen: type,
                Upgrade_Slots_Left: slots,
                UQ1val: 0,
                UQ2val: 0,
                UQ1txt: "0",
                UQ2txt: "0",
                ID: 3,
                Type: "HELMET",
                Weapon_Power: 0,
            },
        });
    for (const id of [...preset.equipment, ...preset.tools, ...preset.food, ...Object.values(preset.weapons)])
        if (!["Keep", "Blank", "Weapon"].includes(id)) add(id);
    for (const id of Object.values(preset.weapons)) add(id, "aWeapon");
    preset.tools.filter((id) => id !== "Blank").forEach((id) => add(id, "aPick"));
    add("EquipmentRingsChat11", "aChatRingMTX", 3);
    add("EquipmentKeychain22", "aKeychain", 0);
    for (const [shape, id] of Object.entries(preset.obols)) {
        add(id, "aObol" + shape, 0);
        defs[id].h.Type = shape.toUpperCase() + "_OBOL";
        defs[id].h.UQ1txt = "%_DROP_CHANCE";
        defs[id].h.UQ1val = 10;
    }
    for (let world = 1; world <= 7; world++)
        for (const [kind, id] of Object.entries(equipmentStones(world)))
            defs[id] = {
                h: {
                    Trigger: 1,
                    Effect:
                        (kind === "armor" ? "Defence" : "Weapon_Power") +
                        "," +
                        world +
                        (world === 1 && kind === "weapon"
                            ? ""
                            : "." + (world <= 3 ? "Random_Stat" : "Main_Stat") + "," + world),
                },
            };
    for (const stat of ["STR", "AGI", "WIS", "LUK"])
        defs["StonePrem" + stat] = { h: { Trigger: 1, Effect: stat + ",5" } };
    const lists = {
        ItemToCraftNAME: [[preset.equipment[0]]],
        EquiptypeGens: [["aHelmet"], ["aPick"]],
        RANDOlist: Array.from({ length: 10 }, () => Array(8).fill(1)),
        PrayerInfo: Array.from({ length: 25 }, (_, i) => ["Prayer" + i]),
        ChipDesc: Array.from({ length: 30 }, (_, i) => ["Chip" + i]),
        CardStuff: Array.from({ length: 8 }, () => preset.cards.map((id) => [id])),
        CardSets: Array.from({ length: 8 }, () => ["set", 2]),
        ObolShapes: ["Circle", "Square", "Hexagon", "Sparkle"],
        ObolXYcoords: Array.from({ length: 2 }, () => Array.from({ length: 4 }, (_, i) => [0, 0, i])),
    };
    return { a, defs, lists, plan: () => planWardrobe(a, defs, lists, preset, 12, () => 5) };
}
test("town progression maps I–VII, respects a locked gate and rejects unknown progression", () => {
    const f = fixture();
    for (let world = 1; world <= 7; world++) {
        f.a.KillsLeft2Advance = Array.from({ length: 301 }, (_, i) => [i >= (world - 1) * 50 ? 10 : 0]);
        assert.equal(equipmentWorld(f.a), world);
    }
    assert.deepEqual(equipmentStones(6), { weapon: "StoneW8", armor: "StoneA7", tool: "StoneT7" });
    delete f.a.KillsLeft2Advance;
    assert.throws(() => equipmentWorld(f.a), /unavailable/);
});
test("random I–III stats become class-main-stat perfect rolls; IV onward preserves the same routing", () => {
    for (const [classId, stat] of [
        [1, "LUK"],
        [16, "STR"],
        [29, "AGI"],
        [40, "WIS"],
    ])
        for (let world = 1; world <= 7; world++) {
            const f = fixture(classId);
            f.a.KillsLeft2Advance = Array.from({ length: 301 }, (_, i) => [i >= (world - 1) * 50 ? 10 : 0]);
            const plan = f.plan();
            applyWardrobePlan(
                plan,
                f.a,
                () => {},
                () => 100
            );
            assert.equal(f.a.EquipmentMap[0][0].h[stat], 12 + world * 3);
            assert.equal(f.a.EquipmentMap[0][1].h[stat], world === 1 ? 0 : world * 2);
            assert.equal(f.a.EquipmentMap[0][1].h.Weapon_Power, world * 2);
        }
});
test("all class weapons, preferred keychains, Keep/Empty, food growth and obol shapes", () => {
    for (const classId of [1, 16, 29, 40]) {
        const f = fixture(classId);
        const before = structuredClone(f.a);
        const plan = f.plan();
        assert.deepEqual(f.a, before);
        const precious = f.a.EquipmentMap[0][8].h;
        applyWardrobePlan(
            plan,
            f.a,
            () => {},
            () => 100
        );
        assert.equal(f.a.EquipmentOrder[0][1], preset.weapons[wardrobeClass(classId)]);
        assert.equal(f.a.EquipmentMap[0][8].h, precious);
        assert.equal(f.a.EquipmentOrder[0][10], "Precious");
        assert.equal(f.a.EquipmentOrder[0][14], "Precious");
        assert.deepEqual(f.a.EquipmentMap[0][9].h, keychainRoll("EquipmentKeychain22", "STR"));
        assert.equal(f.a.EquipmentOrder[1][6], "Blank");
        assert.equal(f.a.EquipmentQuantity[2][0], 100);
        assert.equal(f.a.EquipmentQuantity[2][5], 0);
        assert.equal(f.a.ObolEquippedOrder[1][0], "ObolLockedCircle");
        assert.equal(f.a.ObolEquippedOrder[0][3], "ObolKruk");
        assert.equal(f.a.Cards[2][0], "w7b7");
        assert.equal(f.a.Cards[2][7], "w7a12");
        assert.equal(f.a.Cards[2][8], "B");
        assert.equal(f.a.Cards[3].h.set, 10);
        const applied = structuredClone(f.a);
        applyWardrobePlan(
            f.plan(),
            f.a,
            () => {},
            () => 90
        );
        assert.deepEqual(f.a, applied, "repeat does not stack or shrink food");
    }
});
test("Relic15/10, class-specific Sushi and Spiritlord base bonuses", () => {
    assert.equal(keychainRoll("EquipmentKeychain11", "STR").UQ1val, 15);
    assert.equal(keychainRoll("EquipmentKeychain11", "STR").UQ2val, 10);
    assert.equal(keychainRoll("EquipmentKeychain18", "AGI").UQ1txt, "%_AGI");
    assert.equal(keychainRoll("EquipmentKeychain18", "STR").UQ2val, 6);
    assert.throws(() => keychainRoll("EquipmentKeychain18", "WIS"));
    assert.deepEqual(keychainRoll("EquipmentKeychain29", "STR"), {});
    assert.equal(keychainRoll("EquipmentKeychain16", "LUK").UQ1val, 12);
    assert.equal(keychainRoll("EquipmentKeychain19", "LUK").UQ2val, 5);
});
test("missing data/unlocks and invalid class presets reject before writes", () => {
    for (const mutate of [
        (f) => delete f.defs.ObolKruk,
        (f) => (f.a.PrayersUnlocked[4] = 0),
        (f) => (f.a.Cards[0].h.w7b7 = 0),
        (f) => (f.a.Lv0[12] = 74),
        (f) => (f.a.GemItemsPurchased[63] = 0),
        (f) => (f.a.Lab[15][21] = 0),
        (f) => (f.a.FoodSlotsOwned = 4),
    ]) {
        const f = fixture();
        mutate(f);
        const before = structuredClone(f.a);
        assert.throws(f.plan);
        assert.deepEqual(f.a, before);
    }
    const f = fixture();
    assert.throws(() => planWardrobe(f.a, f.defs, f.lists, { ...preset, classes: ["Mage"] }, 12, () => 5), /not valid/);
});
test("late recalculation or capacity failures roll back every loadout section", () => {
    for (const failure of ["recalc", "capacity", "verify"]) {
        const f = fixture();
        const before = structuredClone(f.a);
        const plan = f.plan();
        let recalcs = 0;
        assert.throws(
            () =>
                applyWardrobePlan(
                    plan,
                    f.a,
                    () => {
                        if (failure === "recalc") throw Error("test");
                        if (failure === "verify" && recalcs++ === 0) f.a.PrayersActive[0] = 99;
                    },
                    () => {
                        if (failure === "capacity") throw Error("test");
                        return 100;
                    }
                ),
            /rolled back/
        );
        assert.deepEqual(f.a, before);
    }
});
test("commands require fresh one-use confirmation; stale character, replay and cancel cannot apply", () => {
    const f = fixture();
    f.a.PixelHelperActor = Array(7).fill({ behaviors: { getBehavior: () => ({ _GenINFO: { 45: { h: {} } } }) } });
    api.bind({
        gga: f.a,
        itemDefs: f.defs,
        cList: f.lists,
        events: (id) =>
            id === 189
                ? { _customBlock_GetBribeBonus: () => 1 }
                : id === 12
                  ? {
                        _customBlock_RunCodeOfTypeXforThingY: () => 5,
                        _customBlock_TotalStats: () => {},
                        _customBlock_MaxCapacity: () => 100,
                    }
                  : id === 345
                    ? { _customBlock_ActionBlock: () => {} }
                    : { _customBlock_TalentCalc: () => {} },
    });
    const command = (...args) => JSON.parse(wardrobeCommand(["wardrobe", ...args]));
    assert.throws(() => command("apply", "rare-drops", "fake"));
    let preview = command("preview", "rare-drops");
    command("cancel");
    assert.throws(() => command("apply", "rare-drops", preview.token));
    preview = command("preview", "rare-drops");
    f.a.CharacterClass = 40;
    assert.throws(() => command("apply", "rare-drops", preview.token), /changed/);
    f.a.CharacterClass = 16;
    preview = command("preview", "rare-drops");
    assert.match(command("apply", "rare-drops", preview.token).message, /applied permanently/);
    assert.throws(() => command("apply", "rare-drops", preview.token));
});
