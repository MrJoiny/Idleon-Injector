# Account pages playbook

Guide for building and maintaining Account feature tabs.

This document covers the refactored Account tab system in `src/ui/components/views/account/`. It is for new top-level Account tabs, world tabs, nested world panels, and world sub-tabs. It does not cover raw `OptionsListAccount` schema/editor changes.

## 1) Source of truth

Read these files before adding or changing an Account feature tab:

- `src/ui/components/views/Account.js`
  Top-level Account shell, `ACCOUNT_TABS`, and lazy top-level pane mounting.
- `src/ui/components/views/account/W1Tab.js` ... `W7Tab.js`
  World tab shells and sub-tab registries.
- `src/ui/components/views/account/tabShared.js`
  Shared tab navigation, lazy panes, persistent panes, and coming-soon placeholders.
- `src/ui/components/views/account/accountLoadPolicy.js`
  `useAccountLoad()` for standardized load state and load failure logging.
- `src/ui/components/views/account/accountShared.js`
  Shared value helpers, Haxe unwrapping, verified writes, bulk writes, stable state helpers, and write status.
- `src/ui/components/views/account/components/`
  Shared chrome, rows, sections, page shells, and collection helpers.

Current structure:

- Top-level Account tabs include Account Options, Upgrade Vault, and W1-W7.
- W1-W3 contain implemented feature tabs.
- W4-W7 currently use `createWorldComingSoonTab(...)`.
- W2 has a nested Alchemy panel: Brewing, Liquid, Vials, Pay 2 Win, Sigils.
- W3 has a nested Construction panel: Buildings, Cogs.

## 2) Shared contracts

### Page chrome

- Prefer `PersistentAccountListPage(...)` for most editable Account features.
- Use `AccountPageShell(...)` directly only when the wrapper needs behavior not exposed by `PersistentAccountListPage`.
- Use `AccountTabHeader`, `RefreshButton`, `WarningBanner`, `NoticeBanner`, `AccountSection`, and `AccountRow` before adding tab-local chrome.
- Keep tab-specific selectors out of shared CSS unless they define a reusable primitive.

### Loading

- Use `useAccountLoad({ label })` for account-page reads.
- Keep reads inline in the tab. The shared hook owns state transitions and logging.
- Call `load()` once when the component is constructed. Because Account panes lazy-mount, this loads the tab only when first opened.
- Use `Promise.all` for independent reads.
- Normalize indexed game payloads with `toIndexedArray(raw)` from `src/ui/utils/index.js`.
- Use `readLevelDefinitions(...)` when pairing a GGA levels array with a `cList` definition table.

### Writes

- Use `useWriteStatus()` for row-level and bulk write actions.
- Use `writeVerified(path, value)` when one GGA write must be confirmed.
- Use `writeManyVerified(writes)` for custom batches.
- Use `runBulkSet(...)` when many rows share a target-value and local-state update flow.
- Use shared row/action components so loading, success, and error states render consistently.
- Do not hand-roll status timers. `useWriteStatus()` owns the success/error clear timing.

### Feedback classes

- Current shared Account rows emit `account-row--success` and `account-row--error`.
- Action buttons use the shared button/status classes from `ActionButton`.
- Do not introduce old `feature-row--success`, `feature-row--error`, or tab-local feedback class contracts.

## 3) Pattern selection

Pick one rendering pattern per tab and stay consistent within that tab.

### Pattern A: Persistent list page

Use this for editable row tabs, dense lists, bulk actions, and any UI where input focus, row status, or scroll position needs to survive writes.

Typical examples:

- `w1/AnvilTab.js`
- `w2/VialTab.js`
- `UpgradeVaultTab.js`

Shape:

```js
export const MyFeatureTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "My Feature" });
    const listNode = div({ class: "account-list" });

    const load = async () =>
        run(async () => {
            // Read game data, normalize it, then update existing state.
        });

    load();

    return PersistentAccountListPage({
        title: "MY FEATURE",
        description: "Short operational description.",
        actions: RefreshButton({ onRefresh: load }),
        state: { loading, error },
        loadingText: "READING MY FEATURE",
        errorTitle: "MY FEATURE READ FAILED",
        initialWrapperClass: "account-list",
        body: listNode,
    });
};
```

### Pattern B: Simple rebuild body

Use when the tab is small, mostly read-only, and remounting content after load is acceptable.

Use `AccountPageShell` with `loadState` and `renderBody`, or pass a small reactive `body` to `PersistentAccountListPage` when the surrounding page should still use persistent Account chrome.

### Pattern C: Cached collection or card UI

Use when the data shape can change but existing rows or cards should survive writes and refreshes.

Typical techniques:

- `createIndexedStateGetter()` for sparse numeric/list index state.
- `getOrCreateState(map, key, initial)` for keyed row/card state.
- `createStaticRowReconciler(container)` when rows should rebuild only after a signature changes.
- Stable arrays of row/card nodes when refreshing values should not rebuild UI identity.

## 4) Shared UI primitives

Use these before creating new one-off helpers:

- `EditableNumberRow`
  Focus-safe numeric row. Keeps committed value state separate from draft input text.
- `ClampedLevelRow`
  Thin adapter for single-path level fields with min/max clamping.
- `BulkActionBar`, `SetAllNumberControl`, `SetAllSelectControl`
  Header action strip and set-all controls.
