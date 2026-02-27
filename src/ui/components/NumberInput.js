import van from "../vendor/van-1.6.0.js";

const { div, input, button } = van.tags;

/**
 * Reusable NumberInput component with side controls.
 * Only allows numeric input (digits and an optional leading minus sign).
 *
 * @param {Object}   props
 * @param {State}    props.value       - VanJS State: the raw numeric string
 * @param {Function} [props.onDecrement]
 * @param {Function} [props.onIncrement]
 * @param {Function} [props.formatter] - Optional: format value for display (raw → display string)
 * @param {Function} [props.parser]    - Optional: parse display string back to raw number string
 *                                       Required when formatter is provided.
 */
export const NumberInput = ({ value, onDecrement, onIncrement, formatter, parser, ...inputProps }) => {
    const { oninput: userOninput, onfocus: userOnfocus, onblur: userOnblur, ...restInputProps } = inputProps;

    if (formatter) {
        // ── Formatted mode ─────────────────────────────────────────────────
        // The parent is responsible for only updating `value` when the input
        // is not focused (to avoid clobbering in-progress typing).
        // We expose onfocus/onblur so the parent can track focus state.

        // To do add support for typing numbers with suffixes (e.g. "1.5k"), the parser should be able to handle that and convert it back to a raw number string ("1500"). The formatter would do the opposite: take a raw number string and convert it to a display string with suffixes as needed.

        const handleInput = (e) => {
            // Don't reformat while typing — just propagate the raw text upward
            // so the parent value state stays in sync for +/- buttons.
            const raw = e.target.value;
            const parsed = parser ? parser(raw) : null;
            if (parsed !== null && !isNaN(Number(parsed))) {
                value.val = String(parsed);
            }
            if (userOninput) userOninput(e);
        };

        return div(
            { class: "number-input-wrapper" },
            input({
                type:    "text",
                // Display: use formatter only when value looks like a plain number,
                // otherwise show as-is so in-progress typed text isn't replaced.
                value:   () => formatter(value.val),
                oninput: handleInput,
                onfocus: userOnfocus,
                onblur:  userOnblur,
                ...restInputProps,
            }),
            button({ class: "number-input-btn", onclick: onDecrement, tabindex: -1 }, "-"),
            button({ class: "number-input-btn", onclick: onIncrement, tabindex: -1 }, "+")
        );
    }

    // ── Standard mode (unchanged) ─────────────────────────────────────────
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
