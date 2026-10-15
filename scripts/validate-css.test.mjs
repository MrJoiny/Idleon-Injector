import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import stylelint from "stylelint";

const configFile = fileURLToPath(new URL("../.stylelintrc.json", import.meta.url));

const valid = [
    ".progress { --fill: 50%; width: var(--fill); color: var(--c-text); }",
    ".panel { color: #fff; } @supports (color: rgb(255 255 255 / 80%)) { .panel { color: rgb(255 255 255 / 80%); } }",
    ".panel { color: red; } .panel { background: black; }",
    ".panel { width: 100%; } @media (min-width: 600px) { .panel { width: 50%; } }",
    ".dot:hover { r: 5px; }",
    ".progress { width: calc(100% - 2px); transition: width 0.2s ease; }",
    "@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }",
];

const invalid = [
    [".panel { color: red; color: blue; }", "declaration-block-no-duplicate-properties"],
    [".panel { color: red; color: red; }", "declaration-block-no-duplicate-properties"],
    [".panel { --fill: 10%; --fill: 20%; }", "declaration-block-no-duplicate-custom-properties"],
    [".panel { colro: red; }", "property-no-unknown"],
    [".panel { width: red; }", "declaration-property-value-no-unknown"],
    [".panel { color: #fffff; }", "color-no-invalid-hex"],
    [".panel { width: 5ppx; }", "unit-no-unknown"],
    ["@medai (min-width: 600px) { .panel { color: red; } }", "at-rule-no-unknown"],
    [".panel {}", "block-no-empty"],
    [".dot:hover { r: 5; }", "declaration-property-value-no-unknown"],
    [".panel { color: red;", "CssSyntaxError"],
];

test("allows runtime variables, browser fallbacks, and intentional cascade overrides", async () => {
    for (const code of valid) {
        const result = await stylelint.lint({ code, configFile });
        assert.equal(result.errored, false, code);
        assert.deepEqual(result.results[0].warnings, [], code);
    }
});

test("rejects CSS mistakes with a rule and source location", async () => {
    for (const [code, rule] of invalid) {
        const result = await stylelint.lint({ code, configFile });
        assert.equal(result.errored, true, code);
        const warning = result.results[0].warnings.find((entry) => entry.rule === rule);
        assert.ok(warning, `${rule}: ${code}`);
        assert.equal(warning.severity, "error", code);
        assert.ok(warning.line > 0 && warning.column > 0, code);
    }
});
