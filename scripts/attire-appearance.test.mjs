import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const helpers = ["attireRack", "attireAppearance"]
    .map((file) =>
        readFileSync(new URL(`../src/cheats/helpers/${file}.js`, import.meta.url), "utf8").replace(
            /^import .*;\r?$/gm,
            ""
        )
    )
    .join("\n");
const { characterAttire, applyCharacterAttire } = await import("data:text/javascript," + encodeURIComponent(helpers));
function equipment(id) {
    return {
        EquipmentOrder: [Array.from({ length: 16 }, (_, i) => (i === 15 ? id : "KeepItem" + i))],
        EquipmentQuantity: [Array(16).fill(1)],
        EquipmentMap: [Array.from({ length: 16 }, () => ({ h: { STR: 9 } }))],
    };
}
function fixture() {
    const active = equipment("EquipmentGown1");
    const savedActive = equipment("EquipmentGown1");
    const other = equipment("EquipmentGown2");
    const definitions = Object.fromEntries(
        [0, 1, 2].map((n) => [
            "EquipmentGown" + n,
            { h: { typeGen: "aGown", displayName: "Outfit_" + n, UQ1txt: "0", UQ2txt: "0" } },
        ])
    );
    return {
        ...active,
        UserInfo: ["One"],
        GetPlayersUsernames: ["One", "Two [Test]"],
        ItemDefinitionsGET: { h: definitions },
        PlayerDATABASE: { h: { One: { h: savedActive }, "Two [Test]": { h: other } } },
    };
}
const request = (...changes) => ({ active: "One", changes });

test("appearance lists active live attire and inactive saved attire", () => {
    const a = fixture();
    a.PlayerDATABASE.h.One.h.EquipmentOrder[0][15] = "Blank";
    assert.deepEqual(characterAttire(a), [
        { name: "One", active: true, available: true, item: "EquipmentGown1" },
        { name: "Two [Test]", active: false, available: true, item: "EquipmentGown2" },
    ]);
});

test("batch replaces only attire, synchronizes active saved state and clears old modifiers", () => {
    const a = fixture();
    let recalculated = 0;
    const before = structuredClone(a);
    const result = applyCharacterAttire(
        a,
        request(
            { name: "One", before: "EquipmentGown1", item: "EquipmentGown2" },
            { name: "Two [Test]", before: "EquipmentGown2", item: "Blank" }
        ),
        () => {
            recalculated++;
        }
    );
    assert.deepEqual(result.changed, ["One", "Two [Test]"]);
    for (const player of [a, a.PlayerDATABASE.h.One.h]) {
        assert.equal(player.EquipmentOrder[0][15], "EquipmentGown2");
        assert.equal(player.EquipmentQuantity[0][15], 1);
        assert.deepEqual(player.EquipmentMap[0][15].h, {});
        assert.deepEqual(player.EquipmentOrder[0].slice(0, 15), before.EquipmentOrder[0].slice(0, 15));
    }
    assert.equal(a.PlayerDATABASE.h["Two [Test]"].h.EquipmentOrder[0][15], "Blank");
    assert.equal(a.PlayerDATABASE.h["Two [Test]"].h.EquipmentQuantity[0][15], 0);
    assert.equal(recalculated, 1);
});

test("late invalid, stale and duplicate changes reject the whole batch before writes", () => {
    for (const second of [
        { name: "Two [Test]", before: "EquipmentGown2", item: "EquipmentGown0" },
        { name: "Two [Test]", before: "Blank", item: "EquipmentGown1" },
        { name: "One", before: "EquipmentGown1", item: "Blank" },
    ]) {
        const a = fixture(),
            before = JSON.stringify(a);
        assert.throws(() =>
            applyCharacterAttire(
                a,
                request({ name: "One", before: "EquipmentGown1", item: "EquipmentGown2" }, second),
                () => {}
            )
        );
        assert.equal(JSON.stringify(a), before);
    }
    const a = fixture(),
        before = JSON.stringify(a);
    assert.throws(() => applyCharacterAttire(a, { active: "Other", changes: [] }, () => {}), /active character/);
    assert.equal(JSON.stringify(a), before);
});

test("failed active recalculation rolls back all character slots and modifier objects", () => {
    const a = fixture(),
        before = JSON.stringify(a),
        map = a.EquipmentMap[0][15].h;
    assert.throws(
        () =>
            applyCharacterAttire(
                a,
                request(
                    { name: "One", before: "EquipmentGown1", item: "Blank" },
                    { name: "Two [Test]", before: "EquipmentGown2", item: "EquipmentGown1" }
                ),
                () => {
                    throw new Error("recalc failed");
                }
            ),
        /recalc failed/
    );
    assert.equal(JSON.stringify(a), before);
    assert.equal(a.EquipmentMap[0][15].h, map);
});

test("inactive-only changes do not recalculate the active character; unchanged attire retains modifiers", () => {
    const a = fixture();
    applyCharacterAttire(a, request({ name: "Two [Test]", before: "EquipmentGown2", item: "EquipmentGown1" }), () => {
        assert.fail("active recalc");
    });
    const map = a.EquipmentMap[0][15].h;
    const result = applyCharacterAttire(
        a,
        request({ name: "One", before: "EquipmentGown1", item: "EquipmentGown1" }),
        () => {
            assert.fail("unchanged recalc");
        }
    );
    assert.deepEqual(result.changed, []);
    assert.equal(a.EquipmentMap[0][15].h, map);
});

test("aliased live/saved equipment is handled once and unavailable characters are labelled", () => {
    const a = fixture();
    a.PlayerDATABASE.h.One.h = a;
    applyCharacterAttire(a, request({ name: "One", before: "EquipmentGown1", item: "Blank" }), () => {});
    assert.equal(a.EquipmentQuantity[0][15], 0);
    delete a.PlayerDATABASE.h["Two [Test]"].h.EquipmentMap;
    assert.equal(characterAttire(a)[1].available, false);
});
