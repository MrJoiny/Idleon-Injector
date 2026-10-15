import { readdir, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { rollup } from "rollup";

async function collectModules(directory) {
    const files = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) files.push(...(await collectModules(path)));
        else if (entry.isFile() && entry.name.endsWith(".js")) files.push(path);
    }
    return files;
}

export async function validateUiImports(directory) {
    const input = (await collectModules(resolve(directory))).sort();
    if (!input.length) throw new Error(`No UI JavaScript modules found in ${directory}`);
    const importPositions = new Map();
    const bundle = await rollup({
        input,
        treeshake: false,
        plugins: [
            {
                name: "browser-module-imports",
                async resolveId(source, importer) {
                    if (!importer) return null;
                    // shortcut: local relative imports only; extend when the UI adopts URL imports or import maps.
                    if (!source.startsWith("./") && !source.startsWith("../")) {
                        this.error(`Unsupported module import "${source}" in ${relative(process.cwd(), importer)}`);
                    }
                    const path = resolve(dirname(importer), source);
                    // Browser imports need the exact file, without Node-style extension or directory lookup.
                    if (!(await stat(path)).isFile()) this.error(`Module import "${source}" is not a file`);
                    return path;
                },
                moduleParsed({ id, ast }) {
                    importPositions.set(
                        id,
                        new Set(
                            ast.body
                                .filter((node) => node.type === "ImportDeclaration")
                                .flatMap((node) => node.specifiers.map((specifier) => specifier.start))
                        )
                    );
                },
            },
        ],
        onLog(_level, log, handler) {
            // Missing namespace properties are legal; missing static import bindings are not.
            if (
                log.code === "UNRESOLVED_IMPORT" ||
                (log.code === "MISSING_EXPORT" && importPositions.get(log.id)?.has(log.pos))
            ) {
                handler("error", log);
            }
        },
    });
    await bundle.close();
    return input.length;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const count = await validateUiImports(fileURLToPath(new URL("../src/ui/", import.meta.url)));
        console.log(`Validated imports in ${count} UI modules.`);
    } catch (error) {
        console.error(error.message);
        if (error.frame) console.error(error.frame);
        process.exitCode = 1;
    }
}
