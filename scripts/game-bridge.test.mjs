import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
const require = createRequire(import.meta.url);
const { createGameBridge } = require("../src/modules/game/gameBridge.js");

// CDP omits result.value for objects unless returnByValue is requested.
function runtime(cheat) {
    return {
        async evaluate(options) {
            try {
                const value = await runInNewContext(options.expression, { window: {}, cheat, attireAction: cheat });
                if (value !== null && typeof value === "object" && !options.returnByValue)
                    return { result: { type: "object", objectId: "remote-handle" } };
                return { result: { value: value === undefined ? undefined : JSON.parse(JSON.stringify(value)) } };
            } catch (error) {
                return { exceptionDetails: { text: "Uncaught", exception: { description: error.message } } };
            }
        },
    };
}

test("helper actions deliver structured attire data across the CDP boundary", async () => {
    const expected = { enabled: false, selected: [], outfits: [{ id: "EquipmentGown1", name: "Cobalt Robe" }] };
    const bridge = createGameBridge(
        runtime(() => expected),
        "window"
    );
    assert.deepEqual(await bridge.callHelper("attireAction", ["status"]), { value: expected, error: null });
});

test("cheat actions preserve primitive results and safely encode command text", async () => {
    let seen;
    const action = 'drop "quoted"\\value';
    const bridge = createGameBridge(
        runtime((text) => {
            seen = text;
            return "Done";
        }),
        "window"
    );
    assert.deepEqual(await bridge.executeCheat(action), { value: "Done", error: null });
    assert.equal(seen, action);
});

test("native evaluation failures retain their error details", async () => {
    const bridge = createGameBridge(
        runtime(() => {
            throw new Error("Native failure");
        }),
        "window"
    );
    const result = await bridge.callHelper("attireAction", ["status"]);
    assert.equal(result.error.details, "Native failure");
});
