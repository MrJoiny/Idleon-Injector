/**
 * W2 — Post Office Tab
 *
 * Shipments (s = 0..5):
 *   PostOfficeInfo[0][s] → [ itemId, orderQty, completedFlag ]
 *   PostOfficeInfo[1][s] → [ orderCount, streak, shield ]
 *   PostOfficeInfo[2][s][0] → streak bonus payout for shipment s
 *   PostOfficeInfo[3][i][0] → points spent in upgrade i (read-only, summed)
 *
 * Shipment grouping:
 *   Office 1: s = 0..2
 *   Office 2: s = 3..5
 *
 * Currency / point paths:
 *   CurrenciesOwned.h.DeliveryBoxComplete  → completion points
 *   CurrenciesOwned.h.DeliveryBoxStreak    → streak points accumulated
 *   CurrenciesOwned.h.DeliveryBoxMisc      → derived: AlchVials.BoxPoints + OptionsListAccount[131]
 *   OptionsListAccount[347]                → extra point bonus source
 *   OptionsListAccount[131]                → feeds into DeliveryBoxMisc
 *   DNSM.h.AlchVials.h.BoxPoints           → feeds into DeliveryBoxMisc
 *
 * Available points = Complete + Streak + Opt[347] + Misc − Spent
 *
 * Re-render strategy:
 *   All states created once; load() updates them in-place.
 *   DOM built once, hidden via CSS until first load.
 *   Individual SET and bulk operations never trigger a full re-render.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { FeatureActionButton } from "../components/FeatureActionButton.js";
import { FeatureSection } from "../components/FeatureSection.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { RefreshErrorBanner, usePersistentPaneReady, useWriteStatus } from "../featureShared.js";
import { renderTabNav } from "../tabShared.js";

const { div, button, span } = van.tags;

const SHIPMENT_COUNT = 6;
const POST_OFFICE_SUBTABS = [
    { id: "deliveries", label: "DELIVERIES" },
    { id: "boxes", label: "BOXES" },
];

// ── PONumField ──────────────────────────────────────────────────────────────
// Compact numeric edit row used inside shipment cards.

const PONumField = ({ label, valueState, writePath }) => {
    const inputVal = van.state(String(valueState.val));
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(valueState.val);
    });

    const doSet = async () => {
        const val = Math.max(0, Math.round(Number(inputVal.val)));
        if (isNaN(val)) return;
        await run(async () => {
            const ok = await gga(writePath, val);
            if (!ok) throw new Error(`Write mismatch at ${writePath}: expected ${val}`);
            valueState.val = val;
        });
    };

    return div(
        {
            class: () =>
                [
                    "po-field-row",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        span({ class: "po-field-row__label" }, label),
        span({ class: "po-field-row__value po-field-row__value--short" }, () => String(valueState.val)),
        div(
            { class: "po-field-row__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            button(
                {
                    class: () =>
                        `feature-btn feature-btn--apply po-field-row__set-btn${status.val === "loading" ? " feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: doSet,
                },
                () => (status.val === "loading" ? "…" : "SET")
            )
        )
    );
};

const POToggleField = ({ valueState, writePath }) => {
    const { status, run } = useWriteStatus();

    const doToggle = async () => {
        const next = valueState.val ? 0 : 1;
        await run(async () => {
            const ok = await gga(writePath, next);
            if (!ok) throw new Error(`Write mismatch at ${writePath}: expected ${next}`);
            valueState.val = next;
        });
    };

    return button(
        {
            class: () =>
                [
                    "po-toggle-btn",
                    valueState.val ? "po-toggle-btn--done" : "",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                    status.val === "loading" ? "feature-btn--loading" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
            disabled: () => status.val === "loading",
            onclick: doToggle,
        },
        () => (status.val === "loading" ? "…" : valueState.val ? "✓  COMPLETED — click to undo" : "○  MARK COMPLETE")
    );
};

// ── ShipmentCard ─────────────────────────────────────────────────────────────

const ShipmentCard = ({ index, states }) => {
    const { itemId, orderQty, completed, streak, shield, streakBonus } = states;

    return div(
        { class: () => `po-shipment-card${completed.val ? " po-shipment-card--completed" : ""}` },

        // Header
        div(
            { class: "po-shipment-card__header" },
            span({ class: "po-shipment-card__index" }, `SHIPMENT #${index}`),
            span(
                { class: () => `po-shipment-card__badge${completed.val ? " po-shipment-card__badge--done" : ""}` },
                () => (completed.val ? "DONE" : "PENDING")
            )
        ),

        // Item ID Display (Read-Only)
        div(
            { class: "po-field-row po-field-row--readonly po-field-row--text" },
            span({ class: "po-field-row__label" }, "ITEM"),
            span({ class: "po-field-row__value po-field-row__value--short" }, () => String(itemId.val))
        ),

        // Order qty
        PONumField({
            label: "ORDER QTY",
            valueState: orderQty,
            writePath: `PostOfficeInfo[0][${index}][1]`,
        }),

        // Streak
        PONumField({
            label: "STREAK",
            valueState: streak,
            writePath: `PostOfficeInfo[1][${index}][1]`,
        }),

        // Shield
        PONumField({
            label: "SHIELD",
            valueState: shield,
            writePath: `PostOfficeInfo[1][${index}][2]`,
        }),

        // Streak bonus payout (Read-Only)
        div(
            { class: "po-field-row po-field-row--readonly po-field-row--text" },
            span({ class: "po-field-row__label" }, "STREAK BONUS"),
            span({ class: "po-field-row__value po-field-row__value--short" }, () => String(streakBonus.val))
        ),

        // Completed toggle
        POToggleField({
            valueState: completed,
            writePath: `PostOfficeInfo[0][${index}][2]`,
        })
    );
};

// ── OfficeGroup ───────────────────────────────────────────────────────────────

const OfficeGroup = ({ label, shipmentStates, startIndex }) =>
    div(
        { class: "po-office-group" },
        div(
            { class: "po-office-group__header" },
            span({ class: "po-office-group__label" }, label),
            span({ class: "po-office-group__range" }, `Shipments ${startIndex}–${startIndex + 2}`)
        ),
        div(
            { class: "po-office-group__cards" },
            ...Array.from({ length: 3 }, (_, i) =>
                ShipmentCard({ index: startIndex + i, states: shipmentStates[startIndex + i] })
            )
        )
    );

// ── CurrencyRow ───────────────────────────────────────────────────────────────
// Editable row for currency / option values in the Point Sources section.

const CurrencyRow = ({ label, note, valueState, writePath, readOnly = false, onAfterWrite = null }) => {
    if (readOnly) {
        return div(
            { class: "po-currency-row po-currency-row--readonly" },
            div(
                { class: "po-currency-row__info" },
                span({ class: "po-currency-row__label" }, label),
                note ? span({ class: "po-currency-row__note" }, note) : null
            ),
            span({ class: "po-currency-row__value" }, () => String(valueState.val))
        );
    }

    const inputVal = van.state(String(valueState.val));
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(valueState.val);
    });

    const doSet = async () => {
        const val = Math.max(0, Math.round(Number(inputVal.val)));
        if (isNaN(val)) return;
        await run(async () => {
            const ok = await gga(writePath, val);
            if (!ok) throw new Error(`Write mismatch at ${writePath}: expected ${val}`);
            valueState.val = val;
            if (typeof onAfterWrite === "function") onAfterWrite();
        });
    };

    return div(
        {
            class: () =>
                [
                    "po-currency-row",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "po-currency-row__info" },
            span({ class: "po-currency-row__label" }, label),
            note ? span({ class: "po-currency-row__note" }, note) : null
        ),
        span({ class: "po-currency-row__value" }, () => String(valueState.val)),
        div(
            { class: "po-currency-row__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            button(
                {
                    class: () =>
                        [
                            "feature-btn",
                            "feature-btn--apply",
                            status.val === "loading" ? "feature-btn--loading" : "",
                            status.val === "success" ? "feature-row--success" : "",
                            status.val === "error" ? "feature-row--error" : "",
                        ]
                            .filter(Boolean)
                            .join(" "),
                    disabled: () => status.val === "loading",
                    onclick: doSet,
                },
                () => (status.val === "loading" ? "…" : "SET")
            )
        )
    );
};

// PostOfficeTab ─────────────────────────────────────────────────────────────

const POBoxRow = ({ box, onAfterWrite = null }) => {
    const inputVal = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(box.current.val);
    });

    const clampToCap = (raw) => {
        const n = Math.round(Number(raw));
        if (isNaN(n)) return null;
        return Math.min(box.cap.val, Math.max(0, n));
    };

    const doSet = async () => {
        const val = clampToCap(inputVal.val);
        if (val === null) return;
        await run(
            async () => {
                const path = `PostOfficeInfo[3][${box.index}][0]`;
                const ok = await gga(path, val);
                if (!ok) throw new Error(`Write mismatch at ${path}: expected ${val}`);
                return val;
            },
            {
                onSuccess: (verified) => {
                    box.current.val = verified;
                    if (typeof onAfterWrite === "function") onAfterWrite();
                },
            }
        );
    };

    return div(
        {
            class: () =>
                [
                    "po-box-row",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "po-box-row__info" },
            span({ class: "po-box-row__name" }, () => box.name.val),
            span({ class: "po-box-row__level" }, () => `LV ${box.current.val} / ${box.cap.val}`)
        ),
        div(
            { class: "po-box-row__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(clampToCap(Number(inputVal.val) - 1) ?? 0)),
                onIncrement: () => (inputVal.val = String(clampToCap(Number(inputVal.val) + 1) ?? box.cap.val)),
            }),
            button(
                {
                    class: () =>
                        `feature-btn feature-btn--apply${status.val === "loading" ? " feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: doSet,
                },
                () => (status.val === "loading" ? "..." : "SET")
            )
        )
    );
};

export const PostOfficeTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();
    const activeSubTab = van.state(POST_OFFICE_SUBTABS[0].id);

    // ── Per-shipment states (created once, updated in-place) ───────────────
    const shipmentStates = Array.from({ length: SHIPMENT_COUNT }, () => ({
        itemId: van.state(""),
        orderQty: van.state(0),
        completed: van.state(0),
        streak: van.state(0),
        shield: van.state(0),
        streakBonus: van.state(0),
    }));

    // ── Currency / option states ───────────────────────────────────────────
    const boxComplete = van.state(0); // CurrenciesOwned.h.DeliveryBoxComplete
    const boxStreak = van.state(0); // CurrenciesOwned.h.DeliveryBoxStreak
    const boxMisc = van.state(0); // CurrenciesOwned.h.DeliveryBoxMisc (read-only, derived)
    const opt347 = van.state(0); // OptionsListAccount[347]
    const opt131 = van.state(0); // OptionsListAccount[131]  (feeds into DeliveryBoxMisc)
    const boxPoints = van.state(0); // DNSM.h.AlchVials.h.BoxPoints (feeds into DeliveryBoxMisc)
    const spentPoints = van.state(0); // sum(PostOfficeInfo[3][i][0])
    const boxCount = van.state(0);
    const boxStates = [];
    const ensureBoxStateCount = (count) => {
        while (boxStates.length < count) {
            boxStates.push({
                index: boxStates.length,
                name: van.state(""),
                cap: van.state(0),
                current: van.state(0),
            });
        }
    };

    const recomputeSummary = () => {
        let nextSpent = 0;
        for (let i = 0; i < boxCount.val; i++) {
            nextSpent += Number(boxStates[i]?.current.val ?? 0);
        }
        spentPoints.val = nextSpent;
        // DeliveryBoxMisc is derived from AlchVials.BoxPoints + OptionsListAccount[131].
        boxMisc.val = Number(boxPoints.val ?? 0) + Number(opt131.val ?? 0);
    };

    // Computed — updates automatically when any dependency changes
    const totalEarned = van.derive(() => boxComplete.val + boxStreak.val + opt347.val + boxMisc.val);
    const availablePoints = van.derive(() => totalEarned.val - spentPoints.val);

    // Box bulk state
    const { status: boxBulkStatus, run: runBoxBulkWrite } = useWriteStatus();

    // ── Load ───────────────────────────────────────────────────────────────
    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;
        try {
            const readPostOfficeBoxDefs = async () => {
                return readCList("PostOffUpgradeInfo").catch(() => []);
            };

            const [rawPO, rawCurrencies, rawOpts, rawBoxPts, rawBoxDefs] = await Promise.all([
                gga("PostOfficeInfo"),
                gga("CurrenciesOwned"),
                readGgaEntries("OptionsListAccount", ["131", "347"]),
                gga("DNSM.h.AlchVials.h.BoxPoints").catch(() => 0),
                readPostOfficeBoxDefs(),
            ]);

            // Parse PostOfficeInfo
            const po = toIndexedArray(rawPO ?? []);
            const orders = toIndexedArray(po[0] ?? []);
            const perShipment = toIndexedArray(po[1] ?? []);
            const bonuses = toIndexedArray(po[2] ?? []);
            const upgrades = toIndexedArray(po[3] ?? []);

            for (let s = 0; s < SHIPMENT_COUNT; s++) {
                const order = toIndexedArray(orders[s] ?? []);
                const ship = toIndexedArray(perShipment[s] ?? []);
                const bonus = toIndexedArray(bonuses[s] ?? []);
                const st = shipmentStates[s];

                st.itemId.val = String(order[0] ?? "");
                st.orderQty.val = Number(order[1] ?? 0);
                st.completed.val = Number(order[2] ?? 0);
                st.streak.val = Number(ship[1] ?? 0);
                st.shield.val = Number(ship[2] ?? 0);
                st.streakBonus.val = Number(bonus[0] ?? 0);
            }

            // Sum spent upgrade points from PostOfficeInfo[3]
            let spent = 0;
            for (let i = 0; i < upgrades.length; i++) {
                const row = toIndexedArray(upgrades[i] ?? []);
                spent += Number(row[0] ?? 0);
            }
            spentPoints.val = spent;

            const boxDefs = toIndexedArray(rawBoxDefs ?? []);
            boxCount.val = boxDefs.length;
            ensureBoxStateCount(boxCount.val);

            for (let i = 0; i < boxCount.val; i++) {
                const defRow = toIndexedArray(boxDefs[i] ?? []);
                const upgRow = toIndexedArray(upgrades[i] ?? []);
                const box = boxStates[i];

                box.name.val = String(defRow[0] ?? `BOX ${i + 1}`)
                    .replace(/_/g, " ")
                    .trim();
                // cap comes from PostOffUpgradeInfo[i][15] (string-like values such as "400.1")
                const capRaw = defRow[15];
                // true max spend is floor(cap)
                const cap = Math.floor(Number(capRaw));
                box.cap.val = Number.isFinite(cap) ? Math.max(0, cap) : 0;
                box.current.val = Number(upgRow[0] ?? 0);
            }

            // Parse currencies
            const curr = rawCurrencies?.h ?? rawCurrencies ?? {};
            boxComplete.val = Number(curr.DeliveryBoxComplete ?? 0);
            boxStreak.val = Number(curr.DeliveryBoxStreak ?? 0);
            boxMisc.val = Number(curr.DeliveryBoxMisc ?? 0);

            // Parse OptionsListAccount
            opt347.val = Number(rawOpts?.["347"] ?? 0);
            opt131.val = Number(rawOpts?.["131"] ?? 0);

            // AlchVials BoxPoints
            boxPoints.val = Number(rawBoxPts ?? 0);
            recomputeSummary();

            markReady();
        } catch (e) {
            const message = e?.message ?? "Failed to load";
            if (!initialized.val) error.val = message;
            else refreshError.val = message;
        } finally {
            loading.val = false;
        }
    };

    load();

    // Bulk box actions
    const doMaxAllBoxes = async () => {
        if (boxCount.val <= 0) return;
        await runBoxBulkWrite(async () => {
            const count = boxCount.val;
            const nextVals = Array.from({ length: count }, (_, i) => boxStates[i].cap.val);
            for (let i = 0; i < count; i++) {
                const ok = await gga(`PostOfficeInfo[3][${i}][0]`, nextVals[i]);
                if (!ok) throw new Error(`Write mismatch at PostOfficeInfo[3][${i}][0]: expected ${nextVals[i]}`);
                await new Promise((r) => setTimeout(r, 20));
            }
            for (let i = 0; i < count; i++) {
                boxStates[i].current.val = nextVals[i];
            }
            recomputeSummary();
        });
    };

    const doResetBoxes = async () => {
        if (boxCount.val <= 0) return;
        await runBoxBulkWrite(async () => {
            const count = boxCount.val;
            for (let i = 0; i < count; i++) {
                const ok = await gga(`PostOfficeInfo[3][${i}][0]`, 0);
                if (!ok) throw new Error(`Write mismatch at PostOfficeInfo[3][${i}][0]: expected 0`);
                await new Promise((r) => setTimeout(r, 20));
            }
            for (let i = 0; i < count; i++) {
                boxStates[i].current.val = 0;
            }
            recomputeSummary();
        });
    };

    // DOM: Shipment cards
    const shipmentsSection = div(
        { class: "po-shipments-section" },
        OfficeGroup({ label: "OFFICE 1", shipmentStates, startIndex: 0 }),
        OfficeGroup({ label: "OFFICE 2", shipmentStates, startIndex: 3 })
    );

    // ── DOM: Point Sources section ─────────────────────────────────────────
    const pointsSection = FeatureSection({
        title: "POINT SOURCES & CURRENCY",
        note: "Values that contribute to your available upgrade points",
        body: [
            div(
                { class: "po-section__rows" },
                CurrencyRow({
                    label: "DELIVERY COMPLETE",
                    note: null,
                    valueState: boxComplete,
                    writePath: "CurrenciesOwned.h.DeliveryBoxComplete",
                    onAfterWrite: recomputeSummary,
                }),
                CurrencyRow({
                    label: "DELIVERY STREAK",
                    note: null,
                    valueState: boxStreak,
                    writePath: "CurrenciesOwned.h.DeliveryBoxStreak",
                    onAfterWrite: recomputeSummary,
                }),
                CurrencyRow({
                    label: "BONUS POINTS",
                    note: null,
                    valueState: opt347,
                    writePath: "OptionsListAccount[347]",
                    onAfterWrite: recomputeSummary,
                }),
                div({ class: "po-section__divider" }, "MISC SOURCES (contribute to DeliveryBoxMisc)"),
                CurrencyRow({
                    label: "MISC OPTION",
                    note: null,
                    valueState: opt131,
                    writePath: "OptionsListAccount[131]",
                    onAfterWrite: recomputeSummary,
                }),
                CurrencyRow({
                    label: "VIAL BOX POINTS",
                    note: null,
                    valueState: boxPoints,
                    readOnly: true,
                }),
                CurrencyRow({
                    label: "DELIVERY MISC",
                    note: null,
                    valueState: boxMisc,
                    readOnly: true,
                })
            ),
            div(
                { class: "po-points-summary" },
                div(
                    { class: "po-points-summary__row" },
                    span({ class: "po-points-summary__label" }, "TOTAL EARNED"),
                    span({ class: "po-points-summary__value po-points-summary__value--earned" }, () =>
                        String(totalEarned.val)
                    )
                ),
                div(
                    { class: "po-points-summary__row" },
                    span({ class: "po-points-summary__label" }, "SPENT ON UPGRADES"),
                    span({ class: "po-points-summary__value po-points-summary__value--spent" }, () => `−${spentPoints.val}`)
                ),
                div(
                    { class: "po-points-summary__row po-points-summary__row--highlight" },
                    span({ class: "po-points-summary__label" }, "AVAILABLE POINTS"),
                    span({ class: "po-points-summary__value po-points-summary__value--available" }, () =>
                        String(availablePoints.val)
                    )
                )
            ),
        ],
    });

    // ── DOM: Scrollable content ────────────────────────────────────────────
    const scroll = div({ class: () => paneClass("po-scroll scrollable-panel") }, shipmentsSection, pointsSection);

    const boxesScroll = div(
        { class: () => paneClass("po-scroll scrollable-panel") },
        div(
            {
                class: () =>
                    [
                        "po-bulk-bar",
                        boxBulkStatus.val === "success" ? "feature-row--success" : "",
                        boxBulkStatus.val === "error" ? "feature-row--error" : "",
                    ]
                        .filter(Boolean)
                        .join(" "),
            },
            FeatureActionButton({
                label: "MAX ALL",
                status: boxBulkStatus,
                variant: "max-reset",
                onClick: doMaxAllBoxes,
            }),
            FeatureActionButton({
                label: "RESET",
                status: boxBulkStatus,
                variant: "max-reset",
                onClick: doResetBoxes,
            })
        ),
        div({ class: "po-boxes-list" }, () =>
            boxCount.val <= 0
                ? div({ class: "po-boxes-empty" }, "No Post Office box upgrades found.")
                : div(
                      { class: "po-boxes-grid" },
                      ...Array.from({ length: boxCount.val }, (_, i) =>
                          POBoxRow({ box: boxStates[i], onAfterWrite: recomputeSummary })
                      )
                  )
        )
    );
    const renderRefreshErrorBanner = RefreshErrorBanner({ error: refreshError });

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "POST OFFICE",
            description: "Manage shipment streaks, shields, order completions and delivery point currencies.",
            actions: button({ class: "btn-secondary", onclick: load }, "REFRESH"),
        }),
        topNotices: div(
            { class: "warning-banner" },
            Icons.Warning(),
            " ",
            span({ class: "warning-highlight-accent" }, "Warning: "),
            " Points will only calculate well with Post Office tab open in-game."
        ),
        subNav: renderTabNav({
            tabs: POST_OFFICE_SUBTABS,
            activeId: activeSubTab,
            navClass: "alchemy-sub-nav",
            buttonClass: "alchemy-sub-btn",
        }),
        refreshError: renderRefreshErrorBanner,
        initialState: [
            () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),
            () =>
                !loading.val && error.val && !initialized.val
                    ? EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val })
                    : null,
        ],
        body: div(
            { class: "po-sub-content" },
            div({ class: () => "po-pane " + (activeSubTab.val === "deliveries" ? "po-pane--active" : "") }, scroll),
            div({ class: () => "po-pane " + (activeSubTab.val === "boxes" ? "po-pane--active" : "") }, boxesScroll)
        ),
    });
};
