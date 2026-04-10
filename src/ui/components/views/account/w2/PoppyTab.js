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
import { gga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { formatNumber, parseNumber } from "../../../../utils/numberFormat.js";
import {
    RefreshErrorBanner,
    largeFormatter,
    largeParser,
    usePersistentPaneReady,
    useWriteStatus,
} from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;

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

    const inputVal = van.state(String(fieldState.val ?? 0));
    const { status, run } = useWriteStatus();

    let isFocused = false;

    van.derive(() => {
        const v = fieldState.val;
        if (v !== undefined && !isFocused) inputVal.val = String(v);
    });

    const resolveNum = (raw) => {
        if (isFormatted) {
            const n = parseNumber(raw);
            if (n !== null) return isFloat ? n : Math.round(n);
        }
        const n = Number(raw);
        return isNaN(n) ? null : isFloat ? n : Math.round(n);
    };

    const doSet = async (raw) => {
        const num = resolveNum(raw);
        if (num === null) return;
        await run(async () => {
            const ok = await onWrite(field.index, num);
            if (!ok) throw new Error(`Write mismatch at OptionsListAccount[${field.index}]: expected ${num}`);
            fieldState.val = num;
            inputVal.val = String(num);
        });
    };

    return div(
        {
            class: () =>
                [
                    "feature-row",
                    field.warn ? "feature-row--warn" : "",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__name" }, field.label),
            field.warn ? span({ class: "poppy-warn-badge" }, Icons.Warning(), ` ${field.warn}`) : null
        ),
        span({ class: `feature-row__badge ${field.live ? "feature-row__badge--highlight" : ""}` }, () => {
            const v = fieldState.val;
            if (v === undefined) return "-";
            return isFormatted ? formatNumber(v) : String(v);
        }),
        div(
            { class: "feature-row__controls poppy-row__controls--xl" },
            NumberInput({
                value: inputVal,
                mode: isFloat ? "float" : "int",
                ...(isFormatted ? { formatter: largeFormatter, parser: largeParser } : {}),
                onfocus: () => {
                    isFocused = true;
                },
                onblur: () => {
                    isFocused = false;
                },
                onDecrement: () => {
                    const cur = resolveNum(inputVal.val) ?? 0;
                    inputVal.val = String(Math.max(0, cur - step));
                },
                onIncrement: () => {
                    const cur = resolveNum(inputVal.val) ?? 0;
                    inputVal.val = String(cur + step);
                },
            }),
            withTooltip(
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick: () => doSet(inputVal.val),
                        disabled: () => status.val === "loading",
                    },
                    () => (status.val === "loading" ? "..." : "SET")
                ),
                `Write value to OptionsListAccount[${field.index}]`
            )
        )
    );
};

export const PoppyTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    const fieldStates = new Map(ALL_FIELDS.map((f) => [f.index, van.state(undefined)]));
    const renderRefreshErrorBanner = RefreshErrorBanner({ error: refreshError });

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        try {
            const results = await Promise.all(ALL_FIELDS.map((f) => gga(`OptionsListAccount[${f.index}]`)));
            ALL_FIELDS.forEach((f, i) => {
                fieldStates.get(f.index).val = results[i] ?? 0;
            });
            markReady();
        } catch (e) {
            const message = e?.message ?? "Failed to read Poppy data";
            if (!initialized.val) error.val = message;
            else refreshError.val = message;
        } finally {
            loading.val = false;
        }
    };

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

    return div(
        { class: "poppy-tab tab-container" },
        div(
            { class: "feature-header" },
            div(
                null,
                h3("POPPY"),
                p({ class: "feature-header__desc" }, "Poppy clicker values and Tar Pit progression controls")
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: () => load() }, "REFRESH"),
                "Re-read Poppy data from game"
            )
        ),

        div(
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

        renderRefreshErrorBanner,
        () =>
            loading.val && !initialized.val
                ? div({ class: "feature-loader" }, Loader({ text: "READING POPPY" }))
                : null,
        () =>
            !loading.val && error.val && !initialized.val
                ? EmptyState({ icon: Icons.SearchX(), title: "POPPY READ FAILED", subtitle: error.val })
                : null,
        rowList
    );
};
