import van from "../../../vendor/van-1.6.0.js";
import { withTooltip } from "../../Tooltip.js";

const { div, button } = van.tags;

const toNodes = (content) => {
    if (content === null || content === undefined) return [];
    return Array.isArray(content) ? content : [content];
};

const buildButtonClass = (variant, status, extraClass) => () =>
    [
        variant === "apply" ? "feature-btn feature-btn--apply" : "feature-btn feature-btn--max-reset",
        status?.val === "loading" ? "feature-btn--loading" : "",
        status?.val === "success" ? "feature-row--success" : "",
        status?.val === "error" ? "feature-row--error" : "",
        typeof extraClass === "function" ? extraClass() : extraClass,
    ]
        .filter(Boolean)
        .join(" ");

/**
 * Shared header action strip for bulk account-page actions.
 */
export const FeatureBulkActionBar = ({ leading = null, actions = [], refresh = null }) =>
    div(
        { class: "feature-header__actions" },
        ...toNodes(leading),
        ...actions.filter(Boolean).map((action) => {
            const buttonNode = button(
                {
                    type: "button",
                    onmousedown: action.preventMouseDown === false ? null : (e) => e.preventDefault(),
                    class: buildButtonClass(action.variant ?? "max-reset", action.status, action.extraClass),
                    disabled:
                        typeof action.disabled === "function"
                            ? action.disabled
                            : () => Boolean(action.disabled) || action.status?.val === "loading",
                    onclick: (e) => action.onClick(e),
                },
                () => {
                    const label =
                        action.status?.val === "loading" && action.loadingLabel !== undefined
                            ? action.loadingLabel
                            : action.label;
                    return typeof label === "function" ? label() : label;
                }
            );
            return action.tooltip ? withTooltip(buttonNode, action.tooltip) : buttonNode;
        }),
        refresh
            ? (() => {
                  const refreshButton = button(
                      {
                          class: "btn-secondary",
                          disabled:
                              typeof refresh.disabled === "function" ? refresh.disabled : () => !!refresh.disabled,
                          onclick: refresh.onClick,
                      },
                      "REFRESH"
                  );
                  return refresh.tooltip ? withTooltip(refreshButton, refresh.tooltip) : refreshButton;
              })()
            : null
    );
