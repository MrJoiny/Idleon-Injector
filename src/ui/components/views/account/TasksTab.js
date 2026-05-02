import van from "../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../services/api.js";
import { toIndexedArray } from "../../../utils/index.js";
import { SimpleNumberRow } from "./SimpleNumberRow.js";
import { ClampedLevelRow } from "./ClampedLevelRow.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { cleanName, cleanNameEffect, createStaticRowReconciler, getOrCreateState, toInt } from "./accountShared.js";
import { RefreshButton } from "./components/AccountPageChrome.js";
import { AccountSection } from "./components/AccountSection.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div, span } = van.tags;

const WORLD_TABS = [
    { id: "w1", label: "W1", worldIndex: 0 },
    { id: "w2", label: "W2", worldIndex: 1 },
    { id: "w3", label: "W3", worldIndex: 2 },
    { id: "w4", label: "W4", worldIndex: 3 },
    { id: "w5", label: "W5", worldIndex: 4 },
    { id: "w6", label: "W6", worldIndex: 5 },
    { id: "w7", label: "W7", worldIndex: 6 },
];

const WORLD_FEATURE_TABS = [
    { id: "tasks", label: "TASKS", component: (worldIndex) => TasksWorldTasksTab({ worldIndex }) },
    { id: "achievements", label: "ACHIEVEMENTS", component: (worldIndex) => TasksWorldAchievementsTab({ worldIndex }) },
    { id: "merit-shop", label: "MERIT SHOP", component: (worldIndex) => TasksWorldMeritShopTab({ worldIndex }) },
];

const TASK_LIMIT_PER_WORLD = 8;
const ACHIEVEMENTS_PER_WORLD = 70;

const joinDescription = (first, second) =>
    [first, second]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" ");

const buildTaskEntries = (worldIndex, rawProgress, rawCompletions, rawDescriptions) => {
    const progress = toIndexedArray(rawProgress ?? []);
    const completions = toIndexedArray(rawCompletions ?? []);

    return toIndexedArray(rawDescriptions ?? [])
        .slice(0, TASK_LIMIT_PER_WORLD)
        .map((rawDefinition, index) => {
            const definition = toIndexedArray(rawDefinition ?? []);
            const rawName = String(definition[0] ?? "").trim();
            const stageTargets = definition
                .slice(5)
                .filter((target) => target !== null && target !== undefined && String(target).trim() !== "");
            const currentCompleted = toInt(completions[index], { min: 0 });
            const nextTarget = stageTargets[Math.min(currentCompleted, Math.max(0, stageTargets.length - 1))];

            return {
                index,
                rawName: rawName || `Task ${index + 1}`,
                name: cleanNameEffect(rawName, `Task ${index + 1}`),
                path: `Tasks[1][${worldIndex}][${index}]`,
                completed: currentCompleted,
                maxStages: stageTargets.length,
                progress: progress[index],
                nextTarget,
            };
        });
};

const TaskRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry: {
            index: entry.index + 1,
            name: entry.name,
            path: entry.path,
            formatted: false,
            min: 0,
            max: entry.maxStages,
            subLabel: () => {
                const parts = [`Progress ${entry.progress ?? 0}`];
                if (entry.nextTarget !== null && entry.nextTarget !== undefined)
                    parts.push(`Target ${entry.nextTarget}`);
                return parts.join(" / ");
            },
            badge: (currentValue) => `${currentValue ?? 0} / ${entry.maxStages} DONE`,
            maxAction: {
                value: entry.maxStages,
                tooltip: `Set completed stages to ${entry.maxStages}`,
            },
            resetAction: true,
        },
        valueState,
    });

const TasksWorldTasksTab = ({ worldIndex }) => {
    const worldLabel = `W${worldIndex + 1}`;
    const { loading, error, run } = useAccountLoad({ label: `${worldLabel} Tasks` });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawProgress, rawCompletions, rawDescriptions] = await Promise.all([
                gga(`Tasks[0][${worldIndex}]`),
                gga(`Tasks[1][${worldIndex}]`),
                readCList(`TaskDescriptions[${worldIndex}]`),
            ]);

            entries.val = buildTaskEntries(worldIndex, rawProgress, rawCompletions, rawDescriptions);
            reconcileRows(entries.val.map((entry) => entry.rawName).join("|"), () =>
                entries.val.map((entry) =>
                    TaskRow({
                        entry,
                        valueState: getOrCreateState(valueStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(valueStates, entry.index).val = entry.completed;
            }
        });

    load();

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "TASKS",
            note: () => `${entries.val.length} TASKS FROM Tasks[1][${worldIndex}]`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: `${worldLabel} TASKS`,
        description: "Edit completed task stages. Stage caps come from TaskDescriptions.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: `READING ${worldLabel} TASKS`,
        errorTitle: `${worldLabel} TASKS READ FAILED`,
        initialWrapperClass: "scrollable-panel",
        body,
    });
};

