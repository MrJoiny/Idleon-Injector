# Account Pages Playbook

Decision-ready guide for building and maintaining Account tabs.

This document is Account-specific and reflects the current standardized behavior in the repo.

## 1) Architecture (Source of Truth)

Use these files as the primary references before adding or changing a tab:

- `src/ui/components/views/Account.js`
  Top-level Account tab shell and lazy pane mounting.
- `src/ui/components/views/account/featureShared.js`
  Shared write/load hooks and async body helpers.
- `src/ui/components/views/account/tabShared.js`
  Shared world/sub-tab navigation and lazy-pane helpers.

### Current world structure

- Top-level Account tabs include Account Options, Upgrade Vault, and world tabs.
- World tabs are split by world files (`W1Tab.js`, `W2Tab.js`, `W3Tab.js`, `W5Tab.js`, etc.).
- Some worlds include nested sub-nav panels:
    - W2: Alchemy panel (`Brewing`, `Liquid`, `Vials`, `Pay2Win`, `Sigils`)
    - W3: Construction panel (`Buildings`, `Cogs`)
    - W5: Sailing panel (`Artifacts`, `Islands`, placeholders)

## 2) Standards (Non-Negotiable)

### Feedback contract

- Success class in markup: `feature-row--success`
- Error class in markup: `feature-row--error`
- Do not emit legacy feedback classes from new Account pages.

### Write-status contract

- Use `useWriteStatus()` for all write actions (row-level and bulk).
- Default clear timing is canonical: success/error auto-clear at `1200ms`.
- Prefer hook-managed status lifecycle over manual `setTimeout` status resets.

### Shared helper contract

- Normalize array-like payloads with `toIndexedArray(raw)` from `src/ui/utils/index.js`.
- Use `usePersistentPaneReady()` + `RefreshErrorBanner({ error })` for persistent panes.
- Use `AsyncFeatureBody(...)` for re-render-on-load tabs.

### Behavior boundary

- Keep existing write verification semantics for the target tab.
- This playbook standardizes UI/state patterns and feedback semantics, not game logic redesign.

## 3) Pattern Selection

Pick one rendering pattern per tab and stay consistent within that tab.

### Pattern A: Persistent pane (dense row editors)

Use when row identity, input focus, and scroll stability matter.

Typical fit:

- Many editable rows
- Frequent writes
- Data refreshed in place without tearing down DOM

### Pattern B: AsyncFeatureBody (simple full-body rendering)

Use when full body re-render is cheap and state density is low.

Typical fit:

- Smaller lists
- Mostly read + occasional writes
- Simpler loading/error/empty flow

### Pattern C: Cached card/grid (modern card-heavy tabs)

Use for grid/card UIs where cards should remain stable across refresh/write updates.

Typical fit:

- Card grids (`tier-card`, artifact/island-like views)
- Per-card writes + optional set-all controls
- Cached card elements with reactive state updates

## 4) Reactivity Safety (Required)

The most common flash regression is accidental remounting of rows/cards after a value change.

### Core rule

Do not read mutable `*.val` while constructing row/card components inside reactive list renderers.

Why:

- Constructor-time reads can subscribe parent render closures to row values.
- On changed writes (`2 -> 3`), parent re-renders/remounts the row/card.
- Row-local `useWriteStatus()` state is replaced, so success/error flash disappears.

### Bad

```js
const MyRow = ({ levelState }) => {
    const inputVal = van.state(String(levelState.val ?? 0)); // constructor-time read of mutable state
    const { status } = useWriteStatus();
    // ...
};
```

### Good

```js
const MyRow = ({ levelState }) => {
    const inputVal = van.state("0"); // neutral seed
    const { status } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(levelState.val ?? 0); // sync after construction
    });
    // ...
};
```

### Stability rules

- Build persistent rows/cards once where possible and update backing `van.state` values in place.
- For cached grids, keep a stable card array and only replace children from cached nodes.
- Avoid mapping fresh component instances from reactive closures unless the shape truly changed.

## 5) Templates

## Pattern A Template: Persistent Pane

```js
import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { RefreshErrorBanner, usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button } = van.tags;

const Row = ({ valueState, index }) => {
    const inputVal = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(valueState.val ?? 0);
    });

    const doSet = async () => {
        const next = Math.max(0, Math.round(Number(inputVal.val)));
        if (!Number.isFinite(next)) return;
        await run(async () => {
            const path = `SomePath[${index}]`;
            await writeGga(path, next);
            const verified = Math.max(0, Math.round(Number(await readGga(path))));
            if (verified !== next) throw new Error(`Write mismatch at ${path}: expected ${next}, got ${verified}`);
            valueState.val = verified;
        });
    };

    return div(
        {
            class: () =>
                `feature-row ${status.val === "success" ? "feature-row--success" : ""} ${
                    status.val === "error" ? "feature-row--error" : ""
                }`,
        },
        button(
            {
                class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                onclick: doSet,
            },
            "SET"
        )
    );
};

export const MyTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();
    const rows = Array.from({ length: 10 }, () => van.state(0));

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        try {
            const arr = toIndexedArray(await readGga("SomePath"));
            rows.forEach((st, i) => {
                st.val = Number(arr[i] ?? 0);
            });
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

    return div(
        { class: "tab-container" },
        button({ class: "btn-secondary", onclick: load }, "REFRESH"),
        RefreshErrorBanner({ error: refreshError }),
        () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),
        () =>
            !loading.val && error.val && !initialized.val
                ? EmptyState({ title: "LOAD FAILED", subtitle: error.val })
                : null,
        div({ class: () => paneClass("feature-list") }, ...rows.map((st, i) => Row({ valueState: st, index: i })))
    );
};
```

