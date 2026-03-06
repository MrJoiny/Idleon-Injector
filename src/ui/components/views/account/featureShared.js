/**
 * Shared hooks and components for account feature tabs.
 *
 * Pattern guide — choose one per tab:
 *
 *  A) Persistent-pane tabs (Anvil, Forge, Liquid, P2W, PostOffice, Sigil):
 *       The full DOM is built once before the first load. Reactive van.state
 *       objects update individual cells in-place, so refresh never causes a
 *       scroll-position jump or a full list rebuild.
 *       → use usePersistentPaneReady  +  useWriteStatus
 *
 *  B) Re-render-on-load tabs (Vials, AtomCollider, SaltLick):
 *       The list is cheap to rebuild and doesn't use persistent row state.
 *       → use AsyncFeatureBody  +  useWriteStatus
 */

import van from "../../../vendor/van-1.6.0.js";
import { Icons } from "../../../assets/icons.js";

const { div } = van.tags;

// ── Internal helper ────────────────────────────────────────────────────────

/** @private Unwrap a plain value, van.state, or zero-arg function. */
const resolveValue = (valueOrState) => {
    if (typeof valueOrState === "function") return valueOrState();
    if (valueOrState && typeof valueOrState === "object" && "val" in valueOrState) return valueOrState.val;
    return valueOrState;
};

export const RefreshErrorBanner = ({ error }) => () =>
    error?.val
        ? div(
              { class: "warning-banner" },
              Icons.Warning(),
              " Refresh failed. Showing last loaded values. ",
              error.val
          )
        : null;

// ── usePersistentPaneReady ─────────────────────────────────────────────────

/**
 * Hook for tabs that pre-build their DOM once and update reactive states
 * in-place (Pattern A above). The pane stays in the DOM at all times —
 * it is only hidden via CSS class until the first successful load.
 *
 * Usage:
 *   const { initialized, markReady, paneClass } = usePersistentPaneReady();
 *
 *   // Inside load():
 *   markReady();   // call once, after the first successful data fetch
 *
 *   // On the persistent wrapper div:
 *   div({ class: () => paneClass("my-base-class") }, ...rows)
 *
 * @returns {{
 *   initialized: import('../../../vendor/van-1.6.0.js').State<boolean>,
 *   markReady: () => void,
 *   paneClass: (baseClass: string, hiddenClass?: string) => string,
 * }}
 */
export const usePersistentPaneReady = () => {
    const initialized = van.state(false);

    return {
        initialized,
        markReady: () => {
            initialized.val = true;
        },
        paneClass: (baseClass, hiddenClass = "is-hidden-until-ready") =>
            `${baseClass}${initialized.val ? "" : ` ${hiddenClass}`}`,
    };
};

// ── useWriteStatus ─────────────────────────────────────────────────────────

/**
 * Hook that wraps an async write operation with loading / success / error
 * status tracking and automatic status-clear timers.
 *
 * Usage:
 *   const { status, run } = useWriteStatus();            // default 1 200 ms clear
 *   const { status, run } = useWriteStatus({ successMs: 1500, errorMs: 1500 });
 *
 *   await run(async () => {
 *       await writeGga("SomeKey", value);
 *       localState.val = value;
 *   });
 *
 *   // status.val is one of: null | "loading" | "success" | "error"
 *   // Bind it to CSS classes or button labels as needed.
 *
 * run() accepts an optional second argument to override per-call:
 *   await run(task, { successMs: 1000 });   // shorter clear on this call only
 *   await run(task, { loadingState: "saving", successState: "saved" });
 *   await run(task, { onSuccess: (result) => ..., onError: (err) => ... });
 *
 * @param {{ successMs?: number, errorMs?: number }} [opts]
 * @returns {{
 *   status: import('../../../vendor/van-1.6.0.js').State<string|null>,
 *   run: (task: () => Promise<any>, opts?: object) => Promise<{ok: boolean}>,
 *   clearStatus: () => void,
 * }}
 */
export const useWriteStatus = ({ successMs = 1200, errorMs = 1200 } = {}) => {
    const status = van.state(null);
    let clearTimer = null;

    const clearStatus = () => {
        if (clearTimer) {
            clearTimeout(clearTimer);
            clearTimer = null;
        }
        status.val = null;
    };

    const scheduleClear = (ms) => {
        if (clearTimer) clearTimeout(clearTimer);
        clearTimer = setTimeout(() => {
            status.val = null;
            clearTimer = null;
        }, ms);
    };

    const run = async (
        task,
        {
            loadingState = "loading",
            successState = "success",
            errorState = "error",
            onSuccess = null,
            onError = null,
        } = {}
    ) => {
        if (clearTimer) {
            clearTimeout(clearTimer);
            clearTimer = null;
        }

        status.val = loadingState;

        try {
            const result = await task();
            status.val = successState;
            if (typeof onSuccess === "function") onSuccess(result);
            if (successMs > 0) scheduleClear(successMs);
            return { ok: true, result };
        } catch (error) {
            status.val = errorState;
            if (typeof onError === "function") onError(error);
            if (errorMs > 0) scheduleClear(errorMs);
            return { ok: false, error };
        }
    };

    return { status, run, clearStatus };
};

// ── AsyncFeatureBody ───────────────────────────────────────────────────────

/**
 * Declarative async-state renderer for tabs that re-render their full list
 * on every load (Pattern B above). Returns a reactive function node — pass it
 * directly as a child of the tab's root div.
 *
 * Usage:
 *   const renderBody = AsyncFeatureBody({
 *       loading,
 *       error,
 *       data: myDefs,                             // van.state or plain value
 *       renderLoading: () => div(...),            // shown while loading
 *       renderError:   (msg) => EmptyState(...),  // shown on initial load failure
 *       isEmpty:       (d) => d.length === 0,     // optional empty-check
 *       renderEmpty:   () => EmptyState(...),     // shown when isEmpty is true
 *       renderContent: (d) => div(...d.map(...)), // shown on success
 *   });
 *
 *   return div({ class: "tab-container" }, header, renderBody);
 *
 * @param {{
 *   loading: import('../../../vendor/van-1.6.0.js').State<boolean>,
 *   error:   import('../../../vendor/van-1.6.0.js').State<string|null>,
 *   data?:   any,
 *   renderLoading?: () => Element | null,
 *   renderError?:   (message: string) => Element | null,
 *   isEmpty?:       (data: any) => boolean,
 *   renderEmpty?:   (data: any) => Element | null,
 *   renderContent:  (data: any) => Element | null,
 * }} props
 */
export const AsyncFeatureBody = ({
    loading,
    error,
    data = null,
    renderLoading = null,
    renderError = null,
    isEmpty = null,
    renderEmpty = null,
    renderContent,
}) => () => {
    if (loading?.val) return renderLoading ? renderLoading() : null;
    if (error?.val) return renderError ? renderError(error.val) : null;

    const resolvedData = resolveValue(data);
    if (resolvedData === null || resolvedData === undefined) return null;

    if (typeof isEmpty === "function" && isEmpty(resolvedData)) {
        return renderEmpty ? renderEmpty(resolvedData) : null;
    }

    return renderContent ? renderContent(resolvedData) : null;
};
