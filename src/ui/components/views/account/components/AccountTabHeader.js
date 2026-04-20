import van from "../../../../vendor/van-1.6.0.js";
import { toNodes } from "../accountShared.js";

const { div, h3, p } = van.tags;

/**
 * Shared header shell for account tabs.
 */
export const AccountTabHeader = ({ title, description = null, actions = null, wrapActions = true }) =>
    div(
        { class: "account-header account-tab-header" },
        div(
            { class: "account-tab-header__main" },
            h3({ class: "account-tab-header__title" }, title),
            description ? p({ class: "account-header__desc account-tab-header__desc" }, description) : null
        ),
        actions
            ? wrapActions
                ? div({ class: "account-header__actions account-tab-header__actions" }, ...toNodes(actions))
                : actions
            : null
    );


