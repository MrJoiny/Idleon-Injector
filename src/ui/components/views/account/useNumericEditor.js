import van from "../../../vendor/van-1.6.0.js";
import { getNumberInputLiveRaw, setNumberInputValue } from "../../NumberInput.js";
import { resolveValue, useWriteStatus } from "./accountShared.js";

/** Own numeric drafts and commit only a writer's verified value or cancellation. */
export const useNumericEditor = ({ valueState, normalize, write, format, disabled = null, onApplied = null }) => {
    const inputValue = van.state(format(valueState.val));
    const { status, run } = useWriteStatus();
    let isFocused = false;

    const syncInputToCommitted = () => {
        setNumberInputValue(inputValue, format(valueState.val));
    };

    van.derive(() => {
        valueState.val;
        if (!isFocused) syncInputToCommitted();
    });

    const isDisabled = () => Boolean(resolveValue(disabled)) || status.val === "loading";

    const applyValue = async (rawValue = getNumberInputLiveRaw(inputValue) ?? inputValue.val) => {
        if (isDisabled()) return;
        const next = normalize(rawValue);
        if (next === null || next === undefined || Number.isNaN(next)) return;

        return run(async () => {
            const verified = await write(next);
            if (verified?.cancelled) {
                syncInputToCommitted();
                return verified;
            }
            valueState.val = verified;
            setNumberInputValue(inputValue, format(verified));
            if (typeof onApplied === "function") await onApplied(verified);
            return verified;
        });
    };

    return {
        inputValue,
        status,
        run,
        isDisabled,
        applyValue,
        focus: () => {
            isFocused = true;
        },
        blur: () => {
            isFocused = false;
            syncInputToCommitted();
        },
        statusMessage: () => ({ loading: "Saving", success: "Saved", error: "Action failed" })[status.val] ?? "",
    };
};
