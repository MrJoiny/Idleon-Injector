import van from "../../../vendor/van-1.6.0.js";
import { getNumberInputLiveRaw } from "../../NumberInput.js";
import { toNodes, useWriteStatus } from "./accountShared.js";
import { AccountRow } from "./components/AccountRow.js";
import { ActionButton } from "./components/ActionButton.js";

const defaultToDraft = (value) => String(value ?? 0);

/**
 * Shared editable row primitive for rows that stage multiple draft fields
 * before applying them in one write.
 *
 * `renderControls` must wire each NumberInput to `draftStates[field.key]`.
 * Formatted NumberInput controls must call `setFieldFocused(key, true)` on
 * focus and `setFieldFocused(key, false)` on blur so draft text is not reset
 * while the user is typing. Consumers may call `resetDraft(key)` on blur when
 * they want unsaved edits to snap back to the committed value.
 */
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
    const fieldByKey = new Map();
    const draftStates = {};
    const focusByKey = new Map();
    const { status, run } = useWriteStatus();

    const resetDraft = (key) => {
        const field = fieldByKey.get(key);
        if (!field) return;

        const toDraft = field.toDraft ?? defaultToDraft;
        draftStates[key].val = toDraft(field.valueState.val);
    };

    fields.forEach((field) => {
        fieldByKey.set(field.key, field);
        draftStates[field.key] = van.state((field.toDraft ?? defaultToDraft)(field.valueState.val));
        focusByKey.set(field.key, false);

        van.derive(() => {
            field.valueState.val;
            if (!focusByKey.get(field.key)) resetDraft(field.key);
        });
    });

    const getDraftValue = (key) => getNumberInputLiveRaw(draftStates[key]) ?? draftStates[key].val;
    const getDraftValues = () => Object.fromEntries(fields.map((field) => [field.key, getDraftValue(field.key)]));

    const applyValue = async (rawValues = getDraftValues()) => {
        const nextValues = normalize(rawValues);
        if (nextValues === null || nextValues === undefined) return;

        await run(async () => {
            const writtenValues = await write(nextValues);
            const appliedValues = writtenValues && typeof writtenValues === "object" ? writtenValues : nextValues;

            fields.forEach((field) => {
                if (Object.prototype.hasOwnProperty.call(appliedValues, field.key)) {
                    field.valueState.val = appliedValues[field.key];
                }
                resetDraft(field.key);
            });

            return appliedValues;
        });
    };

    const applyButton = ActionButton({
        label: applyLabel,
        status,
        variant: applyVariant,
        className: applyClassName,
        tooltip: applyTooltip,
        onClick: (e) => {
            e.preventDefault();
            void applyValue();
        },
    });

    const controlContext = {
        status,
        applyValue,
        draftStates,
        getDraftValue,
        resetDraft,
        setFieldFocused: (key, isFocused) => focusByKey.set(key, isFocused),
    };
    const extraActions = typeof renderExtraActions === "function" ? toNodes(renderExtraActions(controlContext)) : [];

    return AccountRow({
        status,
        info,
        badge,
        rowClass,
        badgeClass,
        controlsClass,
        controls: [...toNodes(renderControls(controlContext)), applyButton, ...extraActions],
    });
};
