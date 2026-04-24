import { AccountPageShell } from "./AccountPageShell.js";
import { AccountTabHeader } from "./AccountTabHeader.js";

/**
 * Shared wrapper for account pages that keep their row DOM alive across refreshes.
 *
 * @param {object} opts
 * @param {string} opts.title
 * @param {string|null} [opts.description]
 * @param {*} [opts.actions]
 * @param {boolean} [opts.wrapActions]
 * @param {{loading: *, error: *}} opts.state
 * @param {*} opts.body
 * @returns {HTMLElement}
 */
export const PersistentAccountListPage = ({
    title,
    description = null,
    actions = null,
    wrapActions = true,
    state,
    body,
    rootClass = "tab-container",
    topNotices = null,
    subNav = null,
    loadingText = null,
    errorTitle = "LOAD FAILED",
    initialWrapperClass = null,
}) =>
    AccountPageShell({
        rootClass,
        header: AccountTabHeader({ title, description, actions, wrapActions }),
        topNotices,
        subNav,
        persistentState: state,
        persistentLoadingText: loadingText,
        persistentErrorTitle: errorTitle,
        persistentInitialWrapperClass: initialWrapperClass,
        body,
    });
