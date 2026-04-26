import van from "../../../../vendor/van-1.6.0.js";
import { Icons } from "../../../../assets/icons.js";
import { joinClasses, toNodes } from "../accountShared.js";

const { div, button, span } = van.tags;

/**
 * Shared expandable group shell for account rows grouped under a player/entity.
 */
export const AccountExpandableGroup = ({
    expanded,
    title,
    marker = null,
    meta = null,
    body = null,
    footer = null,
    rootClass = "",
    bodyClass = "",
    footerClass = "",
}) =>
    div(
        { class: joinClasses("account-expandable-group", rootClass) },
        button(
            {
                type: "button",
                class: "account-expandable-group__header",
                "aria-expanded": () => String(Boolean(expanded.val)),
                onclick: () => {
                    expanded.val = !expanded.val;
                },
            },
            span(
                {
                    class: () =>
                        joinClasses(
                            "account-expandable-group__arrow",
                            expanded.val && "account-expandable-group__arrow--open"
                        ),
                },
                Icons.ChevronRight()
            ),
            span({ class: "account-expandable-group__title" }, ...toNodes(title), ...toNodes(marker)),
            meta !== null ? span({ class: "account-expandable-group__meta" }, ...toNodes(meta)) : null
        ),
        div(
            {
                class: () =>
                    joinClasses(
                        "account-expandable-group__body",
                        expanded.val && "account-expandable-group__body--open",
                        bodyClass
                    ),
            },
            ...toNodes(body),
            footer !== null
                ? div({ class: joinClasses("account-expandable-group__footer", footerClass) }, ...toNodes(footer))
                : null
        )
    );
