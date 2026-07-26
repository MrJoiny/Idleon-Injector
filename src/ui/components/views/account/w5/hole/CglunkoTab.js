import van from "../../../../../vendor/van-1.6.0.js";
import { readCList, readGgaEntries } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt, toNum } from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div } = van.tags;

const UPGRADE_START = 630;
const SHAPE_START = 654;
const SHAPE_COUNT = 12;
const SHAPES_PER_COLOR = 6;
const DAILY_PURCHASES_INDEX = 604;
const BLUE_FOCUS_INDEX = 666;
const PURPLE_FOCUS_INDEX = 667;
const TOTAL_KILLS_INDEX = 668;
const SHAPE_IDS = Array.from({ length: SHAPE_COUNT }, (_, index) => `HoleGshape${index}`);

const optionValue = (options, index) => options[String(index)] ?? 0;

const buildUpgradeEntries = (options, rawNames, rawEffects) => {
    const names = toIndexedArray(rawNames ?? []);
    const effects = toIndexedArray(rawEffects ?? []);

    return names
        .map((rawName, index) => {
            const name = cleanName(rawName, "");
            const effect = cleanName(effects[index], "");
            if (!name || /not yet/i.test(effect)) return null;

            const optionIndex = UPGRADE_START + index;
            return {
                key: `cglunko-upgrade-${index}`,
                index: optionIndex,
                name,
                subLabel: effect,
                path: `OptionsListAccount[${optionIndex}]`,
                value: toInt(optionValue(options, optionIndex), { min: 0 }),
                formatted: false,
                badge: (currentValue) => `LV ${currentValue ?? 0}`,
            };
        })
        .filter(Boolean);
};

const buildShapeEntries = (options, rawDefinitions) =>
    SHAPE_IDS.map((itemId, index) => {
        const definition = rawDefinitions[itemId] ?? {};
        const optionIndex = SHAPE_START + index;

        return {
            key: `cglunko-shape-${index}`,
            index: optionIndex,
            name: cleanName(
                definition.displayName ?? definition.DisplayName ?? definition.Name ?? definition.name,
                itemId
            ),
            subLabel: itemId,
            path: `OptionsListAccount[${optionIndex}]`,
            value: toNum(optionValue(options, optionIndex), 0),
        };
    });

const buildProgressEntries = (options, shapes) => {
    const focusName = (value, offset) => {
        const selected = toInt(value, { min: 0 });
        return selected === 0 ? "NONE" : (shapes[offset + selected - 1]?.name ?? `SHAPE ${selected}`);
    };

    return [
        {
            key: "cglunko-daily-purchases",
            index: DAILY_PURCHASES_INDEX,
            name: "Daily Upgrade Purchases",
            subLabel: "Resets daily",
            path: `OptionsListAccount[${DAILY_PURCHASES_INDEX}]`,
            value: toInt(optionValue(options, DAILY_PURCHASES_INDEX), { min: 0 }),
            formatted: false,
        },
        {
            key: "cglunko-blue-focus",
            index: BLUE_FOCUS_INDEX,
            name: "Blue Shape Focus",
            subLabel: "0 for none, 1-6 selects a blue shape",
            path: `OptionsListAccount[${BLUE_FOCUS_INDEX}]`,
            value: toInt(optionValue(options, BLUE_FOCUS_INDEX), { min: 0 }),
            min: 0,
            max: SHAPES_PER_COLOR,
            formatted: false,
            badge: (currentValue) => focusName(currentValue, 0),
        },
        {
            key: "cglunko-purple-focus",
            index: PURPLE_FOCUS_INDEX,
            name: "Purple Shape Focus",
            subLabel: "0 for none, 1-6 selects a purple shape",
            path: `OptionsListAccount[${PURPLE_FOCUS_INDEX}]`,
            value: toInt(optionValue(options, PURPLE_FOCUS_INDEX), { min: 0 }),
            min: 0,
            max: SHAPES_PER_COLOR,
            formatted: false,
            badge: (currentValue) => focusName(currentValue, SHAPES_PER_COLOR),
        },
        {
            key: "cglunko-total-kills",
            index: TOTAL_KILLS_INDEX,
            name: "Crystal Glunko Kills",
            subLabel: "Lifetime total",
            path: `OptionsListAccount[${TOTAL_KILLS_INDEX}]`,
            value: toNum(optionValue(options, TOTAL_KILLS_INDEX), 0),
        },
    ];
};

