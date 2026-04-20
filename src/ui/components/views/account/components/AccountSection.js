import van from "../../../../vendor/van-1.6.0.js";
import { joinClasses, toNodes } from "../accountShared.js";

const { div, span } = van.tags;

/**
 * Shared section wrapper for grouped account feature content.
 */
export const AccountSection = ({ title, note = null, meta = null, rootClass = "", body = null }) =>
    div(
        { class: joinClasses("account-section", rootClass) },
        div(
            { class: "account-section__header" },
            span({ class: "account-section__title" }, title),
            note ? span({ class: "account-section__note" }, note) : null,
            meta ? div({ class: "account-section__meta" }, ...toNodes(meta)) : null
        ),
        ...toNodes(body)
    );


