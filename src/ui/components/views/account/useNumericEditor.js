import { useFieldEditor } from "./useFieldEditor.js";

/** Own numeric drafts and commit only a writer's verified value or cancellation. */
export const useNumericEditor = ({ valueState, normalize, write, format, disabled = null, onApplied = null }) => {
    const editor = useFieldEditor({
        fields: [{ key: "value", valueState, toDraft: format }],
        normalize: ({ value }) => {
            const next = normalize(value);
            return next === null || next === undefined || Number.isNaN(next) ? null : { value: next };
        },
        write: async ({ value }) => {
            const verified = await write(value);
            return verified?.cancelled ? verified : { value: verified };
        },
        disabled,
        onApplied: typeof onApplied === "function" ? ({ value }) => onApplied(value) : null,
    });

    return {
        inputValue: editor.draftStates.value,
        status: editor.status,
        run: editor.run,
        isDisabled: editor.isDisabled,
        applyValue: async (rawValue) => {
            const outcome = await editor.applyValue(rawValue === undefined ? undefined : { value: rawValue });
            return outcome?.ok ? { ...outcome, result: outcome.result.value } : outcome;
        },
        focus: () => editor.setFieldFocused("value", true),
        blur: () => {
            editor.setFieldFocused("value", false);
            editor.resetDraft("value");
        },
        statusMessage: editor.statusMessage,
    };
};
