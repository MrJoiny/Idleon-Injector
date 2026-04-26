import van from "../../../../vendor/van-1.6.0.js";
import { AccountSection } from "./AccountSection.js";
import { ActionButton } from "./ActionButton.js";

const { div, span, select, option } = van.tags;

/**
 * Shared "add from dropdown" section used by collection-style account tabs.
 */
export const AddFromListSection = ({
    title,
    note,
    selectLabel,
    selectedValue,
    options,
    emptyOptionLabel,
    getOptionValue,
    getOptionLabel,
    addStatus,
    addDisabled,
    addAllDisabled,
    onAdd,
    onAddAll,
    rowClass = "tab-add-row tab-add-row--dual-action",
}) => {
    van.derive(() => {
        const optionValues = options.val.map((entry) => getOptionValue(entry));
        const nextValue =
            optionValues.find((value) => String(value) === String(selectedValue.val)) ?? optionValues[0] ?? "";
        if (String(selectedValue.val) !== String(nextValue)) selectedValue.val = nextValue;
    });

    return AccountSection({
        title,
        note,
        body: div(
            { class: rowClass },
            span({ class: "tab-add-row__label" }, selectLabel),
            () =>
                select(
                    {
                        class: "select-base tab-add-row__select",
                        value: selectedValue,
                        onchange: (e) => (selectedValue.val = e.target.value),
                    },
                    ...(options.val.length === 0
                        ? [option({ value: "" }, emptyOptionLabel)]
                        : options.val.map((entry) => option({ value: getOptionValue(entry) }, getOptionLabel(entry))))
                ),
            ActionButton({
                label: "ADD",
                status: addStatus,
                disabled: addDisabled,
                onClick: onAdd,
            }),
            ActionButton({
                label: "ADD ALL",
                status: addStatus,
                variant: "danger",
                disabled: addAllDisabled,
                onClick: onAddAll,
            })
        ),
    });
};
