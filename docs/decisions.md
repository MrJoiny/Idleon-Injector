# Design decisions

Record a decision, its reason, and its trade-off here. Include alternatives when they are known.
Do not infer historical intent from the implementation or maintain a second description of its behavior.

## Keep documentation thin

Decision: use docs for navigation, domain language, design rationale, and user workflows or safety guidance.
Keep implementation contracts beside their source when an explanation is necessary.

Why: descriptions of algorithms, field lists, startup order, and copied code can drift independently of the code.
Names and structure should make the implementation understandable.

Alternative: maintain a separate implementation reference or tutorial for each module.

Trade-off: contributors must read source for exact behavior. A small [architecture map](architecture.md)
provides entry points without duplicating it.

Update the map when a top-level area or runtime boundary changes. Define new terms once in the
[glossary](glossary.md). Update an existing decision when its trade-off changes.

## Preserve original method side effects

Decision: method hooks follow the base-first convention.

Why: the original game method may update state as well as return a value.
Replacing its result must not silently skip those side effects.

Alternative: return a cheat value before invoking the original method.

Trade-off: the original work still runs even when its result will be overridden.

Source: [proxy utilities](../src/cheats/utils/proxy.js).

## Preserve editable row identity

Decision: keep editable Account rows stable when their values change.
Choose simpler rebuilding only where losing transient input or feedback state is acceptable.

Why: rebuilding an active row can lose focus, draft text, or write feedback.

Alternative: rebuild the whole section whenever any row changes.

Trade-off: stable rows require explicit value updates and collection reconciliation.

Source: [Account components](../src/ui/components/views/account/components/),
[Account shared helpers](../src/ui/components/views/account/accountShared.js).

## Share the lifecycle of simple Account lists

Decision: use one page module for single-section numeric lists, while each Account page owns its game reads
and entry definitions.

Why: repeated load, reconciliation, and value-state coordination should have one owner.

Alternative: repeat that coordination in each page or generalize every Account editor into one module.

Trade-off: simple lists share a fixed layout and row lifecycle; custom layouts retain their own composition.

Source: [Simple Account lists](../src/ui/components/views/account/components/SimpleAccountListPage.js).

## Share numeric editing state across layouts

Decision: let one numeric editing module own drafts and write outcomes for standalone rows and inline fields.

Why: focus preservation, cancellation, and verified commits need the same rules across both layouts.

Alternative: maintain the editing lifecycle separately in each layout.

Trade-off: layouts retain formatting and controls, while custom writers must return a verified value or cancellation.
Completion callbacks run after the verified commit; their failure retains that value and reports an error.

Source: [Numeric editing](../src/ui/components/views/account/useNumericEditor.js).

## Give frontend Monitor subscriptions one owner

Decision: let the frontend Monitor module own subscription bookkeeping, path identity, and runtime lookup.

Why: Search actions and rendering should not coordinate transport identifiers or maintain a second subscription ledger.

Alternative: repeat that coordination in Search, its render modules, and the store.

Trade-off: Search retains saved snapshots and activation timing, while WebSocket connection replay stays with the transport.

Source: [Frontend Monitors](../src/ui/state/liveMonitor.js).

## Keep Search scan sessions outside rendering

Decision: let a scan session module own scan transitions, request construction, scope, and comparison baselines.

Why: consecutive scans should be testable without rendering the Search view. Editing displayed values must
not change the baseline used by the next comparison.

Alternative: keep scan coordination in the view alongside editing, filters, and saved results.

Trade-off: the view supplies reactive output state and presents feedback. Pagination, saved results,
and input controls remain view concerns.

Source: [Search scan sessions](../src/ui/components/views/search/scanSession.js).

## Give server Monitor lifecycle one owner

Decision: let a server Monitor module own subscriptions, shared game hooks, retries, history, and cleanup.
Keep socket messages and serialization in the WebSocket module.

Why: lifecycle races should be testable without constructing sockets or emulating CDP expressions.

Alternative: keep Monitor coordination inside the WebSocket module.

Trade-off: the Monitor module accepts GameBridge, state delivery, and a clock. The existing lifecycle
tests use controlled adapters without exercising socket transport.

Source: [Server Monitors](../src/modules/server/monitor.js).

## Share Royal Guard behavior outside views

Decision: keep Royal Guard unit rules and reset operations in a shared domain module.

Why: Armory and Outposts need the same behavior without importing each other's view implementation.

Alternative: keep shared behavior exported from the Outposts view.

