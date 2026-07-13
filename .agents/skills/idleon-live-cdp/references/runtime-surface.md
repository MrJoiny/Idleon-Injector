# Idleon live runtime surface

Read this reference before advanced evaluation, unfamiliar traversal, computed helper calls, monitoring, or any write.

## Source of truth

Re-check these files when the repository changes:

- `src/cheats/main.js`: globals exposed on `window`
- `src/cheats/core/globals.js`: engine reference initialization
- `src/cheats/api/stateAccessors.js`: supported path, entry, computed, and write helpers
- `src/cheats/utils/pathResolver.js`: path grammar and `.h` auto-unwrapping
- `src/cheats/api/search.js`: search behavior and limits
- `src/cheats/core/valueMonitor.js`: descriptor-based monitoring
- `src/modules/game/gameAttachment.js`: port and target discovery
- `src/modules/game/cheatInjection.js`: injection and game-context expression

## Connection and context

The injector launches Chromium/Electron with `--remote-debugging-port=32123`. `http://127.0.0.1:32123/json/list` may contain the game, DevTools, and unrelated iframe targets. Do not select the first target. Connect to page targets and choose the one where both `typeof gga === "object"` and `typeof readGamePath === "function"` are true.

The injected game context is:

```javascript
window.__idleon_cheats__ || window.document.querySelector("iframe")?.contentWindow?.__idleon_cheats__;
```

`window.__idleon_cheats__` is the Haxe/Stencyl application object and is not necessarily `window`. The public getters and helper functions are exposed on the target page's `window` after `setup` completes.

## Public references

| Global           | Meaning                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `bEngine`        | `context["com.stencyl.Engine"].engine`                             |
| `gga`            | Current `bEngine.gameAttributes.h` map                             |
| `itemDefs`       | Item definition map captured from `gga.ItemDefinitionsGET.h`       |
| `monsterDefs`    | Monster definition map captured from `gga.MonsterDefinitionsGET.h` |
| `cList`          | Custom-list map captured from `gga.CustomLists.h`                  |
| `behavior`       | `context["com.stencyl.behavior.Script"]`                           |
| `events(number)` | Returns `context["scripts.ActorEvents_<number>"]`                  |
| `cheats`         | Registered cheat definitions                                       |
| `cheatState`     | Current cheat toggle/config state                                  |

These are configurable getter properties. The top-level getters are live module bindings, but nested game objects can be recreated. A live probe on 2026-07-12 found `monsterDefs` and `gga.MonsterDefinitionsGET.h` with the same keys but different object identities. Prefer the direct `gga.*.h` path for freshness-sensitive reads and reconnect after character selection or reload.

## Public helper API

| Helper                                          | Behavior                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `readGamePath(path)`                            | Resolve a dot/bracket path and return `{ value }` or `{ error }`                           |
| `readGameEntries(rootPath, keys, fields?)`      | Read selected map entries; field lookup checks `entry.h` first                             |
| `readComputedValue(namespace, name, args?)`     | Call one allowlisted ActorEvents helper                                                    |
| `readComputedValues(namespace, name, argSets?)` | Batch the same allowlisted computed helper                                                 |
| `writeGamePath(path, value)`                    | Assign one JSON-compatible value                                                           |
| `writeGamePaths(writes)`                        | Assign several paths independently; not atomic                                             |
| `getGgaKeys()`                                  | Return sorted, non-blacklisted top-level GGA keys                                          |
| `searchGga(query, keys)`                        | Search selected GGA roots for a string, number, boolean, null, undefined, or numeric range |
| `monitorWrap(id, path)`                         | Replace a configurable property descriptor and broadcast changes                           |
| `monitorUnwrap(id)`                             | Restore the descriptor for one monitor id                                                  |
| `monitorList()`                                 | List active monitor ids and paths                                                          |
| `cheat(action)`                                 | Dispatch a registered cheat command; potentially mutating                                  |

Computed namespaces currently supported by `stateAccessors.js` are `workbench`, `breeding`, `alchemy`, `summoning`, `atomCollider`, `runCode`, `runCodeType`, `dream`, `skillStats`, `thingies`, `minehead`, and `farming`. Read the map in that file before relying on a method name or argument contract.

## Haxe paths

Haxe objects commonly wrap data in `.h` and may include `__id__`. Examples:

```javascript
gga.Money;
gga.Cards[0].h;
gga.PlayerDATABASE.h[playerName].h;
gga.CustomLists.h.CardStuff;
gga.ItemDefinitionsGET.h[itemId].h;
gga.MonsterDefinitionsGET.h[monsterId].h;
```

`readGamePath` supports simple dot and bracket segments. It strips `[` and `]`; it is not a full JavaScript parser and does not interpret quoted property names. Use a small, JSON-safe `eval` expression for keys that cannot be represented by this path grammar.

The resolver auto-unwraps `.h` only while walking intermediate segments and only when the next segment is not explicitly `h`. The final returned value is not automatically unwrapped. Therefore `readGamePath("gga.Cards[0]")` returns the wrapper, while `readGamePath("gga.Cards[0].h")` returns its map.

## CDP behavior and limits

- `Runtime.evaluate` can execute arbitrary synchronous or asynchronous JavaScript in the live page. `awaitPromise: true` resolves returned promises.
- Always check `exceptionDetails`; a protocol response can exist even when the expression threw.
- Use `returnByValue: true` for disposable plain results. Avoid retaining remote `objectId` handles across reloads.
- By-value object serialization is lossy for special numbers: `NaN` and infinities become `null`, and `-0` becomes `0`. Functions, symbols, accessors, cycles, and host objects may not serialize usefully.
- `readGamePath` JSON-round-trips values when possible. This makes Haxe data transferable but has the same JSON losses.
- A valid final property with value `undefined` can serialize as a missing `value` field. An invalid intermediate segment returns an explicit resolver error.
- Large reads can stall the game or flood tool output. Prefer `readGameEntries`, selected keys, `Object.keys(...).slice(...)`, counts, and projections.
- `searchGga` traverses selected roots and reads configurable getters. Narrow the roots and query before running it.
- Direct assignments and function calls can trigger game side effects, cloud-save behavior, proxy logic, or later overwrites. CDP does not provide transaction or rollback semantics.
- `writeGamePaths` continues after per-entry failures and does not roll back earlier writes.
- `monitorWrap` mutates the target descriptor and depends on the injector WebSocket server. Always unwrap it, including after errors.
- CDP cannot make an uninjected page expose `gga`; injection must have succeeded and `setup` must have registered the globals.

## Safe evaluation patterns

Return projections instead of whole graphs:

```javascript
({ money: gga.Money, currentMap: gga.CurrentMap });
```

Inspect structure without invoking methods:

```javascript
({ type: typeof gga.Cards, keys: Object.keys(gga.Cards ?? {}).slice(0, 20) });
```

Select definitions through the helper:

```javascript
readGameEntries("gga.MonsterDefinitionsGET.h", ["mushG"], ["Name", "MonsterHPTotal"]);
```

Read a computed value only after confirming the namespace and arguments in source:

```javascript
readComputedValue("workbench", "ExtraMaxLvAtom", [baseMax, index]);
```
