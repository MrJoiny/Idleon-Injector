import van from "../../../vendor/van-1.6.0.js";
import { EditableNumberRow } from "./EditableNumberRow.js";
import {
    adjustFormattedIntInput,
    largeFormatter,
    largeParser,
    resolveNumberInput,
    toNodes,
    writeVerified,
} from "./accountShared.js";

const { div, span } = van.tags;

/**
 * Shared single-value account row backed by one writable GGA path.
 *
 * @param {{ entry: object, valueState: object }} props
 * @returns {HTMLElement}
 */
export const SimpleNumberRow = ({ entry, valueState }) => {
    const formatted = entry.formatted ?? true;
    const min = entry.min ?? 0;
    const max = entry.max ?? Infinity;
    const float = entry.float ?? false;

    return EditableNumberRow({
        valueState,
        normalize: (rawValue) =>
            resolveNumberInput(rawValue, {
                formatted,
                float,
                min,
                max,
                fallback: null,
            }),
        write: (nextValue) => writeVerified(entry.path, nextValue),
        renderInfo: () => {
            const indexLabel =
                entry.indexLabel ?? (entry.index === null || entry.index === undefined ? null : `#${entry.index}`);
            const info = [];
            const nameGroup = div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                ...toNodes(entry.subLabel ? span({ class: "account-row__sub-label" }, entry.subLabel) : null)
            );

            if (entry.showIndex !== false && indexLabel) info.push(span({ class: "account-row__index" }, indexLabel));
            info.push(...toNodes(typeof entry.leading === "function" ? entry.leading() : entry.leading));
            info.push(nameGroup);
            return info;
        },
        renderBadge: (currentValue) =>
            typeof entry.badge === "function" ? entry.badge(currentValue) : largeFormatter(currentValue ?? 0),
        adjustInput: (rawValue, delta, currentValue) =>
            formatted
                ? adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min, max })
                : Math.max(
                      min,
                      Math.min(
                          max,
                          resolveNumberInput(rawValue, {
                              float,
                              min,
                              max,
                              fallback: currentValue ?? 0,
                          }) + delta
                      )
                  ),
        maxAction: entry.maxAction ?? null,
        resetAction: entry.resetAction ?? null,
        rowClass: entry.rowClass ?? "account-row--wide-controls",
        badgeClass: entry.badgeClass ?? "",
        controlsClass: entry.controlsClass ?? "account-row__controls--xl",
        inputMode: entry.inputMode ?? (float ? "float" : "int"),
        inputProps: formatted ? { formatter: largeFormatter, parser: largeParser } : {},
    });
};
