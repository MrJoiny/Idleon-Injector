import van from "../vendor/van-1.6.0.js";

const { div, input, button } = van.tags;

/**
 * Parse user input to a plain JS number. Handles:
 *   - Shorthand suffixes (case-insensitive): 2b, 1.5k, 10m, 5t
 *   - Caller-supplied parser (K/M/B/T/Q/QQ/QQQ, scientific E-notation, …)
 *   - Plain numbers
 *
 * Returns null if unparseable.
 *
 * @param {string}        raw
 * @param {Function|null} callerParser  - (string) => string|null
 * @returns {number|null}
 */
function parseInput(raw, callerParser = null) {
    if (!raw || raw.trim() === "") return null;
    const s = raw.trim();

    // 1. Shorthand suffixes — lowercase only so callerParser gets uppercase ones
    const suffixMap = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
    const suffixMatch = s.match(/^(-?[\d.]+)([kmbt])$/i);
    if (suffixMatch) {
        const n = parseFloat(suffixMatch[1]);
        const mult = suffixMap[suffixMatch[2].toLowerCase()];
        if (!isNaN(n) && mult) return n * mult;
    }

    // 2. Caller-supplied parser (handles K/M/B/T/Q/QQ/QQQ, 1e27, 1.31E27, …)
    if (callerParser) {
        const p = callerParser(s);
        if (p !== null && p !== undefined) {
            const n = Number(p);
            if (!isNaN(n)) return n;
        }
    }

    // 3. Plain number
    const n = Number(s);
    return isNaN(n) ? null : n;
}

/**
 * Reusable NumberInput component with optional +/- side controls.
 *
 * Props:
 *   value       {State}     VanJS state holding the current numeric value as a string.
 *   mode        {string}    "int" (default) | "float" — whether decimals are allowed.
 *   formatter   {Function}  (rawString) → displayString. Enables formatted mode.
 *   parser      {Function}  (displayString) → rawString | null. Required with formatter.
 *   onDecrement {Function}  Called when the − button is clicked.
 *   onIncrement {Function}  Called when the + button is clicked.
 *
 * Formatted mode behaviour:
 *   • The input always shows formatter(value.val) when not focused.
 *   • While the user is typing the browser owns the field entirely —
 *     no state is mutated, no reactive updates fire, cursor is never disrupted.
 *   • On blur the typed text is parsed; on success value.val is committed and
 *     the formatted display is restored; on failure the field reverts.
 *   • External value.val changes (e.g. +/− buttons) update the DOM directly
 *     only when the field is not focused.
 *
 * Standard mode behaviour:
 *   • type="text" with character filtering (digits, optional leading minus,
 *     optional decimal point in float mode).
 *   • Suffix notation (2b, 1.5k) is expanded immediately on each keystroke.
 *   • value.val is kept in sync on every input event.
 */
export const NumberInput = ({
    value,
    mode = "int",
    onDecrement,
    onIncrement,
    formatter,
    parser,
    ...inputProps
}) => {
    const {
        oninput: userOninput,
        onfocus: userOnfocus,
        onblur:  userOnblur,
        ...restInputProps
    } = inputProps;

    const allowDecimal = mode === "float";

    const commit = (n) =>
        String(allowDecimal ? n : Math.round(n));

    // ── Formatted mode ────────────────────────────────────────────────────────
    if (formatter) {
        let isFocused = false;

        const tryParse = (raw) => {
            const n = parseInput(raw, parser);
            return n !== null ? commit(n) : null;
        };

        // Hold a direct DOM reference so we can write inputEl.value ourselves.
        // If we used a reactive `value:` VanJS prop, any state change would let
        // VanJS overwrite input.value mid-keystroke, resetting the cursor.
        const inputEl = input({
            type: "text",
            ...restInputProps,

            onfocus(e) {
                isFocused = true;
                inputEl.value = formatter(value.val);
                if (userOnfocus) userOnfocus(e);
            },

            oninput(e) {
                // Do NOT mutate any VanJS state here. A synchronous state mutation
                // triggers all subscribers immediately, which can cause ancestor
                // reactive closures to rebuild their DOM subtrees — destroying this
                // input element, losing focus, and resetting scroll position.
                if (userOninput) userOninput(e);
            },

            onblur(e) {
                isFocused = false;
                const parsed = tryParse(e.target.value);
                if (parsed !== null) {
                    value.val     = parsed;
                    inputEl.value = formatter(parsed);
                } else {
                    inputEl.value = formatter(value.val);
                }
                if (userOnblur) userOnblur(e);
            },
        });

        inputEl.value = formatter(value.val);

        // React to external value.val changes (e.g. +/− buttons) only when
        // the field is not focused so in-progress typing is never clobbered.
        van.derive(() => {
            const v = value.val;
            if (!isFocused) inputEl.value = formatter(v);
        });

        return div(
            { class: "number-input-wrapper" },
            inputEl,
            button({ class: "number-input-btn", onclick: onDecrement, tabindex: -1 }, "−"),
            button({ class: "number-input-btn", onclick: onIncrement, tabindex: -1 }, "+")
        );
    }

    // ── Standard mode ─────────────────────────────────────────────────────────
    const handleInput = (e) => {
        const raw = e.target.value;

        // Expand suffix notation as soon as the suffix letter is typed.
        const n = parseInput(raw);
        if (n !== null && raw.match(/[kmbt]$/i)) {
            const committed   = commit(n);
            e.target.value    = committed;
            value.val         = committed;
            if (userOninput) userOninput(e);
            return;
        }

        // Strip characters that aren't valid for this mode.
        const cleaned = allowDecimal
            ? raw.replace(/[^0-9.-]/g, "").replace(/(?!^)-/g, "").replace(/(\..*)\./g, "$1")
            : raw.replace(/[^0-9-]/g, "").replace(/(?!^)-/g, "");

        if (e.target.value !== cleaned) e.target.value = cleaned;
        value.val = e.target.value;
        if (userOninput) userOninput(e);
    };

    return div(
        { class: "number-input-wrapper" },
        input({ type: "text", value, oninput: handleInput, ...restInputProps }),
        button({ class: "number-input-btn", onclick: onDecrement, tabindex: -1 }, "−"),
        button({ class: "number-input-btn", onclick: onIncrement, tabindex: -1 }, "+")
    );
};
