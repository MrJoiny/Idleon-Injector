---
name: idleon-live-cdp
description: Inspect and interact with a running Legends of Idleon session through the Chrome DevTools Protocol on port 32123. Use when Codex needs to read live game state such as gga.Money, explore gga or Haxe .h structures, query injected Idleon helpers and definitions, diagnose the active game runtime, or make an explicitly requested and verified live-state change.
---

# Idleon Live CDP

Use the bundled bridge from the Idleon-Injector repository root. Default to read-only work. Treat every evaluated expression as code running inside the live game.

## Start safely

1. Confirm the current directory is the Idleon-Injector repository.
2. Run the status command before every task. It scans page targets and selects the one where the injected `gga` and `readGamePath` globals are ready.
3. Inspect the relevant repository code before relying on an unfamiliar game path. Start with `src/cheats/main.js`, then search `src/cheats/` and `src/ui/` for the path or reference.
4. Read through the injected helper API before using raw JavaScript.
5. Keep result sets narrow. Read one path or selected map entries instead of serializing all of `gga`, `itemDefs`, or `cList`.

```powershell
node .agents/skills/idleon-live-cdp/scripts/idleon-cdp.js status
node .agents/skills/idleon-live-cdp/scripts/idleon-cdp.js read "gga.Money"
```

Use `--port <number>` only when the configured CDP port differs from 32123.

## Read and discover

Prefer these commands:

```powershell
# Read a path through the injected path resolver.
node .agents/skills/idleon-live-cdp/scripts/idleon-cdp.js read "gga.Cards[0].h"

# Read selected definition entries without transferring the full map.
node .agents/skills/idleon-live-cdp/scripts/idleon-cdp.js entries "gga.MonsterDefinitionsGET.h" "mushG" "Name,MonsterHPTotal"

# Search only named top-level GGA roots.
node .agents/skills/idleon-live-cdp/scripts/idleon-cdp.js search "100-200" "Money,GemsOwned"
```

Use `eval` only when the injected helpers cannot answer the question. Keep expressions side-effect-free and return a small plain value.

```powershell
node .agents/skills/idleon-live-cdp/scripts/idleon-cdp.js eval "({money: gga.Money, map: gga.CurrentMap})"
```

For advanced references, computed helpers, Haxe traversal, target behavior, and serialization limits, read [references/runtime-surface.md](references/runtime-surface.md).

## Change live state

Change state only when the user explicitly requests that exact mutation. Never infer permission to write from a request to inspect, diagnose, research, or explain.

Before a write:

1. Read and report the current value.
2. Confirm the path and JSON value match the user's request.
3. Write one path at a time with `--allow-write`.
4. Require the bridge's read-back verification to succeed.
5. Report before, requested, and after values. Stop on a mismatch.

```powershell
node .agents/skills/idleon-live-cdp/scripts/idleon-cdp.js write "gga.Money" "123" --allow-write
```

Do not use raw `eval` for a mutation when `writeGamePath` or an existing `cheat(...)` command covers it. Batch writes are non-atomic; avoid them unless the user specifically needs a coordinated batch, and verify every path afterward.

## Guardrails

- Never start, stop, reload, navigate, or attach a different game process unless the user asks.
- Never call `setup`, `cheat`, `writeGamePath`, `writeGamePaths`, mutating ActorEvents methods, or direct assignments during read-only discovery.
- Treat `monitorWrap` as a mutation: it replaces a property descriptor. Always pair it with `monitorUnwrap` in the same task.
- Reconnect and rerun `status` after navigation, character selection, reload, or a lost WebSocket. Runtime object identities can change.
- Prefer `gga.MonsterDefinitionsGET.h`, `gga.ItemDefinitionsGET.h`, and `gga.CustomLists.h` when freshness matters. Convenience getters can point at an earlier object after the game recreates data.
- Do not expose unrelated account data. Return only the fields needed for the user's request.
- Remember that CDP port 32123 has no application-level authentication. Keep all access on loopback.

## Troubleshoot

- Connection refused: the game/browser was not launched with `--remote-debugging-port=32123`, or it has exited.
- No injected Idleon target: the page exists but cheat injection/setup is not ready; inspect injector logs and `src/modules/game/cheatInjection.js`.
- `exceptionDetails`: report the full exception description and do not treat the result as valid.
- `{}` or missing fields: use `readGamePath`, explicitly traverse `.h`, select fields with `entries`, or return a JSON-safe plain object.
- `null` for special numbers: by-value serialization converts `NaN` and infinities to `null` inside objects and normalizes `-0` to `0`; inspect such values individually when exact numeric identity matters.
- Missing path: distinguish a resolver error from a valid final property whose value is `undefined`.
