/**
 * W3 — Misc Tab
 *
 * Placeholder tab for miscellaneous W3 features pending implementation:
 *   - LIBRARY      — Books Check Out
 *   - WORSHIP      — Charge & Max Wave
 */

import van from "../../../../vendor/van-1.6.0.js";

const { div, span, h3, p } = van.tags;

// ── FeatureStub ────────────────────────────────────────────────────────────

const FeatureStub = ({ title, subtitle }) =>
    div(
        { class: "feature-row feature-row--info" },
        div(
            { class: "feature-row__info" },
            div(
                {},
                span({ class: "feature-row__name" }, title),
                p({ class: "feature-header__desc" }, subtitle),
            ),
        ),
        span({ class: "feature-row__badge" }, "COMING SOON"),
    );

// ── MiscTab ────────────────────────────────────────────────────────────────

export const MiscTab = () =>
    div(
        { class: "tab-container" },

        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "W3 — MISC"),
                p({ class: "feature-header__desc" }, "Library, Worship, and other W3 features — coming soon."),
            ),
        ),

        div(
            { class: "feature-list" },
            FeatureStub({
                title: "LIBRARY — Books Check Out",
                subtitle: "Track and set library book check-outs and progress.",
            }),
            FeatureStub({
                title: "WORSHIP — Charge & Max Wave",
                subtitle: "Manage worship charge level and highest wave achieved.",
            }),
        ),
    );
