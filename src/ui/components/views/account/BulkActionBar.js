import van from "../../../vendor/van-1.6.0.js";
import { NumberInput } from "../../NumberInput.js";
import { ActionButton } from "./components/ActionButton.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { toNodes } from "./accountShared.js";

const { div, span, select, option } = van.tags;

const SetAllApplyButton = ({ label, status, onApply }) =>
    onApply
        ? ActionButton({
              label,
              status,
              onClick: async (e) => {
                  e.preventDefault();
                  await onApply();
              },
          })
        : null;

/**
 * Shared header action strip for bulk account-page actions.
 */
export const BulkActionBar = ({ leading = null, actions = [], refresh = null }) =>
    div(
        { class: "account-header__actions" },
        ...toNodes(leading),
        ...actions
            .filter((action) => action && typeof action.onClick === "function")
            .map((action) =>
                ActionButton({
                    label: action.label,
                    status: action.status,
                    variant: action.variant ?? "max-reset",
                    className: action.extraClass ?? "",
                    disabled: action.disabled ?? false,
                    tooltip: action.tooltip ?? null,
                    onClick: (e) => action.onClick(e),
                    preventMouseDown: action.preventMouseDown !== false,
                })
            ),
        refresh
            ? RefreshButton({
                  onRefresh: refresh.onClick,
                  tooltip: refresh.tooltip ?? null,
                  disabled: refresh.disabled ?? false,
              })
            : null
    );

export const SetAllNumberControl = ({
    label,
    value,
    status = null,
    applyLabel = "SET ALL",
    onApply = null,
    min = 0,
    max = Infinity,
}) =>
    div(
        { class: "account-setall-row" },
        span({ class: "account-setall-row__label" }, label),
        div(
            { class: "account-setall-row__input" },
            NumberInput({
                mode: "int",
                value,
                oninput: (e) => (value.val = e.target.value),
                onDecrement: () => {
                    const n = Number(value.val);
                    const base = Number.isFinite(n) ? n : min;
                    value.val = String(Math.max(min, base - 1));
                },
                onIncrement: () => {
                    const n = Number(value.val);
                    const base = Number.isFinite(n) ? n : min;
                    value.val = String(Math.min(max, base + 1));
                },
            })
        ),
        SetAllApplyButton({ label: applyLabel, status, onApply })
    );

export const SetAllSelectControl = ({ label, value, options, status = null, applyLabel = "SET ALL", onApply }) =>
    div(
        { class: "account-setall-row" },
        span({ class: "account-setall-row__label" }, label),
        select(
            {
                class: "select-base account-setall-row__select",
                onchange: (e) => (value.val = e.target.value),
            },
            ...options.map((entry) =>
                option({ value: entry.value, selected: () => String(value.val) === String(entry.value) }, entry.label)
            )
        ),
        SetAllApplyButton({ label: applyLabel, status, onApply })
    );
