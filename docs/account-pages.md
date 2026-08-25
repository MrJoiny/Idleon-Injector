# Account Pages Patterns

Design rules for Account feature tabs (`src/ui/components/views/account/`).
Wiring steps are discoverable from the registries themselves; this doc covers
which patterns to use and why.

## Layout

- `Account.js` owns the top-level tabs (`ACCOUNT_TABS`) and lazy panes.
- Each world has a `WNTab.js` with its sub-tab registry (`WN_SUBTABS`); nested
  panels (Alchemy in W2, Construction in W3) have their own nested registries.
- Unimplemented entries use coming-soon placeholders - no load or write
  behavior on them.

Adding a tab: create the component, add one registry entry at the right level.
Feature CSS lives in `src/ui/styles/tabs/wN/`, imported by that folder's
`_index.css`; shared account styles stay in `_account-pages.css`.

## Shared contracts

- Prefer `PersistentAccountListPage(...)`; use `AccountPageShell(...)` directly
  only when the wrapper cannot express behavior you need.
- Use shared chrome (`AccountTabHeader`, `RefreshButton`, warning/notice
  banners, `AccountSection`, `AccountRow`) before adding tab-local chrome.
- Reads go through `useAccountLoad({ label })`, called once on construction -
  panes lazy-mount, so this loads on first open. Normalize indexed game payloads
  with `toIndexedArray(raw)`; pair GGA levels arrays with definition tables via
  `readLevelDefinitions(...)`.
- Writes go through `useWriteStatus()` plus `writeVerified(path, value)`,
  `writeManyVerified(writes)`, or `runBulkSet(...)` when rows share one flow. Do
  not hand-roll status timers - the hook owns success/error clear timing.
- Use shared primitives (`EditableNumberRow`, `ClampedLevelRow`,
  `BulkActionBar`, set-all controls, `AddFromListSection`,
  `RemovableStoredRow`) before creating one-offs.

## Pattern selection

Pick one rendering pattern per tab and stay consistent within it:

**A. Persistent list page** - editable rows, bulk actions, anything where input
focus, row status, or scroll position must survive writes. Most feature tabs:
build rows once into a stable container, then update backing `van.state` values
in place.

**B. Simple rebuild body** - small, mostly read-only tabs where remounting
content after load is acceptable.

**C. Cached collection/cards** - the data shape can change but existing
rows/cards should survive writes and refreshes: keyed state maps
(`getOrCreateState`), sparse index getters (`createIndexedStateGetter`), and
`createStaticRowReconciler` keyed off a signature.

## Reactivity safety

The most common regression is remounting rows or cards after a value changes,
which loses focus and hides success/error feedback.

Rules:

- Keep VanJS reactive scopes minimal; do not wrap whole containers.
- Never return arrays from reactive children - return one node or wrap multiple
  nodes in a container.
- Never wrap an input inside a reactive block that depends on that input's
  value.
- Build persistent rows/cards once, then update backing `van.state` values in
  place. Rebuild lists only when the shape changes, not when an individual row
  value changes.
- Do not read mutable `.val` while constructing row components inside a
  reactive list renderer if that would subscribe the parent renderer.

Bad (input recreated on every parent re-render):

```js
const Row = ({ valueState }) => {
    const inputValue = van.state(String(valueState.val ?? 0));
    return input({ value: inputValue });
};
```

Good (state synced via derive):

```js
const Row = ({ valueState }) => {
    const inputValue = van.state("0");

    van.derive(() => {
        inputValue.val = String(valueState.val ?? 0);
    });

    return input({ value: inputValue });
};
```

`EditableNumberRow` already implements the safe pattern - prefer it.

## Anti-patterns

- Manual load-state boilerplate when `useAccountLoad()` fits.
- Manual status timers instead of `useWriteStatus()`.
- Rebuilding rows/cards on every value write.
- Returning arrays from reactive children.
- Reading mutable `.val` at construction time inside reactive renderers.
- Feature-specific selectors in shared Account CSS.
- New helpers for logic that is short, local, and used once - inline it.
