import assert from "node:assert/strict";
import { test } from "node:test";
import { applyConfigEdits } from "../src/ui/utils/index.js";

test("keeps a newer value for a field the user did not edit", () => {
    const base = { w1: { companion: { companions: "" } }, speed: 2 };
    const edited = { w1: { companion: { companions: "" } }, speed: 3 };
    const latest = { w1: { companion: { companions: "1:0,2:1" } }, speed: 2 };

    assert.deepEqual(applyConfigEdits(latest, base, edited), {
        w1: { companion: { companions: "1:0,2:1" } },
        speed: 3,
    });
});

test("lets an edit win when the same field also changed elsewhere", () => {
    assert.deepEqual(applyConfigEdits({ pets: "2:1" }, { pets: "" }, { pets: "1:0" }), { pets: "1:0" });
});

test("treats an edited array as one value", () => {
    assert.deepEqual(applyConfigEdits({ cheats: ["a", "b"] }, { cheats: ["a"] }, { cheats: ["c"] }), {
        cheats: ["c"],
    });
});

test("keeps a newer array the user did not edit", () => {
    assert.deepEqual(applyConfigEdits({ cheats: ["a", "b"] }, { cheats: ["a"] }, { cheats: ["a"] }), {
        cheats: ["a", "b"],
    });
});

test("keeps fields that only exist in the latest settings", () => {
    assert.deepEqual(applyConfigEdits({ a: 1, b: { c: 2 } }, { a: 1 }, { a: 1 }), { a: 1, b: { c: 2 } });
});

test("adds an edited field the latest settings do not have", () => {
    assert.deepEqual(applyConfigEdits({ a: { b: 1 } }, { a: { b: 1 } }, { a: { b: 1, c: 2 } }), { a: { b: 1, c: 2 } });
});

test("returns the latest settings unchanged when nothing was edited", () => {
    const base = { a: 1, b: { c: "x" } };

    assert.deepEqual(applyConfigEdits({ a: 9, b: { c: "y" } }, base, structuredClone(base)), { a: 9, b: { c: "y" } });
});
