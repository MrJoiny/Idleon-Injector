import van from "../../../../vendor/van-1.6.0.js";

const { div, span } = van.tags;

const toNodes = (content) => {
    if (content === null || content === undefined) return [];
    return Array.isArray(content) ? content : [content];
};

const joinClasses = (...parts) => parts.filter(Boolean).join(" ");

/**
 * Shared section wrapper for grouped account feature content.
 */
export const FeatureSection = ({ title, note = null, meta = null, rootClass = "", body = null }) =>
    div(
        { class: joinClasses("feature-section", rootClass) },
        div(
            { class: "feature-section__header" },
            span({ class: "feature-section__title" }, title),
            note ? span({ class: "feature-section__note" }, note) : null,
            meta ? div({ class: "feature-section__meta" }, ...toNodes(meta)) : null
        ),
        ...toNodes(body)
    );