const resolveAchievementIndexes = (worldIndex, rawOrdering, rawAchievements) => {
    const achievements = toIndexedArray(rawAchievements ?? []);
    const orderingByWorld = toIndexedArray(rawOrdering ?? []);
    const ordered = toIndexedArray(orderingByWorld[worldIndex] ?? []);
    const worldOffset = worldIndex * ACHIEVEMENTS_PER_WORLD;
    const worldEnd = worldOffset + ACHIEVEMENTS_PER_WORLD;

    if (ordered.length) {
        return ordered
            .map((rawIndex) => {
                const orderedIndex = Number(rawIndex);
                if (!Number.isFinite(orderedIndex)) return null;
                if (orderedIndex >= worldOffset && orderedIndex < worldEnd) return orderedIndex;
                if (orderedIndex >= 0 && orderedIndex < ACHIEVEMENTS_PER_WORLD) return worldOffset + orderedIndex;
                return null;
            })
            .filter((globalIndex) => globalIndex !== null && achievements[globalIndex]);
    }

    return achievements.slice(worldOffset, worldEnd).map((_, localIndex) => worldOffset + localIndex);
};

const buildAchievementEntries = (worldIndex, rawValues, rawAchievements, rawOrdering) => {
    const values = toIndexedArray(rawValues ?? []);
    const achievements = toIndexedArray(rawAchievements ?? []);

    return resolveAchievementIndexes(worldIndex, rawOrdering, rawAchievements)
        .map((globalIndex) => {
            const definition = toIndexedArray(achievements[globalIndex] ?? []);
            const rawName = String(definition[0] ?? "").trim();
            if (!rawName || rawName === "FILLERZZZ_ACH") return null;

            return {
                index: globalIndex,
                rawName,
                name: cleanName(rawName, `Achievement ${globalIndex + 1}`),
                path: `AchieveReg[${globalIndex}]`,
                value: toInt(values[globalIndex], { fallback: 0 }),
            };
        })
        .filter(Boolean);
};

const AchievementRow = ({ entry, valueState }) =>
    SimpleNumberRow({
        entry: {
            index: entry.index,
            name: entry.name,
            path: entry.path,
            formatted: false,
            min: -1,
            badge: (currentValue) => (Number(currentValue) === -1 ? "COMPLETE" : `PROGRESS ${currentValue ?? 0}`),
            maxAction: {
                label: "DONE",
                value: -1,
                tooltip: "Set achievement status to complete (-1)",
            },
            resetAction: true,
        },
        valueState,
    });

const TasksWorldAchievementsTab = ({ worldIndex }) => {
    const worldLabel = `W${worldIndex + 1}`;
    const { loading, error, run } = useAccountLoad({ label: `${worldLabel} Achievements` });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack account-item-stack--dense" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawValues, rawAchievements, rawOrdering] = await Promise.all([
                gga("AchieveReg"),
                readCList("RegAchieves"),
                readCList("AchieveOrderingz"),
            ]);

            entries.val = buildAchievementEntries(worldIndex, rawValues, rawAchievements, rawOrdering);
            reconcileRows(entries.val.map((entry) => `${entry.index}:${entry.rawName}`).join("|"), () =>
                entries.val.map((entry) =>
                    AchievementRow({
                        entry,
                        valueState: getOrCreateState(valueStates, entry.index),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(valueStates, entry.index).val = entry.value;
            }
        });

    load();

    const completedCount = van.derive(
        () => entries.val.filter((entry) => getOrCreateState(valueStates, entry.index).val === -1).length
    );

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "ACHIEVEMENTS",
            note: () => `${completedCount.val} / ${entries.val.length} COMPLETE`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: `${worldLabel} ACHIEVEMENTS`,
        description: "Edit achievement progress from AchieveReg. A value of -1 marks an achievement complete.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: `READING ${worldLabel} ACHIEVEMENTS`,
        errorTitle: `${worldLabel} ACHIEVEMENTS READ FAILED`,
        initialWrapperClass: "scrollable-panel",
        body,
    });
};

const getShopDefinitionsForWorld = (rawDefinitions, worldIndex) => {
    const definitionWorlds = toIndexedArray(rawDefinitions ?? []);
    const worldDefinitions = toIndexedArray(definitionWorlds[worldIndex] ?? []);
    const offset = definitionWorlds
        .slice(0, worldIndex)
        .reduce((total, rawWorldDefinitions) => total + toIndexedArray(rawWorldDefinitions ?? []).length, 0);

    return { worldDefinitions, offset };
};

const resolveShopLevel = (rawPurchases, worldIndex, localIndex, globalIndex) => {
    const purchases = toIndexedArray(rawPurchases ?? []);
    const worldPurchases = toIndexedArray(purchases[worldIndex] ?? []);

    if (worldPurchases.length) {
        return {
            path: `Tasks[2][${worldIndex}][${localIndex}]`,
            value: toInt(worldPurchases[localIndex], { min: 0 }),
        };
    }

    return {
        path: `Tasks[2][${globalIndex}]`,
        value: toInt(purchases[globalIndex], { min: 0 }),
    };
};

