import van from "../../../../vendor/van-1.6.0.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { toNodes } from "../accountShared.js";

const { div, button } = van.tags;

/**
 * Shared secondary refresh button for account tabs.
 */
export const RefreshButton = ({ onRefresh, tooltip = null, label = "REFRESH", disabled = false } = {}) => {
    const refreshButton = button(
        {
            type: "button",
            class: "btn-secondary",
            onclick: onRefresh,
            disabled,
        },
        label
    );

    return tooltip ? withTooltip(refreshButton, tooltip) : refreshButton;
};

/**
 * Shared warning banner shell for top-of-page notices.
 */
export const WarningBanner = (...content) =>
    div(
        { class: "warning-banner" },
        Icons.Warning(),
        ...content.flatMap((item) => toNodes(item))
    );


