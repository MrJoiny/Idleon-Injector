import van from "../../../../vendor/van-1.6.0.js";
import { getNumberInputLiveRaw, NumberInput } from "../../../NumberInput.js";
import { ActionButton } from "./ActionButton.js";
import {
    adjustFormattedIntInput,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    writeVerified,
} from "../accountShared.js";
import { useNumericEditor } from "../useNumericEditor.js";

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
    write = null,
    onApplied = null,
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
    const { inputValue, status, isDisabled, applyValue, focus, blur, statusMessage } = useNumericEditor({
        valueState,
        normalize,
        write: typeof write === "function" ? write : (value) => writeVerified(path, value),
        format,
        disabled: inputProps.disabled,
        onApplied,
    });

    const renderLabel = () => {
        const content = typeof label === "function" ? label() : label;
        return Array.isArray(content) ? span({ class: labelClass }, ...content) : span({ class: labelClass }, content);
    };

    if (statusTarget) {
        van.derive(() => {
            statusTarget.val = status.val;
        });
    }

    return div(
        { class: rootClass },
        renderLabel(),
        NumberInput({
            mode: inputMode,
            value: inputValue,
            ...inputProps,
            disabled: isDisabled,
            onfocus: () => {
                focus();
                if (typeof inputProps.onfocus === "function") inputProps.onfocus();
            },
            onblur: () => {
                blur();
                if (typeof inputProps.onblur === "function") inputProps.onblur();
            },
            onDecrement: () => {
                if (isDisabled()) return;
                inputValue.val = String(
                    adjust(getNumberInputLiveRaw(inputValue) ?? inputValue.val, -1, valueState.val)
                );
                if (typeof inputProps.onDecrement === "function") inputProps.onDecrement();
            },
            onIncrement: () => {
                if (isDisabled()) return;
                inputValue.val = String(adjust(getNumberInputLiveRaw(inputValue) ?? inputValue.val, 1, valueState.val));
                if (typeof inputProps.onIncrement === "function") inputProps.onIncrement();
            },
        }),
        ActionButton({
            label: "SET",
            status,
            disabled: isDisabled,
            className: inputClass,
            onClick: (e) => {
                e.preventDefault();
                void applyValue();
            },
        }),
        span({ class: "account-write-feedback", role: "status" }, statusMessage)
    );
};
