import van from "../../../../vendor/van-1.6.0.js";

const { div, h3, p } = van.tags;

const toNodes = (content) => {
    if (content === null || content === undefined) return [];
    return Array.isArray(content) ? content : [content];
};

/**
 * Shared header shell for account feature tabs.
 */
export const FeatureTabHeader = ({ title, description = null, actions = null, wrapActions = true }) =>
    div(
        { class: "feature-header feature-tab-header" },
        div(
            { class: "feature-tab-header__main" },
            h3({ class: "feature-tab-header__title" }, title),
            description ? p({ class: "feature-header__desc feature-tab-header__desc" }, description) : null
        ),
        actions
            ? wrapActions
                ? div({ class: "feature-header__actions feature-tab-header__actions" }, ...toNodes(actions))
                : actions
            : null
    );
