import van from "../../../vendor/van-1.6.0.js";
import { ActionButton } from "./components/ActionButton.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { toNodes } from "./accountShared.js";

const { div } = van.tags;

/**
 * Shared header action strip for bulk account-page actions.
 */
export const BulkActionBar = ({ leading = null, actions = [], refresh = null }) =>
    div(
        { class: "account-header__actions" },
        ...toNodes(leading),
        ...actions
            .filter(Boolean)
            .map((action) =>
                ActionButton({
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
            ? RefreshButton({
                  onRefresh: refresh.onClick,
                  tooltip: refresh.tooltip ?? null,
                  disabled: refresh.disabled ?? false,
              })
            : null
    );


