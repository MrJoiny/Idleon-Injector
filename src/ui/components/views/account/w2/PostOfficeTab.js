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
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";

const { div, button, span, h3, p, input } = van.tags;

const SHIPMENT_COUNT = 6;
const POST_OFFICE_SUBTABS = [
    { id: "deliveries", label: "DELIVERIES" },
    { id: "boxes", label: "BOXES" },
];

const toArr = (raw) =>
    Array.isArray(raw)
        ? raw
        : Object.keys(raw ?? {}).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);

// ── PONumField ──────────────────────────────────────────────────────────────
// Compact numeric edit row used inside shipment cards.

const PONumField = ({ label, valueState, writePath }) => {
    const inputVal = van.state(String(valueState.val));
    const status = van.state(null);

    van.derive(() => { inputVal.val = String(valueState.val); });

    const doSet = async () => {
        const val = Math.max(0, Math.round(Number(inputVal.val)));
        if (isNaN(val)) return;
        status.val = "loading";
        try {
            await writeGga(writePath, val);
            valueState.val = val;
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "po-field-row",
                status.val === "success" ? "flash-success" : "",
                status.val === "error" ? "flash-error" : "",
            ].filter(Boolean).join(" "),
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
                    class: () => `feature-btn feature-btn--apply po-field-row__set-btn${status.val === "loading" ? " feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: doSet,
                },
                () => status.val === "loading" ? "…" : "SET",
            ),
        ),
    );
};

// ── POTextField ─────────────────────────────────────────────────────────────
// Text (string) edit row for item ID.

const POTextField = ({ label, valueState, writePath }) => {
    const inputVal = van.state(String(valueState.val));
    const status = van.state(null);

    van.derive(() => { inputVal.val = String(valueState.val); });

    const doSet = async () => {
        status.val = "loading";
        try {
            await writeGga(writePath, inputVal.val);
            valueState.val = inputVal.val;
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "po-field-row po-field-row--text",
                status.val === "success" ? "flash-success" : "",
                status.val === "error" ? "flash-error" : "",
            ].filter(Boolean).join(" "),
        },
        span({ class: "po-field-row__label" }, label),
        div(
            { class: "po-field-row__text-wrap" },
            input({
                class: "po-text-input",
                type: "text",
                value: () => inputVal.val,
                oninput: (e) => (inputVal.val = e.target.value),
            }),
            button(
                {
                    class: () => `feature-btn feature-btn--apply po-field-row__set-btn${status.val === "loading" ? " feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: doSet,
                },
                () => status.val === "loading" ? "…" : "SET",
            ),
        ),
    );
};

// ── POToggleField ───────────────────────────────────────────────────────────
// Toggle button for the completed flag (0 / 1).

const POToggleField = ({ valueState, writePath }) => {
    const status = van.state(null);

    const doToggle = async () => {
        const next = valueState.val ? 0 : 1;
        status.val = "loading";
        try {
            await writeGga(writePath, next);
            valueState.val = next;
            status.val = "success";
            setTimeout(() => (status.val = null), 1000);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return button(
        {
            class: () => [
                "po-toggle-btn",
                valueState.val ? "po-toggle-btn--done" : "",
                status.val === "loading" ? "feature-btn--loading" : "",
            ].filter(Boolean).join(" "),
            disabled: () => status.val === "loading",
            onclick: doToggle,
        },
        () => status.val === "loading"
            ? "…"
            : valueState.val
                ? "✓  COMPLETED — click to undo"
                : "○  MARK COMPLETE",
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
                () => completed.val ? "DONE" : "PENDING",
            ),
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
        }),
    );
};

// ── OfficeGroup ───────────────────────────────────────────────────────────────

const OfficeGroup = ({ label, shipmentStates, startIndex }) =>
    div(
        { class: "po-office-group" },
        div(
            { class: "po-office-group__header" },
            span({ class: "po-office-group__label" }, label),
            span({ class: "po-office-group__range" }, `Shipments ${startIndex}–${startIndex + 2}`),
        ),
        div(
            { class: "po-office-group__cards" },
            ...Array.from({ length: 3 }, (_, i) =>
                ShipmentCard({ index: startIndex + i, states: shipmentStates[startIndex + i] })
            ),
        ),
    );

