import van from "../../../../../vendor/van-1.6.0.js";
import { gga, readCList, readComputed, readComputedMany } from "../../../../../services/api.js";
import { toIndexedArray } from "../../../../../utils/index.js";
import { ClampedLevelRow } from "../../ClampedLevelRow.js";
import { SimpleNumberRow } from "../../SimpleNumberRow.js";
import { useAccountLoad } from "../../accountLoadPolicy.js";
import {
    cleanName,
    createStaticRowReconciler,
    getOrCreateState,
    largeFormatter,
    toInt,
    toNum,
    writeVerified,
} from "../../accountShared.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountRow } from "../../components/AccountRow.js";
import { AccountSection } from "../../components/AccountSection.js";
import { PersistentAccountListPage } from "../../components/PersistentAccountListPage.js";

const { div, span } = van.tags;

const RANK_PATH = "CookMaster[1][0]";
const EXP_PATH = "CookMaster[1][1]";
const RESPEC_PATH = "CookMaster[1][2]";
const LADLES_PATH = "CookMaster[1][3]";
const PURPLE_PATH = "CookMaster[2]";
const MEAL_MASTERY_PATH = "CookMaster[0]";
const PURPLE_EFFECTS = [
    (value) => `+${value}% EXP per power of 10 lifetime ladles`,
    (value) => `+${value}% EXP per account Cooking level above 1000`,
    (value) => `+${value}% EXP per Divorce Cake level above 75`,
    () => "Raises the daily Cooking Ribbon rank-up chance",
    (value) => `+${value}% EXP per total meal Ribbon rank`,
    (value) => `+${value}% EXP per displayed Mastery rank`,
];

const buildPurpleEntries = (rawNames, rawCoefficients, rawRequirements, rawLevels) => {
    const names = toIndexedArray(rawNames ?? []);
    const coefficients = toIndexedArray(rawCoefficients ?? []);
    const requirements = toIndexedArray(rawRequirements ?? []);
    const levels = toIndexedArray(rawLevels ?? []);

    return names.map((rawName, index) => {
        const coefficient = toNum(coefficients[index], 0);
        const requiredStoredRank = toInt(requirements[index]?.ok ? requirements[index].value : 0, { min: 0 });

        return {
            key: `cooking-mastery-purple-${index}`,
            index,
            name: cleanName(rawName, `Purple Upgrade ${index + 1}`),
            subLabel: `RANK ${requiredStoredRank + 1} · ${PURPLE_EFFECTS[index]?.(coefficient) ?? `${coefficient} per level`}`,
            path: `${PURPLE_PATH}[${index}]`,
            value: toInt(levels[index], { min: 0 }),
            formatted: false,
            badge: (currentValue) => `LV ${currentValue ?? 0}`,
        };
    });
};

const buildMealEntries = (rawMealInfo, rawAllocations, rawMealLevels) => {
    const allocations = toIndexedArray(rawAllocations ?? []);
    const mealLevels = toIndexedArray(rawMealLevels ?? []);

    return toIndexedArray(rawMealInfo ?? [])
        .slice(0, allocations.length)
        .map((rawMeal, index) => {
            const meal = toIndexedArray(rawMeal ?? []);
            const rawName = String(meal[0] ?? "").trim();
            if (!rawName) return null;

            return {
                key: `cooking-mastery-meal-${index}`,
                index,
                name: cleanName(rawName, `Meal ${index + 1}`),
                subLabel: `Current meal level: ${toInt(mealLevels[index], { min: 0 })}`,
                path: `${MEAL_MASTERY_PATH}[${index}]`,
                value: toInt(allocations[index], { min: 0 }),
                formatted: false,
                badge: (currentValue) => {
                    const level = toInt(currentValue, { min: 0 });
                    return `LV ${level} · ${(1 + level / (level + 5)).toFixed(2)}x`;
                },
            };
        })
        .filter(Boolean);
};

const MasteryRankRow = ({ rankState, refreshPointsAfterWrite }) =>
    ClampedLevelRow({
        valueState: rankState,
        min: 1,
        max: Infinity,
        integerMode: "round",
        write: async (displayedRank) => {
            await writeVerified(RANK_PATH, displayedRank - 1);
            await refreshPointsAfterWrite();
            return displayedRank;
        },
        indexLabel: "#0",
        name: "Mastery Rank",
        renderBadge: (currentValue) => `RANK ${currentValue ?? 1}`,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });

