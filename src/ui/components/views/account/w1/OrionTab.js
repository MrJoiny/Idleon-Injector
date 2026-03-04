/**
 * W1 — Orion Tab
 *
 * Reads/writes OptionsListAccount indices 253–264.
 *
 * Index map:
 *   253 — Feathers (current count)
 *   254 — Feather Generation (upgrade level)
 *   255 — Bonuses of Orion  ⚠ permanent bonus — keep 70–90
 *   256 — Feather Multiplier
 *   257 — Feather Cheapener
 *   258 — Feather Restart   ⚠ permanent bonus — keep 30–40
 *   259 — Super Feather Production
 *   260 — Shiny Feathers
 *   261 — Super Feather Cheapener
 *   262 — The Great Mega Reset ⚠ permanent bonus — keep 70–90
 *   263 — Filler Bar (float, bar-fill progress 0–1)
 *   264 — Shiny Feathers (count)
 *
 * Architecture:
 *   - One van.state per field. Writing a value updates only that field's badge;
 *     it never triggers a list-level re-render.
 *   - rowList is built once and stays permanently in the DOM (hidden via
 *     display:none while loading). This keeps VanJS reactive bindings alive
 *     across refreshes — if rowList were removed and re-inserted, VanJS would
 *     GC the badge closures and they'd stop updating.
 *   - isFocused is a single boolean shared between OrionRow and NumberInput via
 *     onfocus/onblur props. It prevents the fieldState → inputVal derive from
 *     overwriting in-progress user input.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { formatNumber, parseNumber } from "../../../../utils/numberFormat.js";

const { div, button, span, h3, p } = van.tags;

// ── Field definitions ─────────────────────────────────────────────────────
//
// formatted  — show badge + input using formatNumber/parseNumber (large numbers)
// float      — allow decimals (implies formatted)
// live       — highlight the badge
// warn       — show caution badge with message

const PINNED = [
    { index: 255, label: "Bonuses of Orion", warn: "Permanent bonus — keep between 70–90" },
    { index: 262, label: "The Great Mega Reset", warn: "Permanent bonus — keep between 70–90" },
];

const FIELDS = [
    { index: 253, label: "Feathers", live: true, formatted: true },
    { index: 254, label: "Feather Generation" },
    { index: 256, label: "Feather Multiplier" },
    { index: 257, label: "Feather Cheapener" },
    { index: 258, label: "Feather Restart", warn: "Keep between 30–40" },
    { index: 259, label: "Super Feather Production" },
    { index: 260, label: "Shiny Feathers" },
    { index: 261, label: "Super Feather Cheapener" },
    { index: 263, label: "Filler Bar", float: true },
    { index: 264, label: "Shiny Feathers (count)" },
];

const ALL_FIELDS = [...PINNED, ...FIELDS];

// ── Formatter / parser (used by formatted + float fields) ─────────────────

const largeFormatter = (raw) => {
    const n = parseNumber(String(raw));
    return n !== null ? formatNumber(n) : String(raw);
};
const largeParser = (display) => {
    const n = parseNumber(display);
    return n !== null ? String(n) : null;
};

// ── OrionRow ──────────────────────────────────────────────────────────────

const OrionRow = ({ field, fieldState, onWrite }) => {
    const isFormatted = field.formatted || field.float;
    const isFloat = field.float;
    const step = isFloat ? 0.1 : 1;

    const inputVal = van.state(String(fieldState.val ?? 0));
    const status = van.state(null);

    // isFocused is set by onfocus/onblur forwarded from NumberInput.
    // It prevents the derive below from stomping on in-progress user input.
    let isFocused = false;

    // When fieldState changes (load / refresh / doSet), push the new value into
    // the input — but only when the user isn't actively typing.
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
        status.val = "loading";
        try {
            await onWrite(field.index, num);
            fieldState.val = num; // only this row's badge re-renders
            inputVal.val = String(num);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
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
            field.warn ? span({ class: "orion-warn-badge" }, Icons.Warning(), ` ${field.warn}`) : null
        ),
        span({ class: `feature-row__badge ${field.live ? "feature-row__badge--highlight" : ""}` }, () => {
            const v = fieldState.val;
            if (v === undefined) return "—";
            return isFormatted ? formatNumber(v) : String(v);
        }),
        div(
            { class: "feature-row__controls feature-row__controls--xl" },
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

// ── OrionTab ──────────────────────────────────────────────────────────────

export const OrionTab = () => {
    const loading = van.state(true);
    const error = van.state(null);

    const fieldStates = new Map(ALL_FIELDS.map((f) => [f.index, van.state(undefined)]));

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const results = await Promise.all(ALL_FIELDS.map((f) => readGga(`OptionsListAccount[${f.index}]`)));
            ALL_FIELDS.forEach((f, i) => {
                fieldStates.get(f.index).val = results[i] ?? 0;
            });
        } catch (e) {
            error.val = e.message || "Failed to read Orion data";
        } finally {
            loading.val = false;
        }
    };

    const onWrite = async (index, value) => {
        await writeGga(`OptionsListAccount[${index}]`, value);
        fieldStates.get(index).val = value;
    };

    // Built once, stays in the DOM permanently.
    // Hidden via style while loading/errored so the user doesn't see stale data,
    // but never removed — removal would let VanJS GC the reactive badge closures.
    const rowList = div(
        { class: "feature-list", style: () => (loading.val || error.val ? "display:none" : "") },
        div({ class: "orion-section-label" }, Icons.Warning(), " Permanent Bonuses — Edit with care"),
        ...PINNED.map((f) => OrionRow({ field: f, fieldState: fieldStates.get(f.index), onWrite })),
        div({ class: "orion-section-label" }, "Upgrades & Stats"),
        ...FIELDS.map((f) => OrionRow({ field: f, fieldState: fieldStates.get(f.index), onWrite }))
    );

    load();

    return div(
        { class: "world-feature scroll-container" },
        div(
            { class: "feature-header" },
            div(
                null,
                h3("ORION"),
                p(
                    { class: "feature-header__desc" },
                    "Manage Orion the Great Horned Owl — loads once, refreshes after each set"
                )
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: () => load() }, "REFRESH"),
                "Re-read Orion data from game"
            )
        ),

        div(
            { class: "warning-banner" },
            Icons.Warning(),
            " ",
            span({ class: "warning-highlight-accent" }, "Bonuses of Orion"),
            " and ",
            span({ class: "warning-highlight-accent" }, "The Great Mega Reset"),
            " are permanent — keep values between 70–90. ",
            span({ class: "warning-highlight-accent" }, "Feather Restart"),
            " is permanent — keep between 30–40."
        ),

        () =>
            loading.val
                ? div({ class: "feature-list" }, div({ class: "feature-loader" }, Loader({ text: "READING ORION" })))
                : null,

        () =>
            !loading.val && error.val
                ? div(
                      { class: "feature-list" },
                      EmptyState({ icon: Icons.SearchX(), title: "ORION READ FAILED", subtitle: error.val })
                  )
                : null,

        rowList
    );
};
