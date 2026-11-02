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
                "\nlet gga,itemDefs,cList,events;const cheatState={w3:{prayer:false}};const equippedSpecialRolls=()=>({});export function bind(f){({gga,itemDefs,cList,events}=f);}export function prayerState(v){cheatState.w3.prayer=v;}"
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
                lvReqToEquip: 1,
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
        assert.equal(f.a.EquipmentQuantity[2][5], 100);
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
test("unavailable unlocks are omitted without rejecting eligible equipment", () => {
    for (const mutate of [
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
        const plan = f.plan();
        assert(plan.notes.length > 0);
        assert.deepEqual(f.a, before);
        applyWardrobePlan(
            plan,
            f.a,
            () => {},
            () => 100
        );
        assert.equal(f.a.EquipmentOrder[0][0], preset.equipment[0]);
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

test("equipment level gates use native skill indices and skip without planning writes to that slot", () => {
    for (const [type, index] of [
        ["aHelmet", 0],
        ["aPick", 1],
        ["aHatchet", 3],
        ["aFishingRod", 4],
        ["aBugNet", 6],
        ["aTrap", 7],
        ["aSkull", 9],
    ]) {
        const f = fixture();
        const id = preset.tools[0];
        Object.assign(f.defs[id].h, { typeGen: type, lvReqToEquip: 100 });
        f.a.Lv0[index] = 99;
        const before = JSON.stringify(f.a);
        const plan = f.plan();
        assert(plan.notes.some((note) => /requires .* level 100; current level is 99/.test(note)));
        assert(!plan.entries.some((entry) => entry.target === f.a.EquipmentOrder[1] && entry.key === 0));
        assert.equal(JSON.stringify(f.a), before);
        f.a.Lv0[index] = 100;
        assert.doesNotThrow(f.plan);
    }
    const f = fixture();
    delete f.defs[preset.equipment[0]].h.lvReqToEquip;
    assert.throws(f.plan, /requirement is unavailable/);
});

test("capture is read-only; saved choices recreate perfect gear and preserve sparse sections", () => {
    const f = fixture();
    applyWardrobePlan(
        f.plan(),
        f.a,
        () => {},
        () => 100
    );
    f.a.Cards[2][2] = "B";
    f.a.PrayersActive[1] = -1;
    f.a.Lab[1][3] = -1;
    f.a.ObolEquippedOrder[0][2] = "Blank";
    f.a.EquipmentMap[0][0].h.STR = 99999;
    const before = JSON.stringify(f.a);
    const captured = api.captureWardrobe(f.a, f.lists);
    assert.equal(JSON.stringify(f.a), before);
    assert.equal(captured.equipment[8], "Keep");
    assert.equal(captured.cards[2], "B");
    assert.equal(captured.chips[3], -1);
    assert.equal(captured.obolSlots[1][0], "Keep");
    const plan = planWardrobe(f.a, f.defs, f.lists, captured, 12, () => 5);
    applyWardrobePlan(
        plan,
        f.a,
        () => {},
        () => 100
    );
    assert.notEqual(f.a.EquipmentMap[0][0].h.STR, 99999);
    assert.equal(f.a.ObolEquippedOrder[0][2], "Blank");
    assert.equal(f.a.Cards[2][2], "B");
    assert.equal(f.a.Lab[1][3], -1);
});

test("saved empty loadout can clear choices without requiring owned cards, chips or prayers", () => {
    const f = fixture();
    f.a.ObolEquippedOrder[1][0] = "Blank";
    f.a.Cards[3].h = {};
    const captured = api.captureWardrobe(f.a, f.lists);
    const plan = planWardrobe(f.a, f.defs, f.lists, captured, 12, () => 0);
    applyWardrobePlan(
        plan,
        f.a,
        () => {},
        () => 100
    );
    assert.deepEqual(f.a.Cards[3].h, {});
});

test("saved data validates protected slots, shapes and special-class requirements before writes", () => {
    const f = fixture();
    f.a.Cards[3].h = {};
    const captured = api.captureWardrobe(f.a, f.lists);
    assert.throws(
        () => api.validateSavedWardrobe({ ...captured, equipment: Array(16).fill("Blank") }),
        /Invalid saved/
    );
    assert.throws(() => api.validateSavedWardrobe({ ...captured, id: "__proto__" }), /Invalid saved/);
    assert.throws(() => api.validateSavedWardrobe({ ...captured, cards: [] }), /Invalid saved/);
    assert.throws(
        () => planWardrobe(f.a, f.defs, f.lists, { ...captured, characterClass: 15 }, 12, () => 0),
        /original character class/
    );
    captured.obolSlots[0].pop();
    assert.throws(() => planWardrobe(f.a, f.defs, f.lists, captured, 12, () => 0), /obol layout/);
});

test("best tools respect their own skill and DNA character level; portal rings follow current world", () => {
    const f = fixture();
    f.defs.DNAgun1 = { h: { typeGen: "aDNAgun", Class: "ALL", lvReqToEquip: 90, Weapon_Power: 50 } };
    f.defs.DNAgun3 = { h: { typeGen: "aDNAgun", Class: "ALL", lvReqToEquip: 180, Weapon_Power: 150 } };
    assert.equal(api.bestWardrobeTool(f.a, f.defs, 6), "DNAgun1");
    f.a.Lv0[0] = 180;
    assert.equal(api.bestWardrobeTool(f.a, f.defs, 6), "DNAgun3");
    f.a.Lv0[0] = 1;
    assert.equal(api.bestWardrobeTool(f.a, f.defs, 6), "Blank");
    const portal = { ...preset, equipment: preset.equipment.map((id, i) => (i === 5 || i === 7 ? "PortalRing" : id)) };
    for (const [map, id] of [
        [0, "Keep"],
        [50, "EquipmentRings33"],
        [100, "EquipmentRings31"],
        [150, "EquipmentRings32"],
        [200, "EquipmentRings34"],
        [250, "EquipmentRings37"],
        [300, "Keep"],
    ]) {
        if (id !== "Keep") f.defs[id] = f.defs.EquipmentRings35;
        f.a.CurrentMap = map;
        const plan = planWardrobe(f.a, f.defs, f.lists, portal, 12, () => 5);
        const entry = plan.entries.find((e) => e.target === f.a.EquipmentOrder[0] && e.key === 5);
        if (id === "Keep") assert.equal(entry, undefined);
        else assert.equal(entry.value, id);
    }
});

test("prayer variants preview correctly and switching cheat off restores both active and saved prayers", () => {
    const f = fixture();
    f.a.GemItemsPurchased[114] = 12;
    f.a.PixelHelperActor = Array(7).fill(null);
    f.a.PixelHelperActor[6] = {
        behaviors: { getBehavior: () => ({ _GenINFO: Array.from({ length: 46 }, () => ({ h: {} })) }) },
    };
    api.bind({
        gga: f.a,
        itemDefs: f.defs,
        cList: f.lists,
        events: () => ({
            _customBlock_GetBribeBonus: () => 1,
            _customBlock_RunCodeOfTypeXforThingY: () => 5,
            _customBlock_MaxCapacity: () => 100,
            _customBlock_ActionBlock: () => {},
            _customBlock_TalentCalc: () => {},
            _customBlock_TotalStats: () => {},
        }),
    });
    api.setupWardrobePrayerSync();
    api.prayerState(true);
    const preview = JSON.parse(wardrobeCommand(["wardrobe", "preview", "rare-drops"]));
    wardrobeCommand(["wardrobe", "apply", "rare-drops", preview.token]);
    assert.deepEqual(f.a.PrayersActive, preset.prayersWithCheat);
    api.prayerState(false);
    assert.deepEqual(f.a.PrayersActive, preset.prayers);
    assert.deepEqual(f.a.PlayerDATABASE.h.Test.h.Prayers, preset.prayers);
    assert.equal(preview.sections.find((s) => s.title.includes("obols")).labels[0], "Sparkle obol");
});

test("all presets and saved loadouts preserve the equipped cape, including older saved choices", () => {
    assert.ok(wardrobePresets.every((preset) => preset.equipment[12] === "Keep"));
    const f = fixture();
    f.a.Cards[3].h = {};
    const originalId = f.a.EquipmentOrder[0][12];
    const originalStats = JSON.stringify(f.a.EquipmentMap[0][12].h);
    const captured = api.captureWardrobe(f.a, f.lists);
    assert.equal(captured.equipment[12], "Keep");
    captured.equipment[12] = "Blank";
    const plan = planWardrobe(f.a, f.defs, f.lists, captured, 12, () => 0);
    assert.equal(plan.sections[0].items[12], "Keep current item");
    applyWardrobePlan(
        plan,
        f.a,
        () => {},
        () => 100
    );
    assert.equal(f.a.EquipmentOrder[0][12], originalId);
    assert.equal(JSON.stringify(f.a.EquipmentMap[0][12].h), originalStats);
});