const buildMeritShopEntries = (worldIndex, rawPurchases, rawDefinitions) => {
    const { worldDefinitions, offset } = getShopDefinitionsForWorld(rawDefinitions, worldIndex);

    return worldDefinitions
        .map((rawDefinition, localIndex) => {
            const definition = toIndexedArray(rawDefinition ?? []);
            const description = joinDescription(definition[0], definition[1]);
            if (!description) return null;

            const globalIndex = offset + localIndex;
            const level = resolveShopLevel(rawPurchases, worldIndex, localIndex, globalIndex);

            return {
                localIndex,
                globalIndex,
                rawName: description,
                name: cleanNameEffect(description, `Merit ${localIndex + 1}`),
                path: level.path,
                value: level.value,
                maxPurchases: toInt(definition[5], { min: 0 }),
            };
        })
        .filter(Boolean);
};

const MeritShopRow = ({ entry, valueState }) =>
    ClampedLevelRow({
        valueState,
        writePath: entry.path,
        max: entry.maxPurchases,
        integerMode: "round",
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${entry.localIndex + 1}`),
            div({ class: "account-row__name-group" }, span({ class: "account-row__name" }, entry.name)),
        ],
        rowClass: "account-row--wide-controls",
        controlsClass: "account-row__controls--xl",
        renderBadge: (currentValue) => `${currentValue ?? 0} / ${entry.maxPurchases}`,
        maxAction: true,
    });

const TasksWorldMeritShopTab = ({ worldIndex }) => {
    const worldLabel = `W${worldIndex + 1}`;
    const { loading, error, run } = useAccountLoad({ label: `${worldLabel} Merit Shop` });
    const entries = van.state([]);
    const valueStates = new Map();
    const listNode = div({ class: "account-item-stack" });
    const reconcileRows = createStaticRowReconciler(listNode);

    const load = async () =>
        run(async () => {
            const [rawPurchases, rawDefinitions] = await Promise.all([gga("Tasks[2]"), readCList("TaskShopDesc")]);
            entries.val = buildMeritShopEntries(worldIndex, rawPurchases, rawDefinitions);
            reconcileRows(entries.val.map((entry) => `${entry.globalIndex}:${entry.rawName}`).join("|"), () =>
                entries.val.map((entry) =>
                    MeritShopRow({
                        entry,
                        valueState: getOrCreateState(valueStates, entry.globalIndex),
                    })
                )
            );

            for (const entry of entries.val) {
                getOrCreateState(valueStates, entry.globalIndex).val = Math.min(entry.maxPurchases, entry.value);
            }
        });

    load();

    const cappedCount = van.derive(
        () =>
            entries.val.filter((entry) => getOrCreateState(valueStates, entry.globalIndex).val >= entry.maxPurchases)
                .length
    );

    const body = div(
        { class: "scrollable-panel content-stack" },
        AccountSection({
            title: "MERIT SHOP",
            note: () => `${cappedCount.val} / ${entries.val.length} CAPPED`,
            body: listNode,
        })
    );

    return PersistentAccountListPage({
        title: `${worldLabel} MERIT SHOP`,
        description: "Edit merit shop purchases from Tasks[2]. Max purchases come from TaskShopDesc.",
        actions: RefreshButton({ onRefresh: load, disabled: () => loading.val }),
        state: { loading, error },
        loadingText: `READING ${worldLabel} MERIT SHOP`,
        errorTitle: `${worldLabel} MERIT SHOP READ FAILED`,
        initialWrapperClass: "scrollable-panel",
        body,
    });
};

const WorldTasksPanel = ({ worldIndex }) => {
    const active = van.state(WORLD_FEATURE_TABS[0].id);

    return div(
        { class: `tab-container w${worldIndex + 1}-world-tab` },
        renderTabNav({
            tabs: WORLD_FEATURE_TABS,
            activeId: active,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: WORLD_FEATURE_TABS,
                activeId: active,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-tasks-panel",
                renderContent: (tab) =>
                    tab.component ? tab.component(worldIndex) : createComingSoonPlaceholder(tab.label),
            })
        )
    );
};

export const TasksTab = () => {
    const activeWorld = van.state(WORLD_TABS[0].id);

    return div(
        { class: "world-tab" },
        renderTabNav({
            tabs: WORLD_TABS,
            activeId: activeWorld,
            navClass: "world-sub-nav",
            buttonClass: (tab) => `account-world-sub-tab-btn w${tab.worldIndex + 1}-world-tab`,
            getButtonProps: (tab) => ({ title: `World ${tab.worldIndex + 1}` }),
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: WORLD_TABS,
                activeId: activeWorld,
                paneClass: "world-sub-pane",
                dataAttr: "data-tasks-world",
                renderContent: (tab) => WorldTasksPanel({ worldIndex: tab.worldIndex }),
            })
        )
    );
};
