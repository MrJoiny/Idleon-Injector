# Atlas UI Compatibility Refactor

## Objective

Keep the Atlas visual migration while restoring user-facing behavior that the
previous UI already guaranteed. Remove only compatibility wrappers that no
longer own behavior.

## Stable contracts

1. Every `store.notify()` call produces immediate toast feedback and remains in
   Activity history.
2. Search key favorites use curated defaults until the user saves a preference;
   custom and deliberately empty favorite lists persist in `localStorage`.
3. Search initially selects persisted keys, then available favorites, then the
   first eight available keys.
4. Cheat table rows can be selected with pointer or keyboard without changing
   execution semantics.
5. Controls that cannot act are disabled or removed rather than presented as
   inert buttons.
6. Atlas remains the sole implementation of the Cheats workspace; compatibility
   forwarding modules and the replaced notification dropdown are not retained.

## Boundaries

- Preserve the current VanJS architecture, API routes, workspace IDs, storage
  keys, command execution behavior, and config draft model.
- Reuse the existing Toast and Activity drawer instead of adding another
  notification abstraction.
- Keep `src/ui/vendor/vanHelpers.js` outside this change because it was excluded
  from the Atlas product commit and is not imported by the application.

## Verification

`npm run test:ui-compat` is the backward-compatibility harness. It exercises the
pure Search persistence helpers and verifies the source-level integration
contracts for Toast mounting, keyboard-selectable cheat rows, actionable header
controls, and removal of dead wrappers. The normal `npm run validate` command
also runs this harness.