- `AddFromListSection`
  Add-from-dropdown collection section.
- `RemovableStoredRow`
  Removable collection row with row-local write status.
- `AccountRow`
  Non-numeric row shell with status-aware classes.
- `AccountSection`
  Standard grouped section header/body.

Do not extract tiny one-off helpers when the logic is only a couple of lines and used once. Inline the logic unless a helper materially improves reuse or readability.

## 5) Reactivity safety

The most common regression is remounting rows or cards after a value changes. That can lose focus or hide success/error feedback.

Rules:

- Keep VanJS reactive function scope as small as possible.
- Do not return arrays directly from reactive children; return one node or wrap multiple nodes in a container.
- Do not wrap an input in a reactive block that depends on that input's value.
- Do not read mutable `state.val` while constructing row or card components inside a reactive list renderer if that subscribes the parent renderer.
- Build persistent rows or cards once where possible, then update backing `van.state` values in place.
- For dynamic lists, rebuild only when the list shape changes, not when an individual row value changes.

Bad:

```js
const Row = ({ valueState }) => {
    const inputValue = van.state(String(valueState.val ?? 0));
    return input({ value: inputValue });
};
```

Good:

```js
const Row = ({ valueState }) => {
    const inputValue = van.state("0");

    van.derive(() => {
        inputValue.val = String(valueState.val ?? 0);
    });

    return input({ value: inputValue });
};
```

Prefer `EditableNumberRow` when this pattern fits; it already handles draft text and focus-safe syncing.

## 6) Wiring new tabs

### Add a feature tab under an existing world

1. Create `src/ui/components/views/account/wN/MyFeatureTab.js`.
2. Import it in `src/ui/components/views/account/WNTab.js`.
3. Add a `WN_SUBTABS` entry with a stable kebab-case `id`, uppercase `label`, and `component`.
4. If the world has a nested panel, add the tab to that nested registry instead of the outer world registry.
5. Add feature CSS at `src/ui/styles/tabs/wN/_my-feature.css` if needed.
6. Import that CSS from `src/ui/styles/tabs/wN/_index.css`.

### Add a nested panel tab

1. Find the nested registry, such as `ALCHEMY_SUBTABS` in `W2Tab.js` or `CONSTRUCTION_SUBTABS` in `W3Tab.js`.
2. Add the new tab to that nested array.
3. Reuse the existing `renderTabNav(...)` and `renderLazyPanes(...)` panel structure.
4. Keep panel-specific CSS near the world's existing tab CSS.

### Add a top-level Account tab

1. Create `src/ui/components/views/account/MyTopLevelTab.js`.
2. Import it in `src/ui/components/views/Account.js`.
3. Add an `ACCOUNT_TABS` entry with `isWorld: false`.
4. Add styles only if the shared Account primitives are insufficient.

### Add a new world tab

1. Create `src/ui/components/views/account/WNTab.js`.
2. Register it in `src/ui/components/views/Account.js` with `isWorld: true` and `worldNum`.
3. Add world-specific styles and imports.
4. If the world is not implemented yet, prefer `createWorldComingSoonTab(...)`.

### Placeholder behavior

- For unimplemented sub-tabs, use `component: null` and `createComingSoonPlaceholder(...)`.
- Do not attach write behavior or load behavior to placeholders.

## 7) CSS rules

- Shared Account primitives live in `src/ui/styles/_account-pages.css`.
- Top account/world navigation lives in `src/ui/styles/_world-tabs.css`.
- Feature-specific CSS belongs in `src/ui/styles/tabs/wN/_feature-name.css`.
- Import feature CSS from the matching `src/ui/styles/tabs/wN/_index.css`.
- Use existing classes first: `tab-container`, `scroll-container`, `account-list`, `account-row`, `account-section`, `account-header__actions`, `account-setall-row`, `warning-banner`, `tab-add-row`.
- Keep dimensions stable for row controls, cards, grids, status labels, and action buttons so writes do not shift layout.

## 8) Validation checklist

Run the full validation when code changes:

```powershell
npm run validate
```

If the change is narrow and full validation is too expensive, run the tightest checks that cover changed files:

```powershell
node --check src/ui/components/views/account/wN/MyFeatureTab.js
npx eslint src/ui/components/views/account/ src/ui/styles/
```

Manual checks:

- The tab appears at the correct nav level.
- Lazy mounting loads the tab only when first opened.
- Initial loading and initial failure states use the shared page chrome.
- Refresh reloads data without destroying stable rows unnecessarily.
- Write actions show loading, success, and error feedback on the correct row/action.
- Changed and unchanged verified writes both show success feedback.
- Inputs keep focus while typing and do not reset on each keystroke.
- Bulk actions use `useWriteStatus()` and verified writes.
- Placeholder tabs remain passive.
- CSS is imported and scoped to the feature/world.

## 9) Anti-patterns

- Importing or referencing removed `featureShared.js` helpers.
- Manual load-state boilerplate when `useAccountLoad()` fits.
- Manual status timers instead of `useWriteStatus()`.
- Rebuilding rows/cards on every value write.
- Constructor-time reads of mutable `*.val` in row/card builders when they cause parent remounts.
- Returning arrays from reactive VanJS children.
- Putting feature-specific selectors in shared Account CSS.
- Adding a new helper for logic that is short, local, and used once.
