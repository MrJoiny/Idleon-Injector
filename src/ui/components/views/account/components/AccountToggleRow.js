import van from "../../../../vendor/van-1.6.0.js";
import { useWriteStatus } from "../accountShared.js";
import { AccountRow } from "./AccountRow.js";

const { input, label, span } = van.tags;

/**
 * Shared toggle row that keeps native checkbox state aligned with committed data.
 */
export const AccountToggleRow = ({ info, badge, checked, rowClass = "", title, write, controlsClass = "" }) => {
    const { status, run } = useWriteStatus();
    const isChecked = () => Boolean(typeof checked === "function" ? checked() : checked.val);
    let checkboxNode = null;

    const syncCheckbox = () => {
        if (checkboxNode) checkboxNode.checked = isChecked();
    };

    checkboxNode = input({
        type: "checkbox",
        checked: isChecked(),
        disabled: () => status.val === "loading",
        onchange: (e) => {
            const nextChecked = e.target.checked;
            void run(() => write(nextChecked), {
                onSuccess: syncCheckbox,
                onError: syncCheckbox,
            }).then(syncCheckbox);
        },
    });

    van.derive(() => {
        isChecked();
        syncCheckbox();
    });

    return AccountRow({
        info,
        badge,
        rowClass,
        status,
        controlsClass,
        controls: label({ class: "toggle-switch", title }, checkboxNode, span({ class: "slider" })),
    });
};
