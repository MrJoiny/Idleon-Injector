import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { validateUiImports } from "./validate-ui-imports.mjs";

const cases = [
    {
        name: "valid aliases, defaults, namespaces, comments, and inert module code",
        files: {
            "main.js":
                'import value, { named as alias } from "./dep.js"; import * as ns from "./dep.js"; console.log(value, alias, ns.absent); // import { fake } from "./missing.js";',
            "dep.js": 'export default 1; export const named = 2; throw new Error("Do not execute UI modules");',
        },
    },
    {
        name: "valid transitive star, named, and namespace re-exports",
        files: {
            "main.js": 'import value, { alias, named, ns } from "./barrel.js"; console.log(value, alias, named, ns);',
            "barrel.js":
                'export * from "./middle.js"; export { default, named as alias } from "./dep.js"; export * as ns from "./dep.js";',
            "middle.js": 'export * from "./dep.js";',
            "dep.js": "export default 1; export const named = 2;",
        },
    },
    {
        name: "valid circular re-exports",
        files: {
            "main.js": 'import { left, right } from "./a.js"; console.log(left, right);',
            "a.js": 'export * from "./b.js"; export const left = 1;',
            "b.js": 'export * from "./a.js"; export const right = 2;',
        },
    },
    {
        name: "valid explicitly resolved star-export conflict",
        files: {
            "main.js": 'import { value } from "./barrel.js"; console.log(value);',
            "barrel.js": 'export * from "./a.js"; export * from "./b.js"; export { value } from "./a.js";',
            "a.js": "export const value = 1;",
            "b.js": "export const value = 2;",
        },
    },
    {
        name: "missing used named export",
        files: {
            "main.js": 'import { missing } from "./dep.js"; console.log(missing);',
            "dep.js": "export const value = 1;",
        },
        error: /"missing" is not exported/,
    },
    {
        name: "missing unused named export",
        files: { "main.js": 'import { missing as unused } from "./dep.js";', "dep.js": "export const value = 1;" },
        error: /"missing" is not exported/,
    },
    {
        name: "missing unused default export",
        files: { "main.js": 'import unused from "./dep.js";', "dep.js": "export const value = 1;" },
        error: /"default" is not exported/,
    },
    {
        name: "an import is not an implicit re-export",
        files: {
            "main.js": 'import { toIndexedArray } from "./accountShared.js";',
            "accountShared.js": 'import { toIndexedArray } from "./utils.js"; export const other = toIndexedArray;',
            "utils.js": "export const toIndexedArray = () => [];",
        },
        error: /"toIndexedArray" is not exported/,
    },
    {
        name: "invalid named re-export",
        files: { "barrel.js": 'export { missing } from "./dep.js";', "dep.js": "export const value = 1;" },
        error: /"missing" is not exported/,
    },
    {
        name: "ambiguous unused star import",
        files: {
            "main.js": 'import { value } from "./barrel.js";',
            "barrel.js": 'export * from "./a.js"; export * from "./b.js";',
            "a.js": "export const value = 1;",
            "b.js": "export const value = 2;",
        },
        error: /"value" is not exported/,
    },
    {
        name: "missing module, including side-effect imports",
        files: { "main.js": 'import "./missing.js";' },
        error: /missing\.js/,
    },
    {
        name: "browser imports cannot omit file extensions",
        files: { "main.js": 'import { value } from "./dep";', "dep.js": "export const value = 1;" },
        error: /dep/,
    },
    {
        name: "browser imports cannot resolve a directory index",
        files: { "main.js": 'import "./dep";', "dep/index.js": "export const value = 1;" },
        error: /is not a file/,
    },
    {
        name: "missing literal dynamic import",
        files: { "main.js": 'export const load = () => import("./missing.js");' },
        error: /missing\.js/,
    },
    {
        name: "unreachable UI files are checked too",
        files: {
            "main.js": "export const value = 1;",
            "unused/broken.js": 'import { missing } from "../main.js";',
        },
        error: /"missing" is not exported/,
    },
    {
        name: "unsupported bare imports fail explicitly",
        files: { "main.js": 'import "unmapped-package";' },
        error: /Unsupported module import/,
    },
    {
        name: "empty directory fails instead of silently skipping validation",
        files: {},
        error: /No UI JavaScript modules/,
    },
];

for (const { name, files, error } of cases) {
    test(name, async () => {
        const directory = await mkdtemp(join(tmpdir(), "idleon-ui-imports-"));
        assert.equal(dirname(directory), resolve(tmpdir()));
        try {
            for (const [name, source] of Object.entries(files)) {
                const path = join(directory, name);
                await mkdir(dirname(path), { recursive: true });
                await writeFile(path, source);
            }
            if (error) await assert.rejects(validateUiImports(directory), error);
            else assert.equal(await validateUiImports(directory), Object.keys(files).length);
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
}
