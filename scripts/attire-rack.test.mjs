import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const source = readFileSync(new URL("../src/cheats/helpers/attireRack.js", import.meta.url), "utf8");
const { attireCatalog, installAttireRack } = await import("data:text/javascript," + encodeURIComponent(source));
function fixture() {
    const gown = (name, power, strength, text, value) => ({
        h: {
            displayName: name,
            typeGen: "aGown",
            Weapon_Power: power,
            STR: strength,
            AGI: 0,
            WIS: 0,
            LUK: 0,
            Defence: 0,
            UQ1txt: text,
            UQ1val: value,
            UQ2txt: "0",
            UQ2val: 0,
        },
    });
    const definitions = {
        Blank: gown("Empty", 0, 0, "0", 0),
        EquipmentGown0: gown("Lava", 999, 1200, "_FRAMES", 163),
        EquipmentGown1: gown("First_Robe", 5, 10, "%_DAMAGE_BONUS", 100),
        EquipmentGown2: gown("Second_Robe", 10, 7, "%_ALL_AFK_GAIN", 60),
        EquipmentCape1: { h: { ...gown("Cape", 90, 90, "0", 0).h, typeGen: "aCape" } },
    };
    const a = {
        UserInfo: ["One"],
        ItemDefinitionsGET: { h: definitions },
        EquipmentOrder: [Array(16).fill("Blank")],
        EquipmentMap: [Array.from({ length: 16 }, () => ({ h: {} }))],
        DNSM: { h: { TotStatMAP: { h: {} }, TotalStatsETCmap: { h: {} } } },
    };
    let chosen = [],
        research = 0,
        dungeon = -1,
        calls = 0,
        fail = false;
    const actor = {
        _customBlock_TotalStats(key) {
            calls++;
            if (fail) throw new Error("native failure");
            const cache = a.DNSM.h.TotStatMAP.h;
            if (Object.hasOwn(cache, key)) return cache[key];
            const id = a.EquipmentOrder[0][15];
            const d = a.ItemDefinitionsGET.h[id].h;
            if (key === "calcEtcBonuses") {
                const map = (a.DNSM.h.TotalStatsETCmap.h = {});
                if (id !== "Blank" && dungeon === -1 && d.UQ1txt !== "0")
                    map[d.UQ1txt] = d.UQ1val * (research >= 1 ? 1 + research / 100 : 1);
                return (cache[key] = 0);
            }
            return (cache[key] = Math.floor(
                (dungeon === -1 && id !== "Blank" ? Number(d[key]) + Number(a.EquipmentMap[0][15].h[key] || 0) : 0) *
                    (key === "STR" ? 1.5 : 1)
            ));
        },
    };
    installAttireRack(
        a,
        actor,
        { _customBlock_Dungon: () => dungeon },
        { _customBlock_ResearchStuff: () => research },
        () => chosen
    );
    return {
        a,
        actor,
        definitions,
        set(ids) {
            chosen = ids;
        },
        research(value) {
            research = value;
        },
        dungeon(value) {
            dungeon = value;
        },
        fail(value) {
            fail = value;
        },
        calls: () => calls,
    };
}

test("catalog includes player attire and excludes Lava's robes and other equipment", () => {
    assert.deepEqual(
        attireCatalog(fixture().definitions).map(({ id }) => id),
        ["EquipmentGown1", "EquipmentGown2"]
    );
});

test("blank and worn slots receive each selected outfit once with native stat multipliers", () => {
    const f = fixture();
    const order = f.a.EquipmentOrder;
    const definitions = f.a.ItemDefinitionsGET;
    const before = JSON.stringify([order, definitions, f.a.EquipmentMap]);
    f.set(["EquipmentGown1", "EquipmentGown1", "EquipmentGown2", "EquipmentGown0"]);
    assert.equal(f.actor._customBlock_TotalStats("STR"), 25);
    assert.equal(f.actor._customBlock_TotalStats("Weapon_Power"), 15);
    assert.equal(JSON.stringify([order, definitions, f.a.EquipmentMap]), before);
    assert.equal(f.a.EquipmentOrder, order);
    assert.equal(f.a.ItemDefinitionsGET, definitions);
    f.a.EquipmentOrder[0][15] = "EquipmentGown1";
    f.a.EquipmentMap[0][15].h.STR = 3;
    assert.equal(f.actor._customBlock_TotalStats("STR"), 30);
    assert.equal(f.actor._customBlock_TotalStats("Weapon_Power"), 15);
});

