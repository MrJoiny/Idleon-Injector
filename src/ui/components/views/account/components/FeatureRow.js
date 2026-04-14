import van from "../../../../vendor/van-1.6.0.js";

const { div, span } = van.tags;

const toNodes = (content) => {
    if (content === null || content === undefined) return [];
    return Array.isArray(content) ? content : [content];
};

const resolveValue = (valueOrState) => {
    if (typeof valueOrState === "function") return valueOrState();
    if (valueOrState && typeof valueOrState === "object" && "val" in valueOrState) return valueOrState.val;
    return valueOrState;
};

const joinClasses = (...parts) => parts.filter(Boolean).join(" ");

/**
 * Shared non-numeric row shell for account feature tabs.
 */
export const FeatureRow = ({
    info,
    badge = null,
    controls = null,
    rowClass = "",
    badgeClass = "",
    controlsClass = "",
    status = null,
}) =>
    div(
        {
            class: () => {
                const resolvedStatus = resolveValue(status);
                return joinClasses(
                    "feature-row",
                    typeof rowClass === "function" ? rowClass() : rowClass,
                    resolvedStatus === "success" ? "feature-row--success" : "",
                    resolvedStatus === "error" ? "feature-row--error" : ""
                );
            },
        },
        div({ class: "feature-row__info" }, ...toNodes(info)),
        badge !== null
            ? span(
                  {
                      class: () =>
                          joinClasses(
                              "feature-row__badge",
                              typeof badgeClass === "function" ? badgeClass() : badgeClass
                          ),
                  },
                  ...toNodes(badge)
              )
            : null,
        controls !== null
            ? div(
                  {
                      class: () =>
                          joinClasses(
                              "feature-row__controls",
                              typeof controlsClass === "function" ? controlsClass() : controlsClass
                          ),
                  },
                  ...toNodes(controls)
              )
            : null
    );
