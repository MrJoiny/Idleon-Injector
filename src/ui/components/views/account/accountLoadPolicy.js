/**
 * Shared account-page load helpers.
 *
 * V1 scope is intentionally narrow:
 * - reads stay inline in each page
 * - any failed read fails the load
 * - this module only standardizes load-state transitions and page-level logging
 */

const getErrorMessage = (error, fallback = "Load failed") => {
    if (error && typeof error === "object" && typeof error.message === "string" && error.message.trim()) {
        return error.message;
    }
    if (typeof error === "string" && error.trim()) return error;
    return fallback;
};

const logLoadFailure = (label, phase, error) => {
    console.error(`[account-load] ${label} ${phase} failed:`, error);
};

const getFallbackMessage = (label, fallbackMessage) => {
    if (fallbackMessage) return fallbackMessage;
    return `Failed to load ${String(label ?? "account page").trim().toLowerCase()} data`;
};

/**
 * Standard load handler for account pages that only use `loading` and `error`.
 *
 * @param {{
 *   loading: import('../../../vendor/van-1.6.0.js').State<boolean>,
 *   error: import('../../../vendor/van-1.6.0.js').State<string|null>,
 *   label?: string,
 *   fallbackMessage?: string,
 * }} states
 * @param {() => Promise<any>} task
 * @returns {Promise<any|undefined>}
 */
export const runAccountLoad = async ({ loading, error, label = "Account page", fallbackMessage }, task) => {
    loading.val = true;
    error.val = null;

    try {
        return await task();
    } catch (caughtError) {
        logLoadFailure(label, "load", caughtError);
        error.val = getErrorMessage(caughtError, getFallbackMessage(label, fallbackMessage));
        return undefined;
    } finally {
        loading.val = false;
    }
};

/**
 * Standard load handler for persistent-pane account pages.
 * The shell owns first-success visibility state; tabs only manage loading/error.
 *
 * @param {{
 *   loading: import('../../../vendor/van-1.6.0.js').State<boolean>,
 *   error: import('../../../vendor/van-1.6.0.js').State<string|null>,
 *   label?: string,
 *   fallbackMessage?: string,
 * }} states
 * @param {() => Promise<any>} task
 * @returns {Promise<any|undefined>}
 */
export const runPersistentAccountLoad = async (
    { loading, error, label = "Account page", fallbackMessage },
    task
) => {
    loading.val = true;
    error.val = null;
    try {
        return await task();
    } catch (caughtError) {
        logLoadFailure(label, "load", caughtError);

        error.val = getErrorMessage(caughtError, getFallbackMessage(label, fallbackMessage));
        return undefined;
    } finally {
        loading.val = false;
    }
};
