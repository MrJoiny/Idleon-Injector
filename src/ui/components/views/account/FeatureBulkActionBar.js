import van from "../../../vendor/van-1.6.0.js";
import { withTooltip } from "../../Tooltip.js";
import { FeatureActionButton } from "./components/FeatureActionButton.js";

const { div, button } = van.tags;

const toNodes = (content) => {
    if (content === null || content === undefined) return [];
    return Array.isArray(content) ? content : [content];
};

/**
 * Shared header action strip for bulk account-page actions.
 */
export const FeatureBulkActionBar = ({ leading = null, actions = [], refresh = null }) =>
    div(
        { class: "feature-header__actions" },
        ...toNodes(leading),
        ...actions
            .filter(Boolean)
            .map((action) =>
                FeatureActionButton({
                    label: action.label,
                    loadingLabel: action.loadingLabel ?? "...",
                    status: action.status,
                    variant: action.variant ?? "max-reset",
                    className: action.extraClass ?? "",
                    disabled: action.disabled ?? false,
                    tooltip: action.tooltip ?? null,
                    onClick: (e) => action.onClick(e),
                    preventMouseDown: action.preventMouseDown !== false,
                })
            ),
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
