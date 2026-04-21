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
 *   - OrionRow uses the shared ClickerRow primitive for focus-safe input
 *     syncing, status handling, and SET behavior.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readGgaEntries } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ClickerRow } from "../ClickerRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";

const { div, span } = van.tags;

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

// ── OrionRow ──────────────────────────────────────────────────────────────

const OrionRow = ({ field, fieldState, onWrite }) =>
    ClickerRow({
        field,
        fieldState,
        onWrite,
        warnBadgeClass: "orion-warn-badge",
        controlsClass: "account-row__controls--xl",
    });

// ── OrionTab ──────────────────────────────────────────────────────────────

export const OrionTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Orion" });

    const fieldStates = new Map(ALL_FIELDS.map((f) => [f.index, van.state(undefined)]));

    const load = async () =>
        run(async () => {
            const keys = ALL_FIELDS.map((f) => String(f.index));
            const results = await readGgaEntries("OptionsListAccount", keys);
            for (const f of ALL_FIELDS) {
                fieldStates.get(f.index).val = results[String(f.index)] ?? 0;
            }
        });

    const onWrite = async (index, value) => {
        return await gga(`OptionsListAccount[${index}]`, value);
    };

    // Built once, stays in the DOM permanently.
    // Hidden via class while loading/errored so the user doesn't see stale data,
    // but never removed — removal would let VanJS GC the reactive badge closures.
    const rowList = div(
        { class: () => `account-list${loading.val || error.val ? " is-hidden-until-ready" : ""}` },
        div({ class: "section-label" }, Icons.Warning(), " Permanent Bonuses — Edit with care"),
        ...PINNED.map((f) => OrionRow({ field: f, fieldState: fieldStates.get(f.index), onWrite })),
        div({ class: "section-label" }, "Upgrades & Stats"),
        ...FIELDS.map((f) => OrionRow({ field: f, fieldState: fieldStates.get(f.index), onWrite }))
    );

    load();

    return AccountPageShell({
        rootClass: "tab-container scroll-container",
        header: AccountTabHeader({
            title: "ORION",
            description: "Manage Orion the Great Horned Owl - loads once, refreshes after each set",
            actions: RefreshButton({
                onRefresh: load,
                tooltip: "Re-read Orion data from game",
            }),
        }),
        topNotices: WarningBanner(
            " ",
            span({ class: "warning-highlight-accent" }, "Bonuses of Orion"),
            " and ",
            span({ class: "warning-highlight-accent" }, "The Great Mega Reset"),
            " are permanent - keep values between 70-90. ",
            span({ class: "warning-highlight-accent" }, "Feather Restart"),
            " is permanent - keep between 30-40."
        ),
        body: div(
            () =>
                loading.val
                    ? div({ class: "account-list" }, div({ class: "account-loader" }, Loader({ text: "READING ORION" })))
                    : null,
            () =>
                error.val
                    ? div(
                          { class: "account-list" },
                          EmptyState({ icon: Icons.SearchX(), title: "ORION READ FAILED", subtitle: error.val })
                      )
                    : null,
            rowList
        ),
    });
};


