import van from "../../../../vendor/van-1.6.0.js";
import { withTooltip } from "../../../Tooltip.js";
import { joinClasses, resolveValue } from "../accountShared.js";

const { button } = van.tags;

const VARIANT_CLASS = {
    apply: "account-btn account-btn--apply",
    danger: "account-btn account-btn--danger",
    "max-reset": "account-btn account-btn--max-reset",
};

/**
 * Shared action button for account feature tabs.
 */
export const ActionButton = ({
    label,
    loadingLabel = "...",
    status = null,
    variant = "apply",
    className = "",
    disabled = false,
    tooltip = null,
    onClick,
    preventMouseDown = true,
    type = "button",
}) => {
    const buttonNode = button(
        {
            type,
            onmousedown: preventMouseDown ? (e) => e.preventDefault() : null,
            class: () => {
                const resolvedStatus = resolveValue(status);
                return joinClasses(
                    VARIANT_CLASS[variant] ?? variant,
                    typeof className === "function" ? className() : className,
                    resolvedStatus === "loading" ? "account-btn--loading" : "",
                    resolvedStatus === "success" ? "account-row--success" : "",
                    resolvedStatus === "error" ? "account-row--error" : ""
                );
            },
            disabled: () => {
                const resolvedDisabled = typeof disabled === "function" ? disabled() : disabled;
                return Boolean(resolvedDisabled) || resolveValue(status) === "loading";
            },
            onclick: onClick,
        },
        () => {
            const nextLabel = resolveValue(status) === "loading" ? loadingLabel : label;
            return typeof nextLabel === "function" ? nextLabel() : nextLabel;
        }
    );

    return tooltip ? withTooltip(buttonNode, tooltip) : buttonNode;
};


