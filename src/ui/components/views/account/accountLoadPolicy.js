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
        error.val = getErrorMessage(caughtError, fallbackMessage);
        return undefined;
    } finally {
        loading.val = false;
    }
};

/**
 * Standard load handler for persistent-pane account pages that distinguish
 * initial-load failures from refresh failures.
 *
 * @param {{
 *   loading: import('../../../vendor/van-1.6.0.js').State<boolean>,
 *   error: import('../../../vendor/van-1.6.0.js').State<string|null>,
 *   refreshError: import('../../../vendor/van-1.6.0.js').State<string|null>,
 *   initialized: import('../../../vendor/van-1.6.0.js').State<boolean>,
 *   markReady: () => void,
 *   label?: string,
 *   fallbackMessage?: string,
 * }} states
 * @param {() => Promise<any>} task
 * @returns {Promise<any|undefined>}
 */
export const runPersistentAccountLoad = async (
    { loading, error, refreshError, initialized, markReady, label = "Account page", fallbackMessage },
    task
) => {
    const wasInitialized = initialized.val;

    loading.val = true;
    error.val = null;
    refreshError.val = null;

    try {
        const result = await task();
        if (!wasInitialized) markReady();
        return result;
    } catch (caughtError) {
        logLoadFailure(label, wasInitialized ? "refresh" : "initial load", caughtError);

        const message = getErrorMessage(caughtError, fallbackMessage);
        if (!wasInitialized) error.val = message;
        else refreshError.val = message;
        return undefined;
    } finally {
        loading.val = false;
    }
};
