import van from "../vendor/van-1.6.0.js";

const { div, input, button } = van.tags;

/**
 * Reusable NumberInput component with side controls.
 * Only allows numeric input (digits and an optional leading minus sign).
 *
 * @param {Object} props
 * @param {import('../vendor/van-1.6.0.js').State} props.value - VanJS State object for the input value
 * @param {Function} [props.onDecrement] - Click handler for minus button
 * @param {Function} [props.onIncrement] - Click handler for plus button
 * @param {Object} [props.inputProps] - Additional properties for the input element (oninput, onfocus, etc)
 */
export const NumberInput = ({ value, onDecrement, onIncrement, ...inputProps }) => {
    const { oninput: userOninput, ...restInputProps } = inputProps;

    const handleInput = (e) => {
        // Allow digits and a single leading minus sign; strip everything else
        const raw = e.target.value;
        const cleaned = raw
            .replace(/[^0-9-]/g, "")      // remove non-digit, non-minus chars
            .replace(/(?!^)-/g, "");       // remove any minus that isn't at position 0

        if (e.target.value !== cleaned) {
            e.target.value = cleaned;
        }

        if (userOninput) userOninput(e);
    };

    return div(
        { class: "number-input-wrapper" },
        input({ type: "number", value: value, oninput: handleInput, ...restInputProps }),
        button({ class: "number-input-btn", onclick: onDecrement, tabindex: -1 }, "-"),
        button({ class: "number-input-btn", onclick: onIncrement, tabindex: -1 }, "+")
    );
};
