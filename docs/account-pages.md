# Account Pages - Adding and Maintaining Tabs

This is the onboarding doc for account feature tabs.

## Quick Reference

| Need | Helper | File |
|---|---|---|
| Row/button write status (`loading/success/error`) | `useWriteStatus()` | `src/ui/components/views/account/featureShared.js` |
| Persistent pane hidden until first successful load | `usePersistentPaneReady()` | `src/ui/components/views/account/featureShared.js` |
| Shared refresh-failure stale-data banner | `RefreshErrorBanner({ error })` | `src/ui/components/views/account/featureShared.js` |
| Declarative async load rendering | `AsyncFeatureBody(...)` | `src/ui/components/views/account/featureShared.js` |
| Normalize array-like game payloads | `toIndexedArray(raw)` | `src/ui/utils/index.js` |
| Shared tab nav + lazy mount | `renderTabNav` + `renderLazyPanes` | `src/ui/components/views/account/tabShared.js` |

## Pattern Choice

Choose one rendering pattern per tab.

1. Pattern A: Persistent pane (DOM built once, in-place state updates)
Use for dense/interactive tabs where row inputs and scroll position should stay stable.
Current examples: `Anvil`, `Forge`, `Liquid`, `Pay2Win`, `PostOffice`, `Sigil`, `Arcade`.

2. Pattern B: AsyncFeatureBody (content chosen by async state)
Use when list/body re-rendering is cheap and simpler.
Current examples: `Vial`, `AtomCollider`, `SaltLick`, `Brewing`, `Killroy`.

## Add a New World Sub-Tab

1. Create `src/ui/components/views/account/wN/MyFeatureTab.js`.
2. Register in world sub-tab array (`W1Tab.js`, `W2Tab.js`, or `W3Tab.js`).
3. Pick Pattern A or Pattern B and follow the matching skeleton below.
4. Add tab CSS in `src/ui/styles/tabs/wN/_myfeature.css`.
5. Import that file from `src/ui/styles/tabs/wN/_index.css`.
6. Smoke test with the checklist at the bottom.

## Pattern A Skeleton (Persistent Pane)

```js
import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { toIndexedArray } from "../../../../utils/index.js";
import {
  RefreshErrorBanner,
  usePersistentPaneReady,
  useWriteStatus,
} from "../featureShared.js";

const { div, button } = van.tags;

export const MyFeatureTab = () => {
  const loading = van.state(true);
  const error = van.state(null);
  const refreshError = van.state(null);
  const { initialized, markReady, paneClass } = usePersistentPaneReady();

  const rowStates = Array.from({ length: 10 }, () => van.state(0));

  const load = async () => {
    loading.val = true;
    error.val = null;
    refreshError.val = null;
    try {
      const arr = toIndexedArray(await readGga("SomePath"));
      rowStates.forEach((st, i) => { st.val = Number(arr[i] ?? 0); });
      markReady();
    } catch (e) {
      const message = e?.message ?? "Failed to load";
      if (!initialized.val) error.val = message;
      else refreshError.val = message;
    } finally {
      loading.val = false;
    }
  };

  load();

  const renderRefreshErrorBanner = RefreshErrorBanner({ error: refreshError });

  const rowList = div(
    { class: () => paneClass("feature-list") },
    // Build once, bind row states
  );

  return div(
    { class: "tab-container" },
    button({ class: "btn-secondary", onclick: load }, "REFRESH"),
    renderRefreshErrorBanner,
    () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),
    () => (!loading.val && error.val && !initialized.val
      ? EmptyState({ title: "LOAD FAILED", subtitle: error.val })
      : null),
    rowList,
  );
};
```

## Pattern B Skeleton (AsyncFeatureBody)

```js
import van from "../../../../vendor/van-1.6.0.js";
import { readGga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { AsyncFeatureBody } from "../featureShared.js";

const { div, button } = van.tags;

export const MyFeatureTab = () => {
  const loading = van.state(true);
  const error = van.state(null);
  const data = van.state(null);

  const load = async () => {
    loading.val = true;
    error.val = null;
    try {
      const raw = await readGga("SomePath");
      data.val = { items: raw ?? [] };
    } catch (e) {
      error.val = e?.message ?? "Failed to load";
    } finally {
      loading.val = false;
    }
  };

  load();

  const renderBody = AsyncFeatureBody({
    loading,
    error,
    data,
    renderLoading: () => div({ class: "feature-loader" }, Loader()),
    renderError: (message) => EmptyState({ title: "LOAD FAILED", subtitle: message }),
    isEmpty: (resolved) => !resolved.items.length,
    renderEmpty: () => EmptyState({ title: "NO DATA", subtitle: "No entries found." }),
    renderContent: (resolved) => div({ class: "feature-list" }, /* map rows */),
  });

  return div(
    { class: "tab-container" },
    button({ class: "btn-secondary", onclick: load }, "REFRESH"),
    renderBody,
  );
};
```

## Bulk Action Rules

Use `useWriteStatus()` for bulk actions too, not only row-level writes.

1. Create one status runner per bulk action (or per bulk group).
2. Wrap write loops in `await run(async () => { ... })`.
3. Prefer hook timers (`successMs`, `errorMs`) over manual `setTimeout(() => status.val = null)`.
4. If writes are fragile/racy, run sequentially with tiny delays and explain why in a comment.

## World Wiring Reference

1. Account top-level tabs: `src/ui/components/views/account/Account.js`.
2. W1 sub-tabs: `src/ui/components/views/account/W1Tab.js`.
3. W2 sub-tabs: `src/ui/components/views/account/W2Tab.js`.
4. W3 sub-tabs: `src/ui/components/views/account/W3Tab.js`.
5. Shared nav/pane helpers: `src/ui/components/views/account/tabShared.js`.

## CSS Ownership

1. `src/ui/styles/_world-tabs.css`
Top-level shell, world nav, pane chrome.

2. `src/ui/styles/_feature-pages.css`
Shared feature contracts (`feature-*`, `warning-banner`, `is-hidden-until-ready`, `scrollable-panel`).

3. `src/ui/styles/tabs/wN/_myfeature.css`
Tab-specific visuals only.

## Anti-Patterns

1. Do not reintroduce local `toArr` helpers; use `toIndexedArray`.
2. Do not reintroduce manual write-status boilerplate (`status.val = ...` + timer resets).
3. Do not add tab-specific hidden classes for initial load; use `usePersistentPaneReady`.
4. Do not put tab-specific selectors in shared CSS files.
5. Do not force full list teardown on each row write in Pattern A tabs.

## Validation Checklist

- Tab appears in correct world nav.
- Initial load shows loader and then content.
- Initial load failure shows a visible error state.
- After first success, refresh failure keeps old content visible and shows warning banner.
- Row set actions show loading and success/error feedback.
- Bulk actions show loading and success/error feedback.
- Scroll position remains stable for Pattern A tabs.
- CSS for the new tab is imported from its world `_index.css`.
