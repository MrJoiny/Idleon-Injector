import assert from "node:assert/strict";
import { test } from "node:test";
import { Linter } from "eslint";
import rule from "./no-static-inline-styles.mjs";

const linter = new Linter();
const config = {
    languageOptions: { ecmaVersion: 2022, sourceType: "module" },
    plugins: { ui: { rules: { "no-static-inline-styles": rule } } },
    rules: { "ui/no-static-inline-styles": "error" },
};

const valid = [
    'div({ class: "progress" });',
    'div({ style: "--progress: 0%;" });',
    'div({ style: () => `--progress: ${pct}%; --color: rgb(${rgb.join(", ")});` });',
    'div({ style: () => enabled ? "--progress: 50%;" : "" });',
    'div({ style: function () { if (enabled) return "--color: red;"; return ""; } });',
    "div({ style: \"--image: url(data:image/svg+xml;base64,abc); --label: 'a; color: red';\" });",
    'div({ style: "/* positioning data */ --position: 12px;" });',
    "div({ style: \"--label: '/*; color: red; */'; --progress: 12px;\" });",
    "div({ style: () => `left: ${x}px; top: ${y}px;` });",
    'div({ style: "--progress:" + pct + "%" });',
    'div({ style: () => enabled && "--progress: 50%;" });',
    'div({ style: () => enabled ? null : "--progress: 50%;" });',
    'div({ style: () => { const unrelated = () => "display: flex;"; return "--progress: 50%;"; } });',
    'const text = "style: display: flex";',
    "const Loader = ({ style = {} } = {}) => style;",
    'div({ style: () => { const holes = [,]; return "--progress: 50%;"; } });',
];

const invalid = [
    ['div({ style: "display: flex;" });', "display"],
    ['div({ "style": "font-size: 12px;" });', "font-size"],
    ['div({ ["style"]: "color: red;" });', "color"],
    ['div({ style: () => enabled ? "" : "display: none;" });', "display"],
    ['div({ style: () => { if (enabled) return ""; return "padding: 4px;"; } });', "padding"],
    ['div({ style: `background: rgb(${rgb.join(", ")});` });', "background"],
    ['div({ style: "--progress: 10%; color: red;" });', "color"],
    ['div({ style: "display:" + display });', "display"],
    ["div({ style: () => `height: ${pct}%;` });", "height"],
    ['div({ style: "left: 10px;" });', "left"],
    ['div({ style: () => enabled && "display: flex;" });', "display"],
    ["div({ style: `--${name}: 10px;` });", null],
    ["div({ style: getStyles() });", null],
    ["div({ style: styles });", null],
    ["div({ style: () => state.val });", null],
    ['div({ style: "display: something(" });', "display"],
    ["div({ style: \"--label: '/*'; color: red; --other: '*/';\" });", "color"],
];

test("allows custom properties and runtime coordinates", () => {
    for (const source of valid) assert.deepEqual(linter.verify(source, config), [], source);
});

test("rejects static CSS and styles whose declarations cannot be verified", () => {
    for (const [source, property] of invalid) {
        const messages = linter.verify(source, config);
        assert.equal(messages.length, 1, source);
        assert.equal(messages[0].ruleId, "ui/no-static-inline-styles", source);
        assert.equal(messages[0].severity, 2, source);
        assert.ok(messages[0].line > 0 && messages[0].column > 0, source);
        if (property) assert.ok(messages[0].message.includes(`"${property}"`), source);
    }
});
