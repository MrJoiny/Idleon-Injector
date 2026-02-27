/**
 * W1 — Orion Tab
 *
 * Reads/writes OptionsListAccount indices 253–264.
 *
 * Index map:
 *   253 — Feathers (current count)
 *   254 — Feather Generation (upgrade level)
 *   255 — Bonuses of Orion  ⚠ permanent bonus — keep 70-90
 *   256 — Feather Multiplier
 *   257 — Feather Cheapener
 *   258 — Feather Restart   ⚠ permanent bonus — keep 30-40
 *   259 — Super Feather Production
 *   260 — Shiny Feathers
 *   261 — Super Feather Cheapener
 *   262 — The Great Mega Reset ⚠ permanent bonus — keep 70-90
 *   263 — Unknown (float, likely bar-fill progress)
 *   264 — Shiny Feathers (count)
 *
 * UI order: 255 and 258 pinned at top (permanent bonuses), rest below.
 */

import van from "../../../../vendor/van-1.6.0.js";
import * as API from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { withTooltip } from "../../../Tooltip.js";
import { formatNumber } from "../../../../utils/numberFormat.js";

const { div, button, span, h3, p } = van.tags;

// ── Field definitions ─────────────────────────────────────────────────────
// warn: show a caution badge with a safe-range hint

const PINNED = [
    { index: 255, label: "Bonuses of Orion",       warn: "Permanent bonus — keep between 70–90" },
    { index: 262, label: "The Great Mega Reset",    warn: "Permanent bonus — keep between 70–90" },
];

const FIELDS = [
    { index: 253, label: "Feathers",                  live: true,  large: true  },
    { index: 254, label: "Feather Generation"                     },
    { index: 256, label: "Feather Multiplier"                     },
    { index: 257, label: "Feather Cheapener"                      },
    { index: 258, label: "Feather Restart",            warn: "Keep between 30–40" },
    { index: 259, label: "Super Feather Production"               },
    { index: 260, label: "Shiny Feathers"                         },
    { index: 261, label: "Super Feather Cheapener"                },
    { index: 263, label: "Filler Bar",                 large: true              },
    { index: 264, label: "Shiny Feathers (count)",    large: true              },
];

// ── OrionRow ──────────────────────────────────────────────────────────────

const OrionRow = ({ field, values, onWrite }) => {
    const inputVal = van.state(String(values.val?.[field.index] ?? 0));
    const status   = van.state(null);

    const doSet = async (raw) => {
        const num = Number(raw);
        if (isNaN(num)) return;
        status.val = "loading";
        try {
            await onWrite(field.index, num);
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
                `feature-row ${field.warn ? "feature-row--warn" : ""} ${
                    status.val === "success" ? "feature-row--success" : ""
                } ${status.val === "error" ? "feature-row--error" : ""}`,
        },
        div({ class: "feature-row__info" },
            span({ class: "feature-row__name" }, field.label),
            field.warn
                ? span({ class: "orion-warn-badge" }, `⚠ ${field.warn}`)
                : null
        ),
        span({ class: `feature-row__badge ${field.live ? "feature-row__badge--highlight" : ""}` },
            () => {
                const v = values.val?.[field.index];
                return v !== undefined ? formatNumber(v) : "—";
            }
        ),
        div({ class: `feature-row__controls ${field.large ? "feature-row__controls--xl" : ""}` },
            NumberInput({
                value:       inputVal,
                oninput:     (e) => { inputVal.val = e.target.value; },
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            withTooltip(
                button({
                    class:    () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    onclick:  () => doSet(inputVal.val),
                    disabled: () => status.val === "loading",
                }, () => status.val === "loading" ? "..." : "SET"),
                `Write value to OptionsListAccount[${field.index}]`
            )
        )
    );
};

// ── OrionTab ──────────────────────────────────────────────────────────────

export const OrionTab = () => {
    const values  = van.state(null); // map of index → value
    const loading = van.state(false);
    const error   = van.state(null);

    const ALL_INDICES = [...PINNED, ...FIELDS].map((f) => f.index);

    const load = async (silent = false) => {
        if (!silent) loading.val = true;
        error.val = null;
        try {
            const res = await API.fetchOptionsAccount();
            const list = res.data || [];
            const map = {};
            for (const idx of ALL_INDICES) map[idx] = list[idx] ?? 0;
            values.val = map;
        } catch (e) {
            if (!silent) error.val = e.message || "Failed to read Orion data";
        } finally {
            if (!silent) loading.val = false;
        }
    };

    const onWrite = async (index, value) => {
        await API.updateOptionAccountIndex(index, value);
        values.val = { ...values.val, [index]: value };
    };

    load();

    return div({ class: "world-feature scroll-container" },
        div({ class: "feature-header" },
            div(null,
                h3("ORION"),
                p({ class: "feature-header__desc" }, "Manage Orion the Great Horned Owl — loads once, refreshes after each set")
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: () => load() }, "REFRESH"),
                "Re-read Orion data from game"
            )
        ),

        div({ class: "warning-banner" },
            "⚠ ",
            span({ style: "color:var(--c-accent);font-weight:700;" }, "Bonuses of Orion"),
            " and ",
            span({ style: "color:var(--c-accent);font-weight:700;" }, "The Great Mega Reset"),
            " are permanent — keep values between 70–90. ",
            span({ style: "color:var(--c-accent);font-weight:700;" }, "Feather Restart"),
            " is permanent — keep between 30–40."
        ),

        () => {
            if (loading.val)
                return div({ class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING ORION" }))
                );
            if (error.val)
                return div({ class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "ORION READ FAILED", subtitle: error.val })
                );
            if (!values.val) return div({ class: "feature-list" });

            return div({ class: "feature-list" },

                // ── Pinned permanent bonuses ──
                div({ class: "orion-section-label" }, "⚠ Permanent Bonuses — Edit with care"),
                ...PINNED.map((f) => OrionRow({ field: f, values, onWrite })),

                // ── Divider ──
                div({ class: "orion-section-label" }, "Upgrades & Stats"),
                ...FIELDS.map((f) => OrionRow({ field: f, values, onWrite }))
            );
        }
    );
};