// ── CurrencyRow ───────────────────────────────────────────────────────────────
// Editable row for currency / option values in the Point Sources section.

const CurrencyRow = ({ label, note, valueState, writePath, readOnly = false }) => {
    if (readOnly) {
        return div(
            { class: "po-currency-row po-currency-row--readonly" },
            div(
                { class: "po-currency-row__info" },
                span({ class: "po-currency-row__label" }, label),
                note ? span({ class: "po-currency-row__note" }, note) : null,
            ),
            span({ class: "po-currency-row__value" }, () => String(valueState.val)),
        );
    }

    const inputVal = van.state(String(valueState.val));
    const status = van.state(null);

    van.derive(() => { inputVal.val = String(valueState.val); });

    const doSet = async () => {
        const val = Math.max(0, Math.round(Number(inputVal.val)));
        if (isNaN(val)) return;
        status.val = "loading";
        try {
            await writeGga(writePath, val);
            valueState.val = val;
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "po-currency-row",
                status.val === "success" ? "flash-success" : "",
                status.val === "error" ? "flash-error" : "",
            ].filter(Boolean).join(" "),
        },
        div(
            { class: "po-currency-row__info" },
            span({ class: "po-currency-row__label" }, label),
            note ? span({ class: "po-currency-row__note" }, note) : null,
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
                    class: () => `feature-btn feature-btn--apply${status.val === "loading" ? " feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: doSet,
                },
                () => status.val === "loading" ? "…" : "SET",
            ),
        ),
    );
};

// PostOfficeTab ─────────────────────────────────────────────────────────────

const POBoxRow = ({ box }) => {
    const inputVal = van.state(String(box.current.val));
    const status = van.state(null);

    van.derive(() => { inputVal.val = String(box.current.val); });

    const clampToCap = (raw) => {
        const n = Math.round(Number(raw));
        if (isNaN(n)) return null;
        return Math.min(box.cap.val, Math.max(0, n));
    };

    const doSet = async () => {
        const val = clampToCap(inputVal.val);
        if (val === null) return;
        status.val = "loading";
        try {
            await writeGga(`PostOfficeInfo[3][${box.index}][0]`, val);
            box.current.val = val;
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "po-box-row",
                status.val === "success" ? "flash-success" : "",
                status.val === "error" ? "flash-error" : "",
            ].filter(Boolean).join(" "),
        },
        div(
            { class: "po-box-row__info" },
            span({ class: "po-box-row__name" }, () => box.name.val),
            span({ class: "po-box-row__level" }, () => `LV ${box.current.val} / ${box.cap.val}`),
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
                    class: () => `feature-btn feature-btn--apply${status.val === "loading" ? " feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: doSet,
                },
                () => status.val === "loading" ? "..." : "SET",
            ),
        ),
    );
};

