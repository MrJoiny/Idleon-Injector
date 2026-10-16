import van from "../../../vendor/van-1.6.0.js";
import { NumberInput } from "../../NumberInput.js";
import { adjustFormattedIntInput, largeFormatter, largeParser, toInt, toNodes } from "./accountShared.js";
import { useFieldEditor } from "./useFieldEditor.js";
import { AccountRow } from "./components/AccountRow.js";
import { ActionButton } from "./components/ActionButton.js";

const { div, span } = van.tags;

const defaultStackedAdjust = (field, rawValue, delta) => {
    if (typeof field.adjustDraft === "function") return field.adjustDraft(rawValue, delta);
    const min = field.min ?? 0;
    const max = field.max ?? Infinity;
    if (field.formatted) return adjustFormattedIntInput(rawValue, delta, 0, { min, max });
    const currentValue = toInt(rawValue);
    return Math.max(min, Math.min(max, currentValue + delta));
};

/** Shared staged numeric field for EditableFieldsRow controls. */
export const StackedNumberField = ({ field, draftStates, getDraftValue = null, setFieldFocused, resetDraft }) => {
    const inputProps = field.inputProps ?? {};
    const formatter = field.formatter ?? (field.formatted ? largeFormatter : undefined);
    const parser = field.parser ?? (field.formatted ? largeParser : undefined);
    const getRawDraft = () =>
        typeof getDraftValue === "function" ? getDraftValue(field.key) : draftStates[field.key].val;

    return div(
        { class: field.rootClass ?? "account-stacked-field" },
        span({ class: field.labelClass ?? "account-stacked-field__label" }, field.label),
        NumberInput({
            mode: field.inputMode ?? (field.float ? "float" : "int"),
            value: draftStates[field.key],
            formatter,
            parser,
            ...inputProps,
            onfocus: () => {
                setFieldFocused(field.key, true);
                if (typeof inputProps.onfocus === "function") inputProps.onfocus();
            },
            onblur: () => {
                setFieldFocused(field.key, false);
                resetDraft(field.key);
                if (typeof inputProps.onblur === "function") inputProps.onblur();
            },
            onDecrement: () => {
                draftStates[field.key].val = String(defaultStackedAdjust(field, getRawDraft(), -1));
                if (typeof inputProps.onDecrement === "function") inputProps.onDecrement();
            },
            onIncrement: () => {
                draftStates[field.key].val = String(defaultStackedAdjust(field, getRawDraft(), 1));
                if (typeof inputProps.onIncrement === "function") inputProps.onIncrement();
            },
        })
    );
};

/** Shared editable row primitive for rows that stage multiple draft fields before applying them in one write. */
export const EditableFieldsRow = ({
    fields,
    normalize,
    write,
    info,
    badge = null,
    rowClass = "",
    badgeClass = "",
    controlsClass = "",
    renderControls,
    renderExtraActions = null,
    applyLabel = "SET",
    applyTooltip = null,
    applyVariant = "apply",
    applyClassName = "",
}) => {
    const editor = useFieldEditor({ fields, normalize, write });
    const { status, applyValue, isDisabled, statusMessage } = editor;

    const applyButton = ActionButton({
        label: applyLabel,
        status,
        disabled: isDisabled,
        variant: applyVariant,
        className: applyClassName,
        tooltip: applyTooltip,
        onClick: (e) => {
            e.preventDefault();
            void applyValue();
        },
    });

    const extraActions = typeof renderExtraActions === "function" ? toNodes(renderExtraActions(editor)) : [];

    return AccountRow({
        status,
        info,
        badge,
        rowClass,
        badgeClass,
        controlsClass,
        controls: [
            ...toNodes(renderControls(editor)),
            applyButton,
            ...extraActions,
            span({ class: "account-write-feedback", role: "status" }, statusMessage),
        ],
    });
};
