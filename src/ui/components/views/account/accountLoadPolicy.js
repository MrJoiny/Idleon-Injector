import van from "../../../vendor/van-1.6.0.js";

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
 * Hook that owns account-page load state and runs a load task with standard
 * loading/error transitions and page-level logging.
 *
 * @param {{ label?: string, fallbackMessage?: string }} [opts]
 * @returns {{
 *   loading: import('../../../vendor/van-1.6.0.js').State<boolean>,
 *   error: import('../../../vendor/van-1.6.0.js').State<string|null>,
 *   run: (task: () => Promise<any>) => Promise<any|undefined>,
 * }}
 */
export const useAccountLoadState = ({ label = "Account page", fallbackMessage } = {}) => {
    const loading = van.state(true);
    const error = van.state(null);

    const run = async (task) => {
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

    return { loading, error, run };
};
