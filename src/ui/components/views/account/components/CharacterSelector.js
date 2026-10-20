import van from "../../../../vendor/van-1.6.0.js";
import { createStaticRowReconciler } from "../accountShared.js";

const { div, label, select, option } = van.tags;

/** Keep the character control stable while its roster and selected value refresh. */
export const createCharacterSelector = ({ id, selected, disabled, onChange, info, getValue = (name) => name }) => {
    const control = select({
        id,
        class: "select-base",
        value: selected,
        disabled,
        onchange: onChange,
    });
    const reconcileOptions = createStaticRowReconciler(control);

    return {
        node: div(
            { class: "content-stack account-character-selector" },
            div(
                { class: "account-setall-row" },
                label({ for: id, class: "account-setall-row__label" }, "CHARACTER"),
                control
            ),
            div({ class: "account-character-selector__info" }, info)
        ),
        setCharacters: (names) => {
            reconcileOptions(JSON.stringify(names), () =>
                names.map((name, index) => option({ value: getValue(name, index) }, name))
            );
            control.value = String(selected.val);
        },
    };
};
