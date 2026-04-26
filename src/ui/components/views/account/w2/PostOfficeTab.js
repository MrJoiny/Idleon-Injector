/**
 * W2 - Post Office Tab
 *
 * Box upgrades:
 *   PostOfficeInfo[3][i][0] -> points spent in upgrade i
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList, readGgaEntries } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ActionButton } from "../components/ActionButton.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { cleanName, runBulkSet, toInt, useWriteStatus, writeVerified } from "../accountShared.js";

const { div, span } = van.tags;

const CurrencyRow = ({ label, note, valueState, writePath, readOnly = false, onAfterWrite = null }) => {
    if (readOnly) {
        return div(
            { class: "po-currency-row feature-card po-currency-row--readonly" },
            div(
                { class: "po-currency-row__info" },
                span({ class: "po-currency-row__label" }, label),
                note ? span({ class: "po-currency-row__note" }, note) : null
            ),
            span({ class: "po-currency-row__value" }, () => String(valueState.val))
        );
    }

    return EditableNumberRow({
        valueState,
        normalize: (rawValue) => {
            const nextValue = Math.max(0, Math.round(Number(rawValue)));
            return Number.isNaN(nextValue) ? null : nextValue;
        },
        write: async (nextValue) => {
            await writeVerified(writePath, nextValue);
            if (typeof onAfterWrite === "function") onAfterWrite();
            return nextValue;
        },
        renderInfo: () => [
            span({ class: "po-currency-row__label" }, label),
            note ? span({ class: "po-currency-row__note" }, note) : null,
        ],
        renderBadge: (currentValue) => String(currentValue ?? 0),
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const next = Number.isFinite(base) ? base : Number(currentValue ?? 0);
            return Math.max(0, next + delta);
        },
        rowClass: "feature-card",
        badgeClass: "po-currency-row__value",
        controlsClass: "po-currency-row__controls account-row__controls--xl",
        inputMode: "int",
    });
};

const POBoxRow = ({ box, onAfterWrite = null }) => {
    return ClampedLevelRow({
        valueState: box.current,
        max: () => box.cap.val,
        integerMode: "round",
        write: async (nextValue) => {
            const path = `PostOfficeInfo[3][${box.index}][0]`;
            await writeVerified(path, nextValue);
            if (typeof onAfterWrite === "function") onAfterWrite();
            return nextValue;
        },
        renderInfo: () => span({ class: "po-box-row__name" }, () => box.name.val),
        rowClass: "feature-card",
        badgeClass: "po-box-row__level",
        controlsClass: "po-box-row__controls account-row__controls--xl",
    });
};

export const PostOfficeTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Post Office" });
    const boxComplete = van.state(0);
    const boxStreak = van.state(0);
    const boxMisc = van.state(0);
    const opt347 = van.state(0);
    const opt131 = van.state(0);
    const boxPoints = van.state(0);
    const spentPoints = van.state(0);
    const boxCount = van.state(0);
    const boxStates = [];
    let boxDefsLoaded = false;
    let boxRowCount = -1;

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
        for (let index = 0; index < boxCount.val; index++) {
            nextSpent += Number(boxStates[index]?.current.val ?? 0);
        }
        spentPoints.val = toInt(nextSpent, { min: 0 });
        boxMisc.val = toInt(Number(boxPoints.val ?? 0) + Number(opt131.val ?? 0), { min: 0 });
    };

    const totalEarned = van.derive(() => toInt(boxComplete.val + boxStreak.val + opt347.val + boxMisc.val, { min: 0 }));
    const availablePoints = van.derive(() => toInt(totalEarned.val - spentPoints.val));
    const { status: boxBulkStatus, run: runBoxBulkWrite } = useWriteStatus();
    const boxesListNode = div({ class: "po-boxes-list" });

    const load = async ({ forceDefinitions = false } = {}) =>
        run(async () => {
            const reads = [
                gga("PostOfficeInfo[3]"),
                gga("CurrenciesOwned"),
                readGgaEntries("OptionsListAccount", ["131", "347"]),
                gga("DNSM.h.AlchVials.h.BoxPoints"),
            ];

            if (!boxDefsLoaded || forceDefinitions) {
                reads.push(readCList("PostOffUpgradeInfo"));
            }

            const [rawUpgrades, rawCurrencies, rawOpts, rawBoxPts, rawBoxDefs = null] = await Promise.all(reads);

            if (!boxDefsLoaded || forceDefinitions) {
                const boxDefs = toIndexedArray(rawBoxDefs ?? []);
                ensureBoxStateCount(boxDefs.length);
                boxCount.val = boxDefs.length;

                for (let index = 0; index < boxDefs.length; index++) {
                    const defRow = toIndexedArray(boxDefs[index] ?? []);
                    const cap = Math.floor(Number(defRow[15]));
                    const box = boxStates[index];

                    box.name.val = cleanName(defRow[0], `BOX ${index + 1}`);
                    box.cap.val = Number.isFinite(cap) ? Math.max(0, cap) : 0;
                }

                boxDefsLoaded = true;
            }

            if (boxRowCount !== boxCount.val) {
                if (boxCount.val <= 0) {
                    boxesListNode.replaceChildren();
                } else {
                    const rows = Array.from({ length: boxCount.val }, (_, index) =>
                        POBoxRow({ box: boxStates[index], onAfterWrite: recomputeSummary })
                    );
                    boxesListNode.replaceChildren(div({ class: "po-boxes-grid" }, ...rows));
                }
                boxRowCount = boxCount.val;
            }

            const upgrades = toIndexedArray(rawUpgrades ?? []);
            for (let index = 0; index < boxCount.val; index++) {
                const upgRow = toIndexedArray(upgrades[index] ?? []);
                boxStates[index].current.val = Number(upgRow[0] ?? 0);
            }

            const currencies = rawCurrencies?.h ?? rawCurrencies ?? {};
            boxComplete.val = toInt(currencies.DeliveryBoxComplete ?? 0, { min: 0 });
            boxStreak.val = toInt(currencies.DeliveryBoxStreak ?? 0, { min: 0 });
            opt347.val = toInt(rawOpts?.["347"] ?? 0, { min: 0 });
            opt131.val = toInt(rawOpts?.["131"] ?? 0, { min: 0 });
            boxPoints.val = toInt(rawBoxPts ?? 0, { min: 0 });
            recomputeSummary();
        });

    const runBulkBoxWrite = async (getNextValue) => {
        if (boxCount.val <= 0) return;

        await runBoxBulkWrite(async () => {
            await runBulkSet({
                entries: boxStates.slice(0, boxCount.val),
                getTargetValue: getNextValue,
                getValueState: (box) => box.current,
                getPath: (_, index) => `PostOfficeInfo[3][${index}][0]`,
            });

            recomputeSummary();
        });
    };

    const doMaxAllBoxes = async () => runBulkBoxWrite((box) => box.cap.val);

    const doResetBoxes = async () => runBulkBoxWrite(() => 0);

    load();

    const pointsSection = AccountSection({
        title: "POINT SOURCES & CURRENCY",
        note: "Values that contribute to your available upgrade points",
        body: [
            div(
                { class: "po-section__rows" },
                CurrencyRow({
                    label: "DELIVERY COMPLETE",
                    valueState: boxComplete,
                    writePath: "CurrenciesOwned.h.DeliveryBoxComplete",
                    onAfterWrite: recomputeSummary,
                }),
                CurrencyRow({
                    label: "DELIVERY STREAK",
                    valueState: boxStreak,
                    writePath: "CurrenciesOwned.h.DeliveryBoxStreak",
                    onAfterWrite: recomputeSummary,
                }),
                CurrencyRow({
                    label: "BONUS POINTS",
                    valueState: opt347,
                    writePath: "OptionsListAccount[347]",
                    onAfterWrite: recomputeSummary,
                }),
                div({ class: "po-section__divider" }, "MISC SOURCES (contribute to DeliveryBoxMisc)"),
                CurrencyRow({
                    label: "MISC OPTION",
                    valueState: opt131,
                    writePath: "OptionsListAccount[131]",
                    onAfterWrite: recomputeSummary,
                }),
                CurrencyRow({
                    label: "VIAL BOX POINTS",
                    valueState: boxPoints,
                    readOnly: true,
                }),
                CurrencyRow({
                    label: "DELIVERY MISC",
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
                    span(
                        { class: "po-points-summary__value po-points-summary__value--spent" },
                        () => `-${spentPoints.val}`
                    )
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

    const boxesSection = AccountSection({
        title: "BOX UPGRADES",
        note: "Spend available delivery points on Post Office box bonuses",
        meta: div(
            { class: "po-bulk-bar" },
            ActionButton({
                label: "MAX ALL",
                status: boxBulkStatus,
                variant: "max-reset",
                onClick: doMaxAllBoxes,
            }),
            ActionButton({
                label: "RESET",
                status: boxBulkStatus,
                variant: "max-reset",
                onClick: doResetBoxes,
            })
        ),
        body: boxesListNode,
    });

    return PersistentAccountListPage({
        title: "POST OFFICE",
        description: "Manage delivery point currencies and Post Office box upgrades.",
        actions: RefreshButton({ onRefresh: () => load({ forceDefinitions: true }) }),
        topNotices: WarningBanner(
            " ",
            span({ class: "warning-highlight-accent" }, "Warning: "),
            " Points will only calculate well with Post Office tab open in-game."
        ),
        state: { loading, error },
        body: div({ class: "po-scroll scrollable-panel" }, pointsSection, boxesSection),
    });
};
