import van from "../../../../vendor/van-1.6.0.js";
import { getNumberInputLiveRaw, NumberInput } from "../../../NumberInput.js";
import { ActionButton } from "./ActionButton.js";
import {
    adjustFormattedIntInput,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    useWriteStatus,
    writeVerified,
} from "../accountShared.js";

const { div, span } = van.tags;

const defaultInputProps = {
    formatter: largeFormatter,
    parser: largeParser,
};
const defaultNormalize = (raw) => resolveNumberInput(raw, { formatted: true, min: 0, fallback: null });
const defaultAdjust = (raw, delta, current) => adjustFormattedIntInput(raw, delta, current ?? 0, { min: 0 });

/**
 * Inline numeric editor for grouped account rows.
 *
 * This is not a full row; it is a field-level control meant to be composed inside AccountRow controls.
 */
export const InlineEditableNumberField = ({
    label,
    valueState,
    path,
    normalize = defaultNormalize,
    format = largeFormatter,
    adjust = defaultAdjust,
    inputMode = "int",
    inputProps = defaultInputProps,
    statusTarget = null,
    rootClass = "account-field-metric",
    labelClass = "account-field-metric__label",
    inputClass = "account-inline-number-field__input",
}) => {
    const inputValue = van.state(format(valueState.val));
    const { status, run } = useWriteStatus();
    let isFocused = false;

    const syncInputToCommitted = () => {
        inputValue.val = format(valueState.val);
    };

    van.derive(() => {
        valueState.val;
        if (!isFocused) syncInputToCommitted();
    });

    if (statusTarget) {
        van.derive(() => {
            statusTarget.val = status.val;
        });
    }

    const applyValue = async (rawValue = getNumberInputLiveRaw(inputValue) ?? inputValue.val) => {
        const nextValue = normalize(rawValue);
        if (nextValue === null || nextValue === undefined || Number.isNaN(nextValue)) return;

        await run(async () => {
            await writeVerified(path, nextValue);
            valueState.val = nextValue;
            inputValue.val = format(nextValue);
        });
    };

    return div(
        { class: rootClass },
        span({ class: labelClass }, () => (typeof label === "function" ? label() : label)),
        NumberInput({
            mode: inputMode,
            value: inputValue,
            ...inputProps,
            onfocus: () => {
                isFocused = true;
                if (typeof inputProps.onfocus === "function") inputProps.onfocus();
            },
            onblur: () => {
                isFocused = false;
                syncInputToCommitted();
                if (typeof inputProps.onblur === "function") inputProps.onblur();
            },
            onDecrement: () => {
                inputValue.val = String(
                    adjust(getNumberInputLiveRaw(inputValue) ?? inputValue.val, -1, valueState.val)
                );
                if (typeof inputProps.onDecrement === "function") inputProps.onDecrement();
            },
            onIncrement: () => {
                inputValue.val = String(adjust(getNumberInputLiveRaw(inputValue) ?? inputValue.val, 1, valueState.val));
                if (typeof inputProps.onIncrement === "function") inputProps.onIncrement();
            },
        }),
        ActionButton({
            label: "SET",
            status,
            className: inputClass,
            onClick: (e) => {
                e.preventDefault();
                void applyValue();
            },
        })
    );
};
