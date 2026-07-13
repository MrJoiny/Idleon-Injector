#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { createRequire } = require("node:module");

function loadCdp() {
    try {
        return require("chrome-remote-interface");
    } catch (originalError) {
        try {
            return createRequire(path.join(process.cwd(), "package.json"))("chrome-remote-interface");
        } catch {
            throw new Error(
                `Cannot load chrome-remote-interface. Run this command from the Idleon-Injector repository root. ${originalError.message}`
            );
        }
    }
}

function usage() {
    console.log(`Usage:
  idleon-cdp.js status [--port 32123]
  idleon-cdp.js read <path> [--port 32123]
  idleon-cdp.js entries <root-path> <keys> [fields] [--port 32123]
  idleon-cdp.js search <query> <keys> [--port 32123]
  idleon-cdp.js eval <expression> [--port 32123]
  idleon-cdp.js write <path> <value-json> --allow-write [--port 32123]`);
}

function parseArgs(argv) {
    const args = [...argv];
    let port = 32123;
    let allowWrite = false;

    for (let index = 0; index < args.length; ) {
        if (args[index] === "--port") {
            port = Number(args[index + 1]);
            args.splice(index, 2);
        } else if (args[index] === "--allow-write") {
            allowWrite = true;
            args.splice(index, 1);
        } else {
            index += 1;
        }
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535)
        throw new Error("--port must be an integer from 1 to 65535");
    return { command: args.shift(), args, port, allowWrite };
}

async function evaluate(client, expression) {
    const response = await client.Runtime.evaluate({
        expression,
        awaitPromise: true,
        returnByValue: true,
        allowUnsafeEvalBlockedByCSP: true,
    });

    if (response.exceptionDetails) {
        const description = response.exceptionDetails.exception?.description || response.exceptionDetails.text;
        throw new Error(description || "Runtime.evaluate failed");
    }

    if (Object.prototype.hasOwnProperty.call(response.result, "value")) return response.result.value;
    if (response.result.unserializableValue !== undefined) return response.result.unserializableValue;
    return { type: response.result.type, description: response.result.description };
}

async function connect(CDP, port) {
    const targets = await CDP.List({ host: "127.0.0.1", port });
    const candidates = targets
        .filter((target) => target.type === "page" && !target.url.startsWith("devtools://"))
        .sort(
            (left, right) =>
                Number(/legendsofidleon\.com/i.test(right.url)) - Number(/legendsofidleon\.com/i.test(left.url))
        );

    for (const target of candidates) {
        let client;
        try {
            client = await CDP({ host: "127.0.0.1", port, target });
            const ready = await evaluate(
                client,
                `typeof window.gga === "object" && window.gga !== null && typeof window.readGamePath === "function"`
            );
            if (ready) return { client, target, targetCount: targets.length };
        } catch {
            // Another page target may be the injected game.
        }
        if (client) await client.close();
    }

    throw new Error(`No injected Idleon page target found on 127.0.0.1:${port}`);
}

function parseJson(value, label) {
    try {
        return JSON.parse(value);
    } catch (error) {
        throw new Error(`${label} must be valid JSON: ${error.message}`);
    }
}

function parseList(value, label) {
    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // PowerShell can strip quotes from JSON arrays passed to native programs.
    }

    const parsed = value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
    if (parsed.length === 0) throw new Error(`${label} must be a comma-separated list or JSON array`);
    return parsed;
}

async function runCommand(connection, parsed) {
    const { client, target, targetCount } = connection;
    const { command, args, allowWrite } = parsed;

    if (command === "status") {
        const runtime = await evaluate(
            client,
            `({
                url: location.href,
                title: document.title,
                ggaKeys: getGgaKeys().length,
                gameContextReady: !!window.__idleon_cheats__,
                references: Object.fromEntries(["bEngine", "gga", "itemDefs", "monsterDefs", "cList", "behavior", "events"].map((key) => [key, typeof window[key]])),
                helpers: Object.fromEntries(["readGamePath", "readGameEntries", "readComputedValue", "readComputedValues", "writeGamePath", "writeGamePaths", "searchGga", "monitorWrap", "monitorUnwrap"].map((key) => [key, typeof window[key]]))
            })`
        );
        return {
            port: parsed.port,
            targetCount,
            selectedTarget: { id: target.id, type: target.type, url: target.url },
            runtime,
        };
    }

    if (command === "read") {
        if (args.length !== 1) throw new Error("read requires exactly one path");
        const result = await evaluate(client, `readGamePath(${JSON.stringify(args[0])})`);
        if (result?.error) throw new Error(result.error);
        return { path: args[0], value: result?.value };
    }

    if (command === "entries") {
        if (args.length < 2 || args.length > 3)
            throw new Error("entries requires root-path, keys, and optional fields");
        const keys = parseList(args[1], "keys");
        const fields = args.length === 3 ? parseList(args[2], "fields") : null;
        const result = await evaluate(
            client,
            `readGameEntries(${JSON.stringify(args[0])}, ${JSON.stringify(keys)}, ${JSON.stringify(fields)})`
        );
        if (result?.error) throw new Error(result.error);
        return { rootPath: args[0], value: result?.value };
    }

    if (command === "search") {
        if (args.length !== 2) throw new Error("search requires a query and keys");
        const keys = parseList(args[1], "keys");
        return evaluate(client, `searchGga(${JSON.stringify(args[0])}, ${JSON.stringify(keys)})`);
    }

    if (command === "eval") {
        if (args.length === 0) throw new Error("eval requires an expression");
        return evaluate(client, args.join(" "));
    }

    if (command === "write") {
        if (!allowWrite) throw new Error("Refusing to write without --allow-write");
        if (args.length !== 2) throw new Error("write requires a path and value-json");
        const value = parseJson(args[1], "value-json");
        const expression = `(() => {
            const path = ${JSON.stringify(args[0])};
            const expected = ${JSON.stringify(value)};
            const before = readGamePath(path);
            const write = writeGamePath(path, expected);
            const after = write.error ? null : readGamePath(path);
            return {
                path,
                before: before.value,
                expected,
                write,
                after: after?.value,
                verified: !write.error && JSON.stringify(after?.value) === JSON.stringify(expected)
            };
        })()`;
        return evaluate(client, expression);
    }

    throw new Error(`Unknown command: ${command || "(missing)"}`);
}

async function main() {
    const parsed = parseArgs(process.argv.slice(2));
    if (!parsed.command || parsed.command === "help" || parsed.command === "--help") {
        usage();
        return;
    }

    const CDP = loadCdp();
    const connection = await connect(CDP, parsed.port);
    try {
        const result = await runCommand(connection, parsed);
        console.log(JSON.stringify(result, null, 2));
        if (parsed.command === "write" && !result.verified) process.exitCode = 2;
    } finally {
        await connection.client.close();
    }
}

main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
});
