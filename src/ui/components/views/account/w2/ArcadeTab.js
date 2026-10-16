/**
 * W2 - Arcade Tab
 *
 * Ball counts in OptionsListAccount:
 *   [74]  -> normal balls
 *   [75]  -> golden balls
 *   [324] -> cosmic balls
 *   [625] -> Omega balls
 *   [626] -> lifetime Omega ball drops
 *
 * Upgrade sources:
 *   cList.ArcadeShopInfo[i][0] -> upgrade name (BLANK rows skipped)
 *   ArcadeUpg[i]                        -> current upgrade level
 *
 * Level rules:
 *   Allowed range is 0-102.
 *   Level 101 is COSMIC; level 102 is OMEGA.
 *
 * Bulk actions:
 *   MAX ALL        -> set every ArcadeUpg[i] to 100
 *   MAX ALL COSMIC -> set every ArcadeUpg[i] to 101
 *   MAX ALL OMEGA  -> set every ArcadeUpg[i] to 102
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
const ARCADE_LEVEL_MAX = 102;
const BALL_FIELDS = [
    { id: "normal", label: "Normal Balls", optionIndex: 74 },
    { id: "golden", label: "Golden Balls", optionIndex: 75 },
    { id: "cosmic", label: "Cosmic Balls", optionIndex: 324 },
    { id: "omega", label: "Omega Balls", optionIndex: 625 },
    { id: "omegaDropped", label: "Omega Balls Total Dropped", optionIndex: 626 },
];

const ArcadeRow = ({ entry }) => {
    const levelStatus = van.derive(() => {
        const level = Number(entry.levelState.val ?? 0);
        return level >= 102 ? "omega" : level >= 101 ? "cosmic" : "normal";
    });

    return ClampedLevelRow({
        valueState: entry.levelState,
        writePath: `ArcadeUpg[${entry.index}]`,
        max: ARCADE_LEVEL_MAX,
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            span({ class: "account-row__name" }, entry.name),
            () =>
                levelStatus.val === "normal"
                    ? null
                    : span({ class: `arcade-row__${levelStatus.val}-badge` }, levelStatus.val.toUpperCase()),
        ],
        renderBadge: (currentValue) =>
            levelStatus.val === "normal" ? `LV ${currentValue ?? 0}` : levelStatus.val.toUpperCase(),
        rowClass: () => (levelStatus.val === "normal" ? "arcade-row" : `arcade-row arcade-row--${levelStatus.val}`),
        badgeClass: () =>
            levelStatus.val === "normal"
                ? "arcade-row__badge"
                : `arcade-row__badge arcade-row__badge--${levelStatus.val}`,
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
                readGgaEntries("OptionsListAccount", BALL_FIELDS.map((field) => String(field.optionIndex))),
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
            note: "Normal, golden, cosmic, and Omega arcade balls, plus lifetime Omega drops",
            body: div(
                { class: "account-list" },
                ...BALL_FIELDS.map((field) => ArcadeBallRow({ field, valueState: ballStates.get(field.id) }))
            ),
        }),
        AccountSection({
            title: "BONUS UPGRADES",
            note: "Level 101 grants the cosmic bonus. Level 102 grants Omega status with a 6x bonus, or 12x with Companion 27.",
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
                    label: "MAX ALL OMEGA",
                    status: bulkStatus,
                    tooltip: "Set every Arcade upgrade to 102",
                    onClick: () => doSetAll(102),
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
