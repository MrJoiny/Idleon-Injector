import van from "../../../../vendor/van-1.6.0.js";
import { ActionButton } from "./ActionButton.js";
import { AccountRow } from "./AccountRow.js";
import { useWriteStatus } from "../accountShared.js";

const { div, span } = van.tags;

/**
 * Shared removable stored-item row used by collection-style account tabs.
 */
export const RemovableStoredRow = ({
    index,
    primaryLabel,
    fallbackLabel,
    secondaryLabel,
    badge,
    rowClass = "",
    nameGroupClass = "",
    onRemove,
    isBusy = () => false,
}) => {
    const { status, run } = useWriteStatus();

    const removeRow = async () => {
        await run(async () => {
            await onRemove(index);
        });
    };

    return AccountRow({
        rowClass,
        info: [
            span({ class: "account-row__index" }, `#${index + 1}`),
            div(
                { class: nameGroupClass },
                span({ class: "account-row__name" }, primaryLabel || fallbackLabel),
                span({ class: "account-row__sub-label" }, secondaryLabel)
            ),
        ],
        badge,
        controls: ActionButton({
            label: "REMOVE",
            status,
            variant: "danger",
            disabled: () => isBusy(),
            onClick: removeRow,
        }),
    });
};
