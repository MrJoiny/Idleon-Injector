import van from "../../../vendor/van-1.6.0.js";
import { getNumberInputLiveRaw, NumberInput } from "../../NumberInput.js";
import { ActionButton } from "./components/ActionButton.js";
import { toNodes, useWriteStatus } from "./accountShared.js";

const { div, span } = van.tags;

/**
 * Shared numeric editor row with focus-safe local input state.
 *
 * Contract:
 * - `valueState` holds committed value only.
 * - While input is focused, external valueState updates do not overwrite draft text.
 * - On blur without SET, draft text snaps back to committed value.
 * - `write(next)` must resolve to verified value; primitive applies that result.
 */
export const EditableNumberRow = ({
    valueState,
    normalize,
    write,
    renderInfo,
    renderBadge,
    adjustInput = (rawValue, delta, currentValue) => {
        const base = Number(rawValue);
        const next = Number.isFinite(base) ? base : Number(currentValue ?? 0);
        return next + delta;
    },
    maxAction = null,
    resetAction = null,
    renderExtraActions = null,
    wrapApplyButton = null,
    rowClass = "",
    badgeClass = "",
    controlsClass = "",
    inputMode = "int",
    applyLabel = "SET",
    inputProps = {},
}) => {
    const {
        onfocus: userOnfocus,
        onblur: userOnblur,
        onDecrement: userOnDecrement,
        onIncrement: userOnIncrement,
        formatter,
        ...restInputProps
    } = inputProps;
    const formatCommittedValue = (value) =>
        typeof formatter === "function" ? formatter(value ?? 0) : String(value ?? 0);
    const inputValue = van.state(formatCommittedValue(valueState.val));
    const { status, run } = useWriteStatus();
    let isInputFocused = false;

    const syncInputToCommitted = () => {
        inputValue.val = formatCommittedValue(valueState.val);
    };

    van.derive(() => {
        valueState.val;
        if (!isInputFocused) syncInputToCommitted();
    });

    const applyValue = async (rawValue = getNumberInputLiveRaw(inputValue) ?? inputValue.val) => {
        const next = normalize(rawValue);
        if (next === null || next === undefined || Number.isNaN(next)) return;

        await run(async () => {
            const verified = await write(next);
            valueState.val = verified;
            inputValue.val = formatCommittedValue(verified);
            return verified;
        });
    };

    const applyButton = ActionButton({
        label: () => (typeof applyLabel === "function" ? applyLabel() : applyLabel),
        status,
        onClick: (e) => {
            e.preventDefault();
            void applyValue();
        },
    });

    const renderBuiltInAction = (action, fallbackLabel, fallbackValue) => {
        if (!action) return null;

        const actionValue = action.value ?? fallbackValue;
        const actionLabel = action.label ?? fallbackLabel;
        const actionButton = ActionButton({
            label: () => (typeof actionLabel === "function" ? actionLabel() : actionLabel),
            status,
            variant: "max-reset",
            tooltip: action.tooltip ?? null,
            onClick: (e) => {
                e.preventDefault();
                void applyValue(actionValue);
            },
        });

        return actionButton;
    };

    const wrappedApplyButton = typeof wrapApplyButton === "function" ? wrapApplyButton(applyButton) : applyButton;
    const builtInMaxAction = renderBuiltInAction(maxAction, "MAX");
    const builtInResetAction = renderBuiltInAction(resetAction, "RESET", 0);
    const extraActions =
        typeof renderExtraActions === "function"
            ? toNodes(
                  renderExtraActions({
                      status,
                      run,
                      inputValue,
                      applyValue,
                  })
              )
            : [];

    return div(
        {
            class: () =>
                [
                    "account-row",
                    typeof rowClass === "function" ? rowClass() : rowClass,
                    status.val === "success" ? "account-row--success" : "",
                    status.val === "error" ? "account-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div({ class: "account-row__info" }, ...toNodes(renderInfo())),
        span(
            {
                class: () =>
                    ["account-row__badge", typeof badgeClass === "function" ? badgeClass() : badgeClass]
                        .filter(Boolean)
                        .join(" "),
            },
            () => renderBadge(valueState.val)
        ),
        div(
            {
                class: () =>
                    ["account-row__controls", typeof controlsClass === "function" ? controlsClass() : controlsClass]
                        .filter(Boolean)
                        .join(" "),
            },
            NumberInput({
                mode: inputMode,
                value: inputValue,
                formatter,
                ...restInputProps,
                onfocus: () => {
                    isInputFocused = true;
                    if (typeof userOnfocus === "function") userOnfocus();
                },
                onblur: () => {
                    isInputFocused = false;
                    syncInputToCommitted();
                    if (typeof userOnblur === "function") userOnblur();
                },
                onDecrement: () => {
                    inputValue.val = String(
                        adjustInput(getNumberInputLiveRaw(inputValue) ?? inputValue.val, -1, valueState.val ?? 0)
                    );
                    if (typeof userOnDecrement === "function") userOnDecrement();
                },
                onIncrement: () => {
                    inputValue.val = String(
                        adjustInput(getNumberInputLiveRaw(inputValue) ?? inputValue.val, 1, valueState.val ?? 0)
                    );
                    if (typeof userOnIncrement === "function") userOnIncrement();
                },
            }),
            wrappedApplyButton,
            ...toNodes(builtInMaxAction),
            ...toNodes(builtInResetAction),
            ...extraActions
        )
    );
};
