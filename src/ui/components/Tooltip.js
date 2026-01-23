import van from "../vendor/van-1.6.0.js";

const { div } = van.tags;

const tooltipState = van.state({
    visible: false,
    text: "",
    x: 0,
    y: 0,
    position: "top",
});

const VIEWPORT_PADDING = 8;
const TOOLTIP_OFFSET = 8;

/**
 * Calculate tooltip position with viewport bounds checking
 * @param {HTMLElement} targetEl - The element to position relative to
 * @param {string} preferredPosition - Preferred position: 'top', 'bottom', 'left', 'right'
 * @param {HTMLElement} tooltipEl - The tooltip element (for size measurement)
 * @returns {{ x: number, y: number, position: string }}
 */
const calculatePosition = (targetEl, preferredPosition, tooltipEl) => {
    const rect = targetEl.getBoundingClientRect();
    const tooltipRect = tooltipEl?.getBoundingClientRect() || { width: 100, height: 30 };

    let position = preferredPosition;
    let x, y;

    // Check if preferred position would overflow and flip if needed
    if (position === "top" && rect.top - tooltipRect.height - TOOLTIP_OFFSET < VIEWPORT_PADDING) {
        position = "bottom";
    } else if (
        position === "bottom" &&
        rect.bottom + tooltipRect.height + TOOLTIP_OFFSET > window.innerHeight - VIEWPORT_PADDING
    ) {
        position = "top";
    } else if (position === "left" && rect.left - tooltipRect.width - TOOLTIP_OFFSET < VIEWPORT_PADDING) {
        position = "right";
    } else if (
        position === "right" &&
        rect.right + tooltipRect.width + TOOLTIP_OFFSET > window.innerWidth - VIEWPORT_PADDING
    ) {
        position = "left";
    }

    switch (position) {
        case "top":
            x = rect.left + rect.width / 2;
            y = rect.top - TOOLTIP_OFFSET;
            break;
        case "bottom":
            x = rect.left + rect.width / 2;
            y = rect.bottom + TOOLTIP_OFFSET;
            break;
        case "left":
            x = rect.left - TOOLTIP_OFFSET;
            y = rect.top + rect.height / 2;
            break;
        case "right":
            x = rect.right + TOOLTIP_OFFSET;
            y = rect.top + rect.height / 2;
            break;
        default:
            x = rect.left + rect.width / 2;
            y = rect.top - TOOLTIP_OFFSET;
    }

    // Clamp positions to viewport bounds
    if (position === "top" || position === "bottom") {
        const halfWidth = tooltipRect.width / 2;
        x = Math.max(halfWidth + VIEWPORT_PADDING, Math.min(x, window.innerWidth - halfWidth - VIEWPORT_PADDING));
    }

    if (position === "left" || position === "right") {
        const halfHeight = tooltipRect.height / 2;
        y = Math.max(halfHeight + VIEWPORT_PADDING, Math.min(y, window.innerHeight - halfHeight - VIEWPORT_PADDING));
    }

    return { x, y, position };
};

let tooltipElement = null;

const showTooltip = (targetEl, text, position = "top") => {
    // First render off-screen to measure size, then position correctly
    tooltipState.val = {
        visible: true,
        text,
        x: -9999,
        y: -9999,
        position,
    };

    requestAnimationFrame(() => {
        if (tooltipElement) {
            const pos = calculatePosition(targetEl, position, tooltipElement);
            tooltipState.val = { visible: true, text, ...pos };
        }
    });
};

const hideTooltip = () => {
    tooltipState.val = { ...tooltipState.val, visible: false };
};

export const TooltipContainer = () => {
    const el = div(
        {
            class: () =>
                `tooltip-fixed tooltip-${tooltipState.val.position} ${tooltipState.val.visible ? "visible" : ""}`,
            style: () => `--tooltip-x: ${tooltipState.val.x}px; --tooltip-y: ${tooltipState.val.y}px;`,
        },
        () => tooltipState.val.text
    );

    setTimeout(() => {
        tooltipElement = el;
    }, 0);

    return el;
};

/**
 * Add tooltip behavior to an element
 * @param {HTMLElement} element - The element to attach tooltip to
 * @param {string | (() => string)} text - Tooltip text (can be reactive function)
 * @param {string} position - Position preference: 'top', 'bottom', 'left', 'right'
 * @param {boolean | (() => boolean)} enabled - Whether the tooltip is enabled
 * @returns {HTMLElement} The same element with tooltip attached
 */
export const withTooltip = (element, text, position = "top", enabled = true) => {
    element.addEventListener("mouseenter", () => {
        const isEnabled = typeof enabled === "function" ? enabled() : enabled;
        if (!isEnabled) return;

        const tooltipText = typeof text === "function" ? text() : text;
        showTooltip(element, tooltipText, position);
    });

    element.addEventListener("mouseleave", hideTooltip);

    return element;
};