export const PostOfficeTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const initialized = van.state(false);
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

    // Computed — updates automatically when any dependency changes
    const totalEarned = van.derive(() =>
        boxComplete.val + boxStreak.val + opt347.val + boxMisc.val
    );
    const availablePoints = van.derive(() => totalEarned.val - spentPoints.val);

    // ── Bulk control states ────────────────────────────────────────────────
    const bulkStreakInput = van.state("100");
    const bulkShieldInput = van.state("5");
    const bulkStreakStatus = van.state(null);
    const bulkShieldStatus = van.state(null);
    const boxBulkStatus = van.state(null);

    // ── Load ───────────────────────────────────────────────────────────────
        const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const readPostOfficeBoxDefs = async () => {
                return readGga("CustomLists.h.PostOffUpgradeInfo")
                    .catch(() => readGga("CustomLists.PostOffUpgradeInfo"))
                    .catch(() => readGga("cList.PostOffUpgradeInfo"))
                    .catch(() => []);
            };

            const [rawPO, rawCurrencies, rawOpts, rawBoxPts, rawBoxDefs] = await Promise.all([
                readGga("PostOfficeInfo"),
                readGga("CurrenciesOwned"),
                readGga("OptionsListAccount"),
                readGga("DNSM.h.AlchVials.h.BoxPoints").catch(() => 0),
                readPostOfficeBoxDefs(),
            ]);

            // Parse PostOfficeInfo
            const po = toArr(rawPO ?? []);
            const orders = toArr(po[0] ?? []);
            const perShipment = toArr(po[1] ?? []);
            const bonuses = toArr(po[2] ?? []);
            const upgrades = toArr(po[3] ?? []);

            for (let s = 0; s < SHIPMENT_COUNT; s++) {
                const order = toArr(orders[s] ?? []);
                const ship = toArr(perShipment[s] ?? []);
                const bonus = toArr(bonuses[s] ?? []);
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
                const row = toArr(upgrades[i] ?? []);
                spent += Number(row[0] ?? 0);
            }
            spentPoints.val = spent;

            const boxDefs = toArr(rawBoxDefs ?? []);
            boxCount.val = boxDefs.length;
            ensureBoxStateCount(boxCount.val);

            for (let i = 0; i < boxCount.val; i++) {
                const defRow = toArr(boxDefs[i] ?? []);
                const upgRow = toArr(upgrades[i] ?? []);
                const box = boxStates[i];

                box.name.val = String(defRow[0] ?? `BOX ${i + 1}`).replace(/_/g, " ").trim();
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
            const opts = toArr(rawOpts ?? []);
            opt347.val = Number(opts[347] ?? 0);
            opt131.val = Number(opts[131] ?? 0);

            // AlchVials BoxPoints
            boxPoints.val = Number(rawBoxPts ?? 0);

            initialized.val = true;
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            loading.val = false;
        }
    };

    load();

    // ── Bulk: set all streaks ──────────────────────────────────────────────
    const doSetAllStreaks = async () => {
        const val = Math.max(0, Math.round(Number(bulkStreakInput.val)));
        if (isNaN(val)) return;
        bulkStreakStatus.val = "loading";
        try {
            await Promise.all(
                shipmentStates.map((st, s) =>
                    writeGga(`PostOfficeInfo[1][${s}][1]`, val)
                        .then(() => { st.streak.val = val; })
                )
            );
            bulkStreakStatus.val = "success";
            setTimeout(() => (bulkStreakStatus.val = null), 1500);
        } catch {
            bulkStreakStatus.val = "error";
            setTimeout(() => (bulkStreakStatus.val = null), 1500);
        }
    };

    // ── Bulk: set all shields ──────────────────────────────────────────────
    const doSetAllShields = async () => {
        const val = Math.max(0, Math.round(Number(bulkShieldInput.val)));
        if (isNaN(val)) return;
        bulkShieldStatus.val = "loading";
        try {
            await Promise.all(
                shipmentStates.map((st, s) =>
                    writeGga(`PostOfficeInfo[1][${s}][2]`, val)
                        .then(() => { st.shield.val = val; })
                )
            );
            bulkShieldStatus.val = "success";
            setTimeout(() => (bulkShieldStatus.val = null), 1500);
        } catch {
            bulkShieldStatus.val = "error";
            setTimeout(() => (bulkShieldStatus.val = null), 1500);
        }
    };

    let setAllStreaksTimeout;
    const debouncedSetAllStreaks = () => {
        clearTimeout(setAllStreaksTimeout);
        setAllStreaksTimeout = setTimeout(doSetAllStreaks, 500);
    };

    let setAllShieldsTimeout;
    const debouncedSetAllShields = () => {
        clearTimeout(setAllShieldsTimeout);
        setAllShieldsTimeout = setTimeout(doSetAllShields, 500);
    };

    const doMaxAllBoxes = async () => {
        if (boxCount.val <= 0) return;
        boxBulkStatus.val = "loading";
        try {
            // Write sequentially to avoid dropped/raced writes on deep nested PostOfficeInfo paths.
            for (let i = 0; i < boxCount.val; i++) {
                await writeGga(`PostOfficeInfo[3][${i}][0]`, boxStates[i].cap.val);
                await new Promise((r) => setTimeout(r, 20));
            }
            await load();
            boxBulkStatus.val = null;
        } catch {
            boxBulkStatus.val = null;
        }
    };

    const doResetBoxes = async () => {
        if (boxCount.val <= 0) return;
        boxBulkStatus.val = "loading";
        try {
            // Same sequential strategy for consistency with MAX ALL.
            for (let i = 0; i < boxCount.val; i++) {
                await writeGga(`PostOfficeInfo[3][${i}][0]`, 0);
                await new Promise((r) => setTimeout(r, 20));
            }
            await load();
            boxBulkStatus.val = null;
        } catch {
            boxBulkStatus.val = null;
        }
    };

    // ── DOM: Bulk controls bar ─────────────────────────────────────────────
    const bulkBar = div(
        { class: "po-bulk-bar" },

        div(
            { class: "po-bulk-group" },
            span({ class: "po-bulk-group__label" }, "ALL STREAKS"),
            NumberInput({
                mode: "int",
                value: bulkStreakInput,
                oninput: (e) => { bulkStreakInput.val = e.target.value; debouncedSetAllStreaks(); },
                onDecrement: () => { bulkStreakInput.val = String(Math.max(0, Number(bulkStreakInput.val) - 1)); debouncedSetAllStreaks(); },
                onIncrement: () => { bulkStreakInput.val = String(Number(bulkStreakInput.val) + 1); debouncedSetAllStreaks(); },
            }),
            span(
                { class: "po-bulk-status", style: "margin-left: 8px; font-weight: bold; color: var(--accent-green, #4caf50); min-width: 20px;" },
                () => bulkStreakStatus.val === "loading" ? "…" : bulkStreakStatus.val === "success" ? "✓" : ""
            )
        ),

        div({ class: "po-bulk-separator" }),

        div(
            { class: "po-bulk-group" },
            span({ class: "po-bulk-group__label" }, "ALL SHIELDS"),
            NumberInput({
                mode: "int",
                value: bulkShieldInput,
                oninput: (e) => { bulkShieldInput.val = e.target.value; debouncedSetAllShields(); },
                onDecrement: () => { bulkShieldInput.val = String(Math.max(0, Number(bulkShieldInput.val) - 1)); debouncedSetAllShields(); },
                onIncrement: () => { bulkShieldInput.val = String(Number(bulkShieldInput.val) + 1); debouncedSetAllShields(); },
            }),
            span(
                { class: "po-bulk-status", style: "margin-left: 8px; font-weight: bold; color: var(--accent-green, #4caf50); min-width: 20px;" },
                () => bulkShieldStatus.val === "loading" ? "…" : bulkShieldStatus.val === "success" ? "✓" : ""
            )
        )
    );

    // ── DOM: Shipment cards ────────────────────────────────────────────────
    const shipmentsSection = div(
        { class: "po-shipments-section" },
        OfficeGroup({ label: "OFFICE 1", shipmentStates, startIndex: 0 }),
        OfficeGroup({ label: "OFFICE 2", shipmentStates, startIndex: 3 }),
    );

    // ── DOM: Point Sources section ─────────────────────────────────────────
    const pointsSection = div(
        { class: "po-section" },

        div(
            { class: "po-section__header" },
            span({ class: "po-section__title" }, "POINT SOURCES & CURRENCY"),
            span({ class: "po-section__subtitle" }, "Values that contribute to your available upgrade points"),
        ),

        div(
            { class: "po-section__rows" },

            CurrencyRow({
                label: "DELIVERY COMPLETE",
                note: null,
                valueState: boxComplete,
                writePath: "CurrenciesOwned.h.DeliveryBoxComplete",
            }),
            CurrencyRow({
                label: "DELIVERY STREAK",
                note: null,
                valueState: boxStreak,
                writePath: "CurrenciesOwned.h.DeliveryBoxStreak",
            }),
            CurrencyRow({
                label: "BONUS POINTS",
                note: null,
                valueState: opt347,
                writePath: "OptionsListAccount[347]",
            }),

            // Misc divider
            div({ class: "po-section__divider" }, "MISC SOURCES (contribute to DeliveryBoxMisc)"),

            CurrencyRow({
                label: "MISC OPTION",
                note: null,
                valueState: opt131,
                writePath: "OptionsListAccount[131]",
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
            }),
        ),

        // Points summary
        div(
            { class: "po-points-summary" },

            div(
                { class: "po-points-summary__row" },
                span({ class: "po-points-summary__label" }, "TOTAL EARNED"),
                span(
                    { class: "po-points-summary__value", style: "color: var(--accent-green, #4caf50);" },
                    () => String(totalEarned.val),
                ),
            ),

            div(
                { class: "po-points-summary__row" },
                span({ class: "po-points-summary__label" }, "SPENT ON UPGRADES"),
                span({ class: "po-points-summary__value po-points-summary__value--spent" }, () => `−${spentPoints.val}`),
            ),

            div(
                { class: "po-points-summary__row po-points-summary__row--highlight" },
                span({ class: "po-points-summary__label" }, "AVAILABLE POINTS"),
                span({ class: "po-points-summary__value po-points-summary__value--available" }, () => String(availablePoints.val)),
            ),
        ),
    );

    // ── DOM: Scrollable content ────────────────────────────────────────────
    const scroll = div(
        { class: () => `po-scroll scrollable-panel${initialized.val ? "" : " po-scroll--hidden"}` },
        bulkBar,
        shipmentsSection,
        pointsSection,
    );

    const boxesScroll = div(
        { class: () => `po-scroll scrollable-panel${initialized.val ? "" : " po-scroll--hidden"}` },
        div(
            { class: "po-bulk-bar" },
            button(
                {
                    class: () => `feature-btn po-box-bulk-btn${boxBulkStatus.val === "loading" ? " feature-btn--loading" : ""}`,
                    disabled: () => boxBulkStatus.val === "loading",
                    onclick: doMaxAllBoxes,
                },
                "MAX ALL",
            ),
            button(
                {
                    class: () => `feature-btn po-box-bulk-btn${boxBulkStatus.val === "loading" ? " feature-btn--loading" : ""}`,
                    disabled: () => boxBulkStatus.val === "loading",
                    onclick: doResetBoxes,
                },
                "RESET",
            ),
        ),
        div(
            { class: "po-boxes-list" },
            () => boxCount.val <= 0
                ? div({ class: "po-boxes-empty" }, "No Post Office box upgrades found.")
                : div(
                    { class: "po-boxes-grid" },
                    ...Array.from({ length: boxCount.val }, (_, i) =>
                        POBoxRow({ box: boxStates[i] })
                    ),
                ),
        ),
    );

    return div(
        { class: "po-tab tab-container" },

        // Header
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "POST OFFICE"),
                p({ class: "feature-header__desc" }, "Manage shipment streaks, shields, order completions and delivery point currencies."),
            ),
            div(
                { class: "feature-header__actions" },
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ),
        ),

        div(
            { class: "warning-banner" },
            Icons.Warning(),
            " ",
            span({ class: "warning-highlight-accent" }, "Warning: "),
            " Points will only calculate well with Post Office tab open in-game."
        ),

        div(
            { class: "po-sub-nav alchemy-sub-nav" },
            ...POST_OFFICE_SUBTABS.map((tab) =>
                button(
                    {
                        class: () => `po-sub-btn alchemy-sub-btn ${activeSubTab.val === tab.id ? "active" : ""}`,
                        onclick: () => (activeSubTab.val = tab.id),
                    },
                    tab.label,
                )
            ),
        ),

        // Loader ? only before first successful load
        () => (loading.val && !initialized.val)
            ? div({ class: "feature-loader" }, Loader())
            : null,

        // Error ? only on failed initial load
        () => (!loading.val && error.val && !initialized.val)
            ? EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val })
            : null,

        // Content ? always in DOM; hidden via CSS until initialized
        div(
            { class: "po-sub-content" },
            div(
                { class: () => `po-pane ${activeSubTab.val === "deliveries" ? "po-pane--active" : ""}` },
                scroll,
            ),
            div(
                { class: () => `po-pane ${activeSubTab.val === "boxes" ? "po-pane--active" : ""}` },
                boxesScroll,
            ),
        ),
    );
};
