import van from "../vendor/van-1.6.0.js";

const { div, input, button } = van.tags;

/**
 * Reusable NumberInput component with side controls
 * @param {Object} props
 * @param {import('../vendor/van-1.6.0.js').State} props.value - VanJS State object for the input value
 * @param {Function} [props.onDecrement] - Click handler for minus button
 * @param {Function} [props.onIncrement] - Click handler for plus button
 * @param {Object} [props.inputProps] - Additional properties for the input element (oninput, onfocus, etc)
 */
export const NumberInput = ({ value, onDecrement, onIncrement, ...inputProps }) => {
    return div(
        { class: "number-input-wrapper" },
        input({ type: "number", value: value, ...inputProps }),
        button({ class: "number-input-btn", onclick: onDecrement, tabindex: -1 }, "-"),
        button({ class: "number-input-btn", onclick: onIncrement, tabindex: -1 }, "+")
    );
};
