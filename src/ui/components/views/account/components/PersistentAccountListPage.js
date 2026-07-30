import van from "../../../../vendor/van-1.6.0.js";
import { Icons } from "../../../../assets/icons.js";
import { EmptyState } from "../../../EmptyState.js";
import { Loader } from "../../../Loader.js";
import { joinClasses, resolveValue, toNodes } from "../accountShared.js";

const { div, h3, p } = van.tags;

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
 * @param {string} [opts.rootClass]
 * @param {*} [opts.topNotices]
 * @param {*} [opts.subNav]
 * @param {string|null} [opts.loadingText]
 * @param {string} [opts.errorTitle]
 * @param {string|null} [opts.initialWrapperClass]
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
}) => {
    const hasLoaded = van.state(false);
    const initialClass = (visible) => joinClasses(initialWrapperClass, visible ? "" : "is-hidden-until-ready");

    van.derive(() => {
        if (!resolveValue(state.loading) && !resolveValue(state.error)) hasLoaded.val = true;
    });

    const header = div(
        { class: "account-header account-tab-header" },
        div(
            { class: "account-tab-header__main" },
            h3({ class: "account-tab-header__title" }, title),
            description ? p({ class: "account-tab-header__desc" }, description) : null
        ),
        actions
            ? wrapActions
                ? div({ class: "account-header__actions account-tab-header__actions" }, ...toNodes(actions))
                : actions
            : null
    );
    const chromeNodes = subNav ? [subNav, header, topNotices] : [header, topNotices];
    const resolvedBody = typeof body === "function" ? () => body() ?? div() : body;

    return div(
        { class: rootClass },
        ...chromeNodes,
        div(
            {
                class: () => initialClass(Boolean(resolveValue(state.loading)) && !hasLoaded.val),
            },
            div({ class: "account-loader" }, loadingText !== null ? Loader({ text: loadingText }) : Loader())
        ),
        div(
            {
                class: () => initialClass(!resolveValue(state.loading) && Boolean(resolveValue(state.error))),
            },
            EmptyState({
                icon: Icons.SearchX(),
                title: errorTitle,
                subtitle: () => String(resolveValue(state.error) || ""),
            })
        ),
        div(
            {
                class: () => joinClasses("account-page-shell__body", !hasLoaded.val && "is-hidden-until-ready"),
            },
            resolvedBody
        )
    );
};
