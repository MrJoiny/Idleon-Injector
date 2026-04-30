/**
 * W2 - Arcade Tab
 *
 * Ball counts in OptionsListAccount:
 *   [74]  -> normal balls
 *   [75]  -> golden balls
 *   [324] -> cosmic balls
 *
 * Upgrade sources:
 *   cList.ArcadeShopInfo[i][0] -> upgrade name (BLANK rows skipped)
 *   ArcadeUpg[i]                        -> current upgrade level
 *
 * Level rules:
 *   Allowed range is 0-101.
 *   Level 101 is shown as COSMIC in the UI.
 *
 * Bulk actions:
 *   MAX ALL        -> set every ArcadeUpg[i] to 100
 *   MAX ALL COSMIC -> set every ArcadeUpg[i] to 101
 *   RESET ALL      -> set every ArcadeUpg[i] to 0
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readGgaEntries } from "../../../../services/api.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountSection } from "../components/AccountSection.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    adjustFormattedIntInput,
    cleanNameEffect,
    largeFormatter,
    largeParser,
    readLevelDefinitions,
    resolveFormattedIntInput,
    runBulkSet,
    useWriteStatus,
    writeVerified,
} from "../accountShared.js";

const { div, span } = van.tags;
const ARCADE_LEVEL_MAX = 101;
const BALL_FIELDS = [
    { id: "normal", label: "Normal Balls", optionIndex: 74 },
    { id: "golden", label: "Golden Balls", optionIndex: 75 },
    { id: "cosmic", label: "Cosmic Balls", optionIndex: 324 },
];

const ArcadeRow = ({ entry }) => {
    const isCosmic = van.derive(() => Number(entry.levelState.val ?? 0) >= ARCADE_LEVEL_MAX);

    return ClampedLevelRow({
        valueState: entry.levelState,
        writePath: `ArcadeUpg[${entry.index}]`,
        max: ARCADE_LEVEL_MAX,
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            span({ class: "account-row__name" }, entry.name),
            () => (isCosmic.val ? span({ class: "arcade-row__cosmic-badge" }, "COSMIC") : null),
        ],
        renderBadge: (currentValue) => (isCosmic.val ? "COSMIC" : `LV ${currentValue ?? 0}`),
        rowClass: () => (isCosmic.val ? "arcade-row arcade-row--cosmic" : "arcade-row"),
        badgeClass: () => (isCosmic.val ? "arcade-row__badge arcade-row__badge--cosmic" : "arcade-row__badge"),
    });
};

const ArcadeBallRow = ({ field, valueState }) =>
    EditableNumberRow({
        valueState,
        normalize: (rawValue) => resolveFormattedIntInput(rawValue, null, { min: 0 }),
        write: async (nextValue) => {
            const path = `OptionsListAccount[${field.optionIndex}]`;
            await writeVerified(path, nextValue);
            return nextValue;
        },
        renderInfo: () => span({ class: "account-row__name" }, field.label),
        renderBadge: (currentValue) => largeFormatter(currentValue ?? 0),
        adjustInput: (rawValue, delta, currentValue) =>
            adjustFormattedIntInput(rawValue, delta, currentValue ?? 0, { min: 0 }),
        controlsClass: "account-row__controls--xl",
        inputProps: {
            formatter: largeFormatter,
            parser: largeParser,
        },
    });

export const ArcadeTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Arcade" });
    const { status: bulkStatus, run: runBulkSetAll } = useWriteStatus();

    const ballStates = new Map(BALL_FIELDS.map((field) => [field.id, van.state(0)]));

    const upgradeEntries = van.state([]);

    const load = async () =>
        run(async () => {
            const [rawOptions, parsed] = await Promise.all([
                readGgaEntries("OptionsListAccount", ["74", "75", "324"]),
                readLevelDefinitions({
                    levelsPath: "ArcadeUpg",
                    definitionsPath: "ArcadeShopInfo",
                    mapEntry: ({ definition, rawLevel, index }) => {
                        const rawName = String(definition[0] ?? "").trim();
                        if (!rawName || rawName.toUpperCase() === "BLANK") return null;
                        return {
                            index,
                            name: cleanNameEffect(rawName),
                            level: Number(rawLevel ?? 0),
                        };
                    },
                }),
            ]);

            BALL_FIELDS.forEach((field) => {
                ballStates.get(field.id).val = Number(rawOptions?.[String(field.optionIndex)] ?? 0);
            });

            const existing = upgradeEntries.val;
            const sameShape =
                existing.length === parsed.length &&
                existing.every((entry, i) => entry.index === parsed[i].index && entry.name === parsed[i].name);

            if (!sameShape) {
                upgradeEntries.val = parsed.map((item) => ({
                    index: item.index,
                    name: item.name,
                    levelState: van.state(item.level),
                }));
                return;
            }

            parsed.forEach((item, i) => {
                existing[i].levelState.val = item.level;
            });
        });

    const doSetAll = async (targetLevel) => {
        const entries = upgradeEntries.val;
        if (!entries.length) return;

        const lvl = Math.max(0, Number(targetLevel));
        if (isNaN(lvl)) return;

        await runBulkSetAll(async () => {
            await runBulkSet({
                entries,
                getTargetValue: () => lvl,
                getValueState: (entry) => entry.levelState,
                getPath: (entry) => `ArcadeUpg[${entry.index}]`,
            });
        });
    };

    load();

    const content = div(
        { class: "arcade-content scrollable-panel content-stack" },
        AccountSection({
            title: "BALL COUNTS",
            note: "Normal, golden, and cosmic arcade balls",
            body: div(
                { class: "account-list" },
                ...BALL_FIELDS.map((field) => ArcadeBallRow({ field, valueState: ballStates.get(field.id) }))
            ),
        }),
        AccountSection({
            title: "BONUS UPGRADES",
            note: "Arcade bonus levels (101 = cosmic)",
            body: () => {
                return div({ class: "account-list" }, ...upgradeEntries.val.map((entry) => ArcadeRow({ entry })));
            },
        })
    );

    return PersistentAccountListPage({
        rootClass: "arcade-tab tab-container",
        title: "ARCADE UPGRADES",
        description: "Manage Arcade balls and upgrade levels.",
        wrapActions: false,
        actions: BulkActionBar({
            actions: [
                {
                    label: "MAX ALL",
                    status: bulkStatus,
                    tooltip: "Set every Arcade upgrade to 100",
                    onClick: () => doSetAll(100),
                },
                {
                    label: "MAX ALL COSMIC",
                    status: bulkStatus,
                    tooltip: "Set every Arcade upgrade to 101",
                    onClick: () => doSetAll(101),
                },
                {
                    label: "RESET ALL",
                    status: bulkStatus,
                    tooltip: "Reset every Arcade upgrade to 0",
                    onClick: () => doSetAll(0),
                },
            ],
            refresh: {
                onClick: load,
            },
        }),
        state: { loading, error },
        body: content,
    });
};