test("misc bonuses use Research and repeated cached calls never add them twice", () => {
    const f = fixture();
    f.a.EquipmentOrder[0][15] = "EquipmentGown1";
    f.research(50);
    f.set(["EquipmentGown1", "EquipmentGown2"]);
    for (let i = 0; i < 5; i++) f.actor._customBlock_TotalStats("calcEtcBonuses");
    assert.deepEqual(f.a.DNSM.h.TotalStatsETCmap.h, { "%_DAMAGE_BONUS": 150, "%_ALL_AFK_GAIN": 90 });
    f.research(100);
    f.actor._customBlock_TotalStats("STR");
    assert.deepEqual(f.a.DNSM.h.TotalStatsETCmap.h, { "%_DAMAGE_BONUS": 200, "%_ALL_AFK_GAIN": 120 });
});

test("turning selections off restores ordinary worn stats and bonuses; dungeons suppress extras", () => {
    const f = fixture();
    f.a.EquipmentOrder[0][15] = "EquipmentGown1";
    f.set(["EquipmentGown1", "EquipmentGown2"]);
    assert.equal(f.actor._customBlock_TotalStats("Weapon_Power"), 15);
    f.set([]);
    assert.equal(f.actor._customBlock_TotalStats("Weapon_Power"), 5);
    assert.deepEqual(f.a.DNSM.h.TotalStatsETCmap.h, { "%_DAMAGE_BONUS": 100 });
    f.set(["EquipmentGown2"]);
    f.dungeon(0);
    assert.equal(f.actor._customBlock_TotalStats("Weapon_Power"), 0);
    assert.deepEqual(f.a.DNSM.h.TotalStatsETCmap.h, {});
    assert.ok(f.calls() > 0);
});

test("character equipment replacements work and native exceptions leave real data visible", () => {
    const f = fixture();
    f.set(["EquipmentGown2"]);
    f.actor._customBlock_TotalStats("STR");
    f.a.UserInfo[0] = "Two";
    f.a.EquipmentOrder = [Array(16).fill("Blank")];
    f.a.EquipmentOrder[0][15] = "EquipmentGown2";
    assert.equal(f.actor._customBlock_TotalStats("Weapon_Power"), 10);
    const original = f.a.EquipmentOrder;
    f.fail(true);
    assert.throws(() => f.actor._customBlock_TotalStats("STR"), /native failure/);
    assert.equal(f.a.EquipmentOrder, original);
    assert.equal(f.a.EquipmentOrder[0][15], "EquipmentGown2");
    assert.equal(f.a.ItemDefinitionsGET.h.EquipmentGown2.h.STR, 7);
});

test("commands validate selections and replay saved selections without changing equipped items", async () => {
    const command = readFileSync(
        new URL("../src/cheats/helpers/attireRackCommand.js", import.meta.url),
        "utf8"
    ).replace(/^import .*;\r?$/gm, "");
    const code =
        source +
        command +
        "\nlet gga; const cheatState={wide:{attire:false}}; let actors; const events=(id)=>actors[id]; export function bind(a, e){gga=a;actors=e;}";
    const api = await import("data:text/javascript," + encodeURIComponent(code));
    const f = fixture();
    api.bind(f.a, { 12: f.actor, 579: { _customBlock_ResearchStuff: () => 0 } });
    const original = JSON.stringify(f.a.EquipmentOrder);
    api.attireRackCommand(["attire", "set", "EquipmentGown2,EquipmentGown2"]);
    assert.deepEqual(api.attireRackSelection(), ["EquipmentGown2"]);
    assert.throws(() => api.attireRackCommand(["attire", "set", "EquipmentGown0"]), /Unknown attire/);
    assert.deepEqual(api.attireRackSelection(), ["EquipmentGown2"]);
    api.attireRackCommand(["attire", "off"]);
    assert.deepEqual(api.attireRackSelection(), []);
    api.attireRackCommand(["attire", "on"]);
    assert.deepEqual(api.attireRackSelection(), ["EquipmentGown2"]);
    assert.equal(JSON.stringify(f.a.EquipmentOrder), original);
    const restarted = await import("data:text/javascript," + encodeURIComponent(code + "\n// restart"));
    restarted.bind(f.a, { 12: f.actor, 579: { _customBlock_ResearchStuff: () => 0 } });
    restarted.attireRackCommand(["attire", "set", "EquipmentGown2"]);
    assert.deepEqual(restarted.attireRackSelection(), ["EquipmentGown2"]);
    restarted.attireRackCommand(["attire", "set"]);
    assert.deepEqual(restarted.attireRackSelection(), []);
});
