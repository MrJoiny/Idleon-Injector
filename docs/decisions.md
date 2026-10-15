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
