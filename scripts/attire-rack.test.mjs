import assert from "node:assert/strict";
import { test } from "node:test";
import { attireCatalog, configuredAttire } from "../src/cheats/helpers/attireRack.js";
const defs = {
    EquipmentGown0: { h: { typeGen: "aGown", displayName: "Robes" } },
    EquipmentGown1: { h: { typeGen: "aGown", displayName: "First" } },
    Other: { h: { typeGen: "aGown" } },
};
test("all outfits includes new definitions after restart; explicit selections stay explicit", () => {
    const config = JSON.parse(JSON.stringify({ outfits: "all" }));
    const updated = { ...defs, EquipmentGown99: { h: { typeGen: "aGown", displayName: "New" } } };
    assert.deepEqual(configuredAttire(updated, config), ["EquipmentGown1", "EquipmentGown99"]);
    assert.deepEqual(configuredAttire(updated, { outfits: "EquipmentGown1" }), ["EquipmentGown1"]);
    assert.deepEqual(configuredAttire(updated, { outfits: "" }), []);
    assert.throws(() => configuredAttire(updated, { outfits: "EquipmentGown0" }), /Unknown attire/);
    assert.equal(attireCatalog(defs).length, 1);
});