## Pattern B Template: AsyncFeatureBody

```js
import van from "../../../../vendor/van-1.6.0.js";
import { readGga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { AsyncFeatureBody } from "../featureShared.js";

const { div, button } = van.tags;

export const MyTab = () => {
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
        renderContent: () => div({ class: "feature-list" }, "content"),
    });

    return div({ class: "tab-container" }, button({ class: "btn-secondary", onclick: load }, "REFRESH"), renderBody);
};
```

## Pattern C Template: Cached Card/Grid

```js
import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { RefreshErrorBanner, usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button } = van.tags;

const Card = ({ index, valueState, nameState }) => {
    const inputVal = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(valueState.val ?? 0);
    });

    const doSet = async () => {
        const next = Math.max(0, Math.round(Number(inputVal.val)));
        if (!Number.isFinite(next)) return;
        await run(async () => {
            const path = `SomeGridPath[${index}]`;
            await writeGga(path, next);
            const verified = Math.max(0, Math.round(Number(await readGga(path))));
            if (verified !== next) throw new Error(`Write mismatch at ${path}: expected ${next}, got ${verified}`);
            valueState.val = verified;
        });
    };

    return div(
        {
            class: () =>
                [
                    "tier-card",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        nameState,
        button(
            {
                class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                onclick: doSet,
            },
            "SET"
        )
    );
};

export const MyGridTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    const count = van.state(0);
    const names = [];
    const values = [];
    const cards = [];

    const ensureCount = (n) => {
        while (cards.length < n) {
            const i = cards.length;
            names.push(van.state(`Item ${i}`));
            values.push(van.state(0));
            cards.push(Card({ index: i, valueState: values[i], nameState: names[i] }));
        }
    };

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        try {
            const arr = toIndexedArray(await readGga("SomeGridPath"));
            count.val = arr.length;
            ensureCount(count.val);
            for (let i = 0; i < count.val; i++) {
                values[i].val = Number(arr[i] ?? 0);
            }
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

    const grid = div({ class: "tier-grid" });
    van.derive(() => {
        grid.replaceChildren();
        if (count.val <= 0) {
            van.add(grid, div({}, "No entries"));
            return;
        }
        van.add(grid, ...cards.slice(0, count.val));
    });

    return div(
        { class: "tab-container" },
        button({ class: "btn-secondary", onclick: load }, "REFRESH"),
        RefreshErrorBanner({ error: refreshError }),
        () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),
        () =>
            !loading.val && error.val && !initialized.val
                ? EmptyState({ title: "LOAD FAILED", subtitle: error.val })
                : null,
        div({ class: () => paneClass("tier-scroll scrollable-panel") }, grid)
    );
};
```

## 6) Wiring New Tabs

### Add a new feature tab under an existing world

1. Create the component at `src/ui/components/views/account/wN/MyFeatureTab.js`.
2. Register it in the world sub-tab list (`W1Tab.js`, `W2Tab.js`, `W3Tab.js`, `W5Tab.js`).
3. If the world uses a nested panel (Alchemy/Construction/Sailing), add it to that nested array and pane renderer.
4. Add tab CSS at `src/ui/styles/tabs/wN/_myfeature.css`.
5. Import that CSS in `src/ui/styles/tabs/wN/_index.css`.

### Add a new world tab

1. Create `src/ui/components/views/account/WNTab.js`.
2. Register it in `src/ui/components/views/Account.js` top-level `ACCOUNT_TABS`.
3. Add world tab styles and world tab-specific style imports.

### Placeholder behavior

- For not-yet-implemented sub-tabs, set `component: null` and rely on `createComingSoonPlaceholder(...)`.
- Do not attach write-status behavior to placeholders.

## 7) Anti-Patterns

- Manual status state/timers instead of `useWriteStatus()`.
- Emitting legacy flash classes in new markup.
- Constructor-time reads of mutable `*.val` in row/card builders.
- Full row/card teardown on every write in persistent/cached tabs.
- Tab-specific selectors added to shared CSS when they belong in tab CSS.

## 8) Validation Checklist

- Tab appears in correct world/nav and lazy mounts correctly.
- Initial load:
    - loader visible before first success
    - visible error state on first-load failure
- Post-initial refresh failure keeps stale data visible and shows `RefreshErrorBanner`.
- For each write action:
    - loading class appears while writing
    - success path emits `feature-row--success` on the action host container
    - error path emits `feature-row--error` on the action host container
- Flash behavior checks:
    - changed value (`2 -> 3`) shows success feedback
    - unchanged value (`3 -> 3`) still shows success feedback
    - no remount-induced status loss
- Bulk actions use `useWriteStatus()` and same canonical feedback classes.
- Placeholder tabs remain unchanged and do not gain write semantics.