Trade-off: the domain module still uses the existing account helpers and game API.

Source: [Royal Guard domain](../src/ui/components/views/account/masterclasses/royalGuardDomain.js).

## Decode game catalogs in focused helpers

Decision: share jar-gem catalog decoding between command execution, list output, and autocomplete.

Why: these callers need the same game-data layout and stable definition indices.

Alternative: repeat the parsing in each caller or combine unrelated catalogs into one module.

Trade-off: callers still own presentation and command-specific mutations.

Source: [Jar-gem catalog](../src/cheats/helpers/jarGems.js).

## Batch bulk-write verification reads

Decision: verify bulk writes with one separate batch read, using the existing typed comparison in the UI.

Why: verification requests should not grow with the number of successful writes.

Alternative: verify within the write evaluation or issue a separate read for every value.

Trade-off: verification still observes state after the write request. Batches remain non-atomic and report individual failures.

Source: [UI game API](../src/ui/services/api.js), [state accessors](../src/cheats/api/stateAccessors.js).

## Keep game-path policies explicit

Decision: keep Account value operations, Monitor property checks, and raw Search traversal in the shared path module.

Why: path interpretation and validation should have one owner while callers keep their distinct requirements.

Alternative: merge every traversal into one behavior or leave checks spread across callers.

Trade-off: raw Search paths remain explicit, value operations can address missing properties, and monitoring requires a watchable property. CLI inspection and cheat-state traversal retain their separate conventions.

Source: [Game paths](../src/cheats/utils/pathResolver.js).

## Keep configuration persistence with configuration loading

Decision: let the configuration module save UI overrides and update its loaded state after a successful write.

Why: default filtering, serialization, and disk persistence need one owner alongside configuration loading.

Alternative: keep save logic in the HTTP route.

Trade-off: the save operation requires loaded configuration. Routes retain request validation and HTTP responses.

Source: [Configuration manager](../src/modules/config/configManager.js).

## Keep Session update rules outside HTTP handlers

Decision: let the configuration module own Session update parsing, live-object merging, and game synchronization.
Keep request validation and HTTP responses in the route.

Why: game synchronization can fail after server state changes, so one module should own that partial success.

Alternative: keep mutation and game synchronization coordinated by the HTTP route.

Trade-off: live configuration references stay shared, and server changes survive failed game synchronization.
Saved configuration remains a separate disk operation.

Source: [Configuration manager](../src/modules/config/configManager.js).

## Share the game-helper transport

Decision: route server, CLI, and WebSocket helper calls through GameBridge.

Why: argument encoding, context binding, and protocol result decoding should have one owner.

Alternative: construct evaluation strings and decode CDP responses in every caller.

Trade-off: callers still choose helper operations and own user-facing errors. The bridge accepts a runtime dependency so isolated fixtures can replace the live connection.

Source: [GameBridge](../src/modules/game/gameBridge.js).

## Move command suggestions incrementally

Decision: allow command definitions to own suggestion providers, migrating command families incrementally.

Why: the command and its suggested parameters should use the same domain knowledge.

Alternative: keep every command's suggestion logic in the shared autocomplete builder or migrate all commands at once.

Trade-off: the shared builder retains ordering for migrated groups alongside legacy groups. Provider presence does not imply that the bare command should be hidden.

Source: [Command registration](../src/cheats/core/registration.js), [world commands](../src/cheats/cheats/worlds.js).

## Register HTTP routes by responsibility

Decision: let focused registration modules own game, cheat, search, configuration, and update routes. Keep one router and one game bridge per API setup.

Why: handlers should sit beside related validation and lifecycle state without sharing every dependency in one closure.

Alternative: keep one large registration function or add mounted sub-routers.

Trade-off: registration spans multiple modules. They retain the existing request contracts, shared configuration references, and update response timing; splitting routes does not reduce game round trips.

Source: [API setup](../src/modules/server/apiRoutes.js), [route modules](../src/modules/server/routes/).

## Keep update orchestration outside callers

Decision: let the updater module own cached checks and preparation coordination, using the existing
release checker and archive preparation modules.

Why: HTTP and CLI callers should not coordinate release checks with archive preparation themselves.

Alternative: keep cached checks and preparation coordination in the update route.

Trade-off: each updater owns its check cache. Startup and CLI checks use fresh instances; the HTTP
route retains its instance and controls the response-before-exit handoff.

Source: [Updater](../src/modules/updateService.js).
