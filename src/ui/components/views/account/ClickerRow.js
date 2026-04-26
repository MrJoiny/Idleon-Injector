import van from "../../../vendor/van-1.6.0.js";
import { Icons } from "../../../assets/icons.js";
import { withTooltip } from "../../Tooltip.js";
import { formatNumber, formattedStep } from "../../../utils/numberFormat.js";
import { EditableNumberRow } from "./EditableNumberRow.js";
import { largeFormatter, largeParser, resolveNumberInput, writeVerified } from "./accountShared.js";

const { span } = van.tags;

/**
 * Shared EditableNumberRow adapter for clicker-style OptionsListAccount fields.
 */
export const ClickerRow = ({
    field,
    fieldState,
    onWrite,
    warnBadgeClass,
    controlsClass,
    emptyBadge = "—",
}) => {
    const isFormatted = field.formatted || field.float;
    const isFloat = field.float;
    const parseInputValue = (raw) => resolveNumberInput(raw, { formatted: isFormatted, float: isFloat });

    return EditableNumberRow({
        valueState: fieldState,
        normalize: (rawValue) => parseInputValue(rawValue),
        write: async (nextValue) => {
            return writeVerified(`OptionsListAccount[${field.index}]`, nextValue, {
                write: (_path, value) => onWrite(field.index, value),
            });
        },
        renderInfo: () => [
            span({ class: "account-row__name" }, field.label),
            field.warn ? span({ class: warnBadgeClass }, Icons.Warning(), ` ${field.warn}`) : null,
        ],
        renderBadge: (currentValue) => {
            if (currentValue === undefined) return emptyBadge;
            return isFormatted ? formatNumber(currentValue) : String(currentValue);
        },
        rowClass: () => (field.warn ? "has-warning" : ""),
        badgeClass: () => (field.live ? "account-row__badge--highlight" : ""),
        controlsClass,
        inputMode: isFloat ? "float" : "int",
        inputProps: isFormatted ? { formatter: largeFormatter, parser: largeParser } : {},
        adjustInput: (rawValue, delta) => {
            const cur = parseInputValue(rawValue) ?? 0;
            const step = field.formatted ? formattedStep(cur) : isFloat ? 0.1 : 1;
            return Math.max(0, cur + step * delta);
        },
        wrapApplyButton: (applyButton) => withTooltip(applyButton, `Write value to OptionsListAccount[${field.index}]`),
    });
};
