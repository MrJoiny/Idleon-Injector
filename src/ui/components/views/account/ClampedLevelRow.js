import van from "../../../vendor/van-1.6.0.js";
import { EditableNumberRow } from "./EditableNumberRow.js";
import { resolveValue, toNum, writeVerified } from "./accountShared.js";

const { span } = van.tags;

const applyIntegerMode = (value, integerMode) => {
    if (integerMode === "round") return Math.round(value);
    if (integerMode === "trunc") return Math.trunc(value);
    return value;
};

const toBound = (value, fallback) => {
    const n = Number(value);
    return Number.isNaN(n) ? fallback : n;
};

/**
 * Shared row adapter for single-path level fields with a 0..max clamp.
 */
export const ClampedLevelRow = ({
    valueState,
    writePath,
    write = null,
    max,
    min = 0,
    integerMode = null,
    renderInfo,
    indexLabel = null,
    name = null,
    renderBadge = null,
    rowClass = "",
    badgeClass = "",
    controlsClass = "",
    applyLabel = "SET",
    inputMode = "int",
    maxAction = null,
    wrapApplyButton = null,
    renderExtraActions = null,
}) => {
    const clamp = (value, fallback = null) => {
        const minValue = toBound(resolveValue(min), 0);
        const maxValue = toBound(resolveValue(max), minValue);
        const rawValue = Number(value);
        if (!Number.isFinite(rawValue)) return fallback;

        const nextValue = applyIntegerMode(rawValue, integerMode);
        return Math.max(minValue, Math.min(maxValue, nextValue));
    };

    const defaultInfo = () => [
        indexLabel !== null ? span({ class: "account-row__index" }, indexLabel) : null,
        name !== null ? span({ class: "account-row__name" }, name) : null,
    ];

    const resolvedMaxAction =
        maxAction === true
            ? {
                  value: resolveValue(max),
                  tooltip: `Set to max level (${resolveValue(max)})`,
              }
            : maxAction;

    return EditableNumberRow({
        valueState,
        normalize: (rawValue) => {
            const nextValue = clamp(rawValue);
            return Number.isNaN(nextValue) ? null : nextValue;
        },
        write: async (nextLevel) => {
            if (typeof write === "function") return write(nextLevel);

            const path = resolveValue(writePath);
            return writeVerified(path, nextLevel, { message: `Write mismatch at ${path}: expected ${nextLevel}` });
        },
        renderInfo: renderInfo ?? defaultInfo,
        renderBadge: renderBadge ?? ((currentValue) => `LV ${currentValue ?? 0} / ${resolveValue(max)}`),
        rowClass,
        badgeClass,
        controlsClass,
        applyLabel,
        inputMode,
        adjustInput: (rawValue, delta, currentValue) => {
            const nextValue = toNum(rawValue, toNum(currentValue, 0)) + delta;
            return clamp(nextValue, toNum(currentValue, 0));
        },
        maxAction: resolvedMaxAction,
        wrapApplyButton,
        renderExtraActions,
    });
};
