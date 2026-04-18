/**
 * W2 - Poppy Tab
 *
 * Reads/writes selected OptionsListAccount indices for Poppy and Tar Pit.
 *
 * Notes:
 * - Built in the same style as Orion (per-row write status + persistent list).
 * - Tar Pit and Spiral Upgrades are explicitly separated with section dividers.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries } from "../../../../services/api.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { formatNumber, parseNumber } from "../../../../utils/numberFormat.js";
import { runPersistentAccountLoad } from "../accountLoadPolicy.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { largeFormatter, largeParser, usePersistentPaneReady } from "../featureShared.js";

const { div, button, span } = van.tags;

const PINNED_FIELDS = [
    { index: 271, label: "Poppy Permanent Bonus Level", warn: "Permanent bonus - keep between 70-90" },
    { index: 274, label: "Fisheroo Reset Level", warn: "Keep reasonable, around 30-40" },
    { index: 279, label: "Greatest Catch / Megafish Progression", warn: "Permanent progression - edit carefully" },
];

const CORE_FIELDS = [
    { index: 267, label: "Bluefin Fish Owned", live: true, formatted: true },
    { index: 268, label: "Tasty Fishbait Level" },
    { index: 269, label: "Quick Reeling Level" },
    { index: 270, label: "Shiny Lure Level" },
    { index: 272, label: "Fishy Discount Level" },
    { index: 273, label: "Juicy Worm Level" },
    { index: 275, label: "Fishing Buddy Level" },
    { index: 276, label: "Lightning Quickness Level" },
    { index: 277, label: "Fisheroo Investing Level" },
    { index: 278, label: "Multihook Fishing Level" },
    { index: 280, label: "Lifetime Bluefin Caught", live: true, formatted: true },
    { index: 281, label: "Shiny/Fish Counter 1", formatted: true },
    { index: 282, label: "Shiny/Fish Counter 2", formatted: true },
    { index: 283, label: "Shiny/Fish Counter 3", formatted: true },
    { index: 284, label: "Shiny/Fish Counter 4", formatted: true },
    { index: 285, label: "Shiny/Fish Counter 5", formatted: true },
    { index: 286, label: "Shiny/Fish Counter 6", formatted: true },
    { index: 289, label: "Shiny Progress Bar", float: true },
];

const SPIRAL_FIELDS = [
    { index: 290, label: "Reset Points", formatted: true },
    { index: 291, label: "Reset Spiral Upgrade 1" },
    { index: 292, label: "Reset Spiral Upgrade 2" },
    { index: 293, label: "Reset Spiral Upgrade 3" },
    { index: 294, label: "Reset Spiral Upgrade 4" },
    { index: 295, label: "Reset Spiral Upgrade 5" },
];

const TAR_PIT_FIELDS = [
    { index: 296, label: "Tartar Fish Owned", live: true, formatted: true },
    { index: 297, label: "Tar Pit Upgrade 1: Super Yummy Bait" },
    { index: 298, label: "Tar Pit Upgrade 2: Bonus Catching" },
    { index: 299, label: "Tar Pit Upgrade 3: Bluefin Frenzy" },
    { index: 300, label: "Tar Pit Upgrade 4: Fishy Reductions" },
    { index: 301, label: "Tar Pit Upgrade 5: Super Tarbait" },
    { index: 302, label: "Tar Pit Upgrade 6: Tarrific Resets" },
    { index: 303, label: "Tar Pit Upgrade 7: Mongo Multipliers" },
    { index: 304, label: "Tar Pit Upgrade 8: King Worm" },
];

const ALL_FIELDS = [...PINNED_FIELDS, ...CORE_FIELDS, ...SPIRAL_FIELDS, ...TAR_PIT_FIELDS];

const PoppyRow = ({ field, fieldState, onWrite }) => {
    const isFormatted = field.formatted || field.float;
    const isFloat = field.float;
    const step = isFloat ? 0.1 : 1;

    const resolveNum = (raw) => {
        if (isFormatted) {
            const n = parseNumber(raw);
            if (n !== null) return isFloat ? n : Math.round(n);
        }
        const n = Number(raw);
        return isNaN(n) ? null : isFloat ? n : Math.round(n);
    };

    return EditableNumberRow({
        valueState: fieldState,
        normalize: (rawValue) => resolveNum(rawValue),
        write: async (nextValue) => {
            const ok = await onWrite(field.index, nextValue);
            if (!ok) throw new Error(`Write mismatch at OptionsListAccount[${field.index}]: expected ${nextValue}`);
            return nextValue;
        },
        renderInfo: () => [
            span({ class: "feature-row__name" }, field.label),
            field.warn ? span({ class: "poppy-warn-badge" }, Icons.Warning(), ` ${field.warn}`) : null,
        ],
        renderBadge: (currentValue) => {
            if (currentValue === undefined) return "-";
            return isFormatted ? formatNumber(currentValue) : String(currentValue);
        },
        rowClass: () => (field.warn ? "feature-row--warn" : ""),
        badgeClass: () => (field.live ? "feature-row__badge--highlight" : ""),
        controlsClass: "poppy-row__controls--xl",
        inputMode: isFloat ? "float" : "int",
        inputProps: isFormatted ? { formatter: largeFormatter, parser: largeParser } : {},
        adjustInput: (rawValue, delta) => {
            const cur = resolveNum(rawValue) ?? 0;
            return Math.max(0, cur + step * delta);
        },
        wrapApplyButton: (applyButton) =>
            withTooltip(applyButton, `Write value to OptionsListAccount[${field.index}]`),
    });
};

export const PoppyTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    const fieldStates = new Map(ALL_FIELDS.map((f) => [f.index, van.state(undefined)]));
    const load = async () =>
        runPersistentAccountLoad(
            {
                loading,
                error,
                refreshError,
                initialized,
                markReady,
                label: "Poppy",
            },
            async () => {
                const keys = ALL_FIELDS.map((f) => String(f.index));
                const results = await readGgaEntries("OptionsListAccount", keys);
                for (const f of ALL_FIELDS) {
                    fieldStates.get(f.index).val = results[String(f.index)] ?? 0;
                }
            }
        );

    const onWrite = async (index, value) => {
        return gga(`OptionsListAccount[${index}]`, value);
    };

    const rowList = div(
        { class: () => paneClass("feature-list poppy-list") },
        div({ class: "poppy-section-label" }, Icons.Warning(), " Permanent / Sensitive"),
        ...PINNED_FIELDS.map((f) => PoppyRow({ field: f, fieldState: fieldStates.get(f.index), onWrite })),
        div({ class: "poppy-section-label" }, "Main Poppy Progress"),
        ...CORE_FIELDS.map((f) => PoppyRow({ field: f, fieldState: fieldStates.get(f.index), onWrite })),
        div({ class: "poppy-section-label poppy-section-label--spiral" }, "Spiral Upgrades"),
        ...SPIRAL_FIELDS.map((f) => PoppyRow({ field: f, fieldState: fieldStates.get(f.index), onWrite })),
        div({ class: "poppy-section-label poppy-section-label--tar" }, "Tar Pit"),
        ...TAR_PIT_FIELDS.map((f) => PoppyRow({ field: f, fieldState: fieldStates.get(f.index), onWrite }))
    );

    load();

    return AccountPageShell({
        rootClass: "poppy-tab tab-container feature-tab-frame",
        header: FeatureTabHeader({
            title: "POPPY",
            description: "Poppy clicker values and Tar Pit progression controls",
            actions: withTooltip(
                button({ class: "btn-secondary", onclick: () => load() }, "REFRESH"),
                "Re-read Poppy data from game"
            ),
        }),
        topNotices: div(
            { class: "warning-banner" },
            Icons.Warning(),
            " ",
            span({ class: "warning-highlight-accent" }, "Poppy Permanent Bonus"),
            " should stay around 70-90, and ",
            span({ class: "warning-highlight-accent" }, "Fisheroo Reset"),
            " should stay around 30-40. ",
            span({ class: "warning-highlight-accent" }, "Greatest Catch / Megafish"),
            " is also permanent progression."
        ),
        persistentState: { loading, error, refreshError, initialized },
        persistentLoadingText: "READING POPPY",
        persistentErrorTitle: "POPPY READ FAILED",
        body: rowList,
    });
};
