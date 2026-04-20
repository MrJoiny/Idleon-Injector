import van from "../../../../vendor/van-1.6.0.js";
import { joinClasses, toNodes } from "../featureShared.js";

const { div, span } = van.tags;

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
