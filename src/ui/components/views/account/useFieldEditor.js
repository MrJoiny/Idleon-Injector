import van from "../../../vendor/van-1.6.0.js";
import { getNumberInputLiveRaw, setNumberInputValue } from "../../NumberInput.js";
import { resolveValue, useWriteStatus } from "./accountShared.js";

const defaultToDraft = (value) => String(value ?? 0);

/**
 * Share staged drafts and write outcomes across single-field and record editors.
 * Writers return every field's verified value, or { cancelled: true }; failures throw.
 * A failed or partially applied game write never commits submitted drafts locally.
 */
export const useFieldEditor = ({ fields, normalize, write, disabled = null, onApplied = null }) => {
    const fieldByKey = new Map(fields.map((field) => [field.key, field]));
    const draftStates = {};
    const focusByKey = new Map();
    const { status, run } = useWriteStatus();

    const resetDraft = (key) => {
        const field = fieldByKey.get(key);
        if (!field) return;
        setNumberInputValue(draftStates[key], (field.toDraft ?? defaultToDraft)(field.valueState.val));
    };

    fields.forEach((field) => {
        draftStates[field.key] = van.state((field.toDraft ?? defaultToDraft)(field.valueState.val));
        focusByKey.set(field.key, false);
        van.derive(() => {
            field.valueState.val;
            if (!focusByKey.get(field.key)) resetDraft(field.key);
        });
    });

    const getDraftValue = (key) => getNumberInputLiveRaw(draftStates[key]) ?? draftStates[key].val;
    const isDisabled = () => Boolean(resolveValue(disabled)) || status.val === "loading";

    const applyValue = async (
        rawValues = Object.fromEntries(fields.map((field) => [field.key, getDraftValue(field.key)]))
    ) => {
        if (isDisabled()) return;
        const next = normalize(rawValues);
        if (next === null || next === undefined || Number.isNaN(next)) return;

        return run(async () => {
            const verified = await write(next);
            if (verified?.cancelled) {
                fields.forEach((field) => resetDraft(field.key));
                return verified;
            }
            if (
                !verified ||
                typeof verified !== "object" ||
                fields.some(
                    (field) =>
                        !Object.prototype.hasOwnProperty.call(verified, field.key) ||
                        verified[field.key] === undefined ||
                        Number.isNaN(verified[field.key])
                )
            ) {
                throw new Error("Writer must return verified values for every field");
            }
            fields.forEach((field) => {
                field.valueState.val = verified[field.key];
                resetDraft(field.key);
            });
            if (typeof onApplied === "function") await onApplied(verified);
            return verified;
        });
    };

    return {
        draftStates,
        getDraftValue,
        resetDraft,
        setFieldFocused: (key, isFocused) => focusByKey.set(key, isFocused),
        status,
        run,
        isDisabled,
        applyValue,
        statusMessage: () => ({ loading: "Saving", success: "Saved", error: "Action failed" })[status.val] ?? "",
    };
};
