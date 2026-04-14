import van from "../../../../vendor/van-1.6.0.js";

const { div } = van.tags;

const toNodes = (content) => {
    if (content === null || content === undefined) return [];
    return Array.isArray(content) ? content : [content];
};

/**
 * Shared shell ordering for account feature tabs.
 */
export const FeatureTabFrame = ({
    rootClass = "tab-container feature-tab-frame",
    header = null,
    topNotices = null,
    subNav = null,
    refreshError = null,
    initialState = null,
    body = null,
}) =>
    div(
        { class: rootClass },
        ...toNodes(header),
        ...toNodes(topNotices),
        ...toNodes(subNav),
        ...toNodes(refreshError),
        ...toNodes(initialState),
        ...toNodes(body)
    );