const MasteryAllocationRow = ({ entry, valueState, refreshPointsAfterWrite }) =>
    ClampedLevelRow({
        valueState,
        min: 0,
        max: Infinity,
        integerMode: "round",
        write: async (level) => {
            const verified = await writeVerified(entry.path, level);
            await refreshPointsAfterWrite();
            return verified;
        },
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.index}`),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, entry.name),
                span({ class: "account-row__sub-label" }, entry.subLabel)
            ),
        ],
        renderBadge: entry.badge,
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
    });

const RespecStatusRow = ({ respecState }) =>
    AccountRow({
        info: [
            span({ class: "account-row__index" }, "#2"),
            div(
                { class: "account-row__name-group" },
                span({ class: "account-row__name" }, "Daily Respec"),
                span({ class: "account-row__sub-label" }, `${RESPEC_PATH} is managed by the game`)
            ),
        ],
        badge: () => (respecState.val === 0 ? "READY" : "USED"),
        badgeClass: () => (respecState.val === 0 ? "account-row__badge--highlight" : ""),
    });

export const MasteryTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Cooking Mastery" });
    const rankState = van.state(1);
    const expState = van.state(0);
    const ladlesState = van.state(0);
    const respecState = van.state(0);
    const unlockedState = van.state(false);
    const purplePointsState = van.state(0);
    const yellowPointsState = van.state(0);
    const purpleEntries = van.state([]);
    const mealEntries = van.state([]);
    const purpleStates = new Map();
    const mealStates = new Map();
    const purpleNode = div({ class: "account-item-stack" });
    const mealNode = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcilePurpleRows = createStaticRowReconciler(purpleNode);
    const reconcileMealRows = createStaticRowReconciler(mealNode);

    const refreshPoints = async () => {
        const [purple, yellow] = await Promise.all([
            readComputed("cookingMastery", "PtsLeftCook_P"),
            readComputed("cookingMastery", "PtsLeftCook_Y"),
        ]);
        purplePointsState.val = toInt(purple, { min: 0 });
        yellowPointsState.val = toInt(yellow, { min: 0 });
    };
    const refreshPointsAfterWrite = async () => {
        try {
            await refreshPoints();
        } catch {
            // The account write already verified; keep the last counters until the next refresh.
        }
    };

    const expRequirement = () => {
        const storedRank = Math.max(0, toInt(rankState.val, { min: 1 }) - 1);
        const required = 100 * 2.5 ** storedRank * 5 ** Math.max(0, storedRank - 40);
        return Number.isFinite(required) ? largeFormatter(required) : "UNAVAILABLE";
    };

    const load = async () =>
        run(async () => {
            const [rawCookMaster, rawMeals, rawMealInfo, rawPurpleNames, rawPurpleCoefficients, computed] =
                await Promise.all([
                    gga("CookMaster"),
                    gga("Meals[0]"),
                    readCList("MealINFO"),
                    readCList("RandoListo2[9]"),
                    readCList("RandoListo2[8]"),
                    Promise.all([
                        readComputed("cookingMastery", "isMasteryUnlocked"),
                        readComputed("cookingMastery", "PtsLeftCook_P"),
                        readComputed("cookingMastery", "PtsLeftCook_Y"),
                        readComputedMany(
                            "cookingMastery",
                            "RankREQcook",
                            Array.from({ length: 6 }, (_, index) => [index, 0])
                        ),
                    ]),
                ]);
            const cookMaster = toIndexedArray(rawCookMaster ?? []);
            const progress = toIndexedArray(cookMaster[1] ?? []);
            const purpleLevels = toIndexedArray(cookMaster[2] ?? []);
            const mealAllocations = toIndexedArray(cookMaster[0] ?? []);

            rankState.val = toInt(progress[0], { min: 0 }) + 1;
            expState.val = toNum(progress[1], 0);
            respecState.val = toInt(progress[2], { min: 0 });
            ladlesState.val = toNum(progress[3], 0);
            unlockedState.val = toNum(computed[0], 0) > 0;
            purpleEntries.val = buildPurpleEntries(rawPurpleNames, rawPurpleCoefficients, computed[3], purpleLevels);
            mealEntries.val = buildMealEntries(rawMealInfo, mealAllocations, rawMeals);

            reconcilePurpleRows(purpleEntries.val.map((entry) => `${entry.key}:${entry.name}`).join("|"), () =>
                purpleEntries.val.map((entry) =>
                    MasteryAllocationRow({
                        entry,
                        valueState: getOrCreateState(purpleStates, entry.key),
                        refreshPointsAfterWrite,
                    })
                )
            );
            reconcileMealRows(
                mealEntries.val.map((entry) => `${entry.key}:${entry.name}:${entry.subLabel}`).join("|"),
                () =>
                    mealEntries.val.map((entry) =>
                        MasteryAllocationRow({
                            entry,
                            valueState: getOrCreateState(mealStates, entry.key),
                            refreshPointsAfterWrite,
                        })
                    )
            );

            for (const entry of purpleEntries.val) getOrCreateState(purpleStates, entry.key).val = entry.value;
            for (const entry of mealEntries.val) getOrCreateState(mealStates, entry.key).val = entry.value;

            purplePointsState.val = toInt(computed[1], { min: 0 });
            yellowPointsState.val = toInt(computed[2], { min: 0 });
        });

    load();

    const progressEntries = [
        {
            key: "cooking-mastery-exp",
            index: 1,
            name: "Current Mastery EXP",
            path: EXP_PATH,
            formatted: true,
            float: true,
        },
        {
            key: "cooking-mastery-ladles",
            index: 3,
            name: "Lifetime Ladles Used",
            path: LADLES_PATH,
            formatted: true,
        },
    ];

    return PersistentAccountListPage({
        title: "COOKING MASTERY",
        description: "Edit Cooking Mastery rank, EXP, perk levels, and per-meal mastery allocations from CookMaster.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: "READING COOKING MASTERY",
        errorTitle: "COOKING MASTERY READ FAILED",
        initialWrapperClass: "scrollable-panel",
        body: div(
            { class: "scrollable-panel content-stack" },
            AccountSection({
                title: "PROGRESS",
                note: () => `${unlockedState.val ? "UNLOCKED" : "LOCKED"} · NEXT RANK ${expRequirement()} EXP`,
                body: div(
                    { class: "account-item-stack" },
                    MasteryRankRow({ rankState, refreshPointsAfterWrite }),
                    ...progressEntries.map((entry) =>
                        SimpleNumberRow({
                            entry,
                            valueState: entry.key.endsWith("exp") ? expState : ladlesState,
                        })
                    ),
                    RespecStatusRow({ respecState })
                ),
            }),
            AccountSection({
                title: "PURPLE UPGRADES",
                note: () => `${purplePointsState.val} POINTS AVAILABLE`,
                body: purpleNode,
            }),
            AccountSection({
                title: "MEAL MASTERY",
                note: () => `${yellowPointsState.val} POINTS AVAILABLE · ${mealEntries.val.length} MEALS`,
                body: mealNode,
            })
        ),
    });
};