export const CglunkoTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Crystal Glunko Cove" });
    const upgradeEntries = van.state([]);
    const blueShapeEntries = van.state([]);
    const purpleShapeEntries = van.state([]);
    const progressEntries = van.state([]);
    const valueStates = new Map();
    const upgradeNode = div({ class: "account-item-stack" });
    const blueShapeNode = div({ class: "account-item-stack" });
    const purpleShapeNode = div({ class: "account-item-stack" });
    const progressNode = div({ class: "account-item-stack" });
    const reconcileUpgrades = createStaticRowReconciler(upgradeNode);
    const reconcileBlueShapes = createStaticRowReconciler(blueShapeNode);
    const reconcilePurpleShapes = createStaticRowReconciler(purpleShapeNode);
    const reconcileProgress = createStaticRowReconciler(progressNode);

    const reconcileRows = (reconciler, entries) => {
        reconciler(entries.map((entry) => `${entry.key}:${entry.name}`).join("|"), () =>
            entries.map((entry) =>
                SimpleNumberRow({
                    entry,
                    valueState: getOrCreateState(valueStates, entry.key),
                })
            )
        );
        for (const entry of entries) getOrCreateState(valueStates, entry.key).val = entry.value;
    };

    const load = async () =>
        run(async () => {
            const optionIndices = [
                DAILY_PURCHASES_INDEX,
                ...Array.from({ length: TOTAL_KILLS_INDEX - UPGRADE_START + 1 }, (_, index) => UPGRADE_START + index),
            ];
            const [options, names, effects, shapeDefinitions] = await Promise.all([
                readGgaEntries("OptionsListAccount", optionIndices.map(String)),
                readCList("RandoListo2[11]"),
                readCList("RandoListo2[12]"),
                readGgaEntries("ItemDefinitionsGET.h", SHAPE_IDS, ["displayName", "DisplayName", "Name", "name"]),
            ]);
            const shapes = buildShapeEntries(options, shapeDefinitions);

            upgradeEntries.val = buildUpgradeEntries(options, names, effects);
            blueShapeEntries.val = shapes.slice(0, SHAPES_PER_COLOR);
            purpleShapeEntries.val = shapes.slice(SHAPES_PER_COLOR);
            progressEntries.val = buildProgressEntries(options, shapes);

            reconcileRows(reconcileUpgrades, upgradeEntries.val);
            reconcileRows(reconcileBlueShapes, blueShapeEntries.val);
            reconcileRows(reconcilePurpleShapes, purpleShapeEntries.val);
            reconcileRows(reconcileProgress, progressEntries.val);
        });

    load();

    return PersistentAccountListPage({
        title: "CRYSTAL COVE",
        description:
            "Edit Crystal Glunko Cove upgrades, shape resources, focus selections, and progress from OptionsListAccount.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING CRYSTAL GLUNKO COVE",
        errorTitle: "CRYSTAL GLUNKO COVE READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "PROGRESS",
                note: () => `${progressEntries.val.length} ROWS`,
                body: progressNode,
            }),
            AccountSection({
                title: "UPGRADES",
                note: () => `${upgradeEntries.val.length} RELEASED`,
                body: upgradeNode,
            }),
            AccountSection({
                title: "BLUE SHAPES",
                note: () => `${blueShapeEntries.val.length} SHAPES`,
                body: blueShapeNode,
            }),
            AccountSection({
                title: "PURPLE SHAPES",
                note: () => `${purpleShapeEntries.val.length} SHAPES`,
                body: purpleShapeNode,
            })
        ),
    });
};
