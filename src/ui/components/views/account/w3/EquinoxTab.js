/**
 * W3 - Equinox Tab
 *
 * Data sources:
 *   gga.Dream[0]                           - current bar fill value
 *   gga.Dream[2]                           - first upgrade level (controls visible cloud count)
 *   gga.Dream[i+2]                         - level of upgrade i
 *   cList.DreamUpg[i][0]       - name of upgrade i
 *   cList.DreamChallenge[i][0] - cloud name (underscore-separated)
 *   cList.DreamChallenge[i][1] - cloud required progress (string int)
 *   gga.WeeklyBoss.h.d_i                   - current cloud progress (-1 = not active)
 *
 * Computed via events(579)._customBlock_Dreamstuff:
 *   readComputed("dream", "BarFillReq", [0])   - bar fill requirement
 *   readComputed("dream", "BarFillRate", [0])  - fill rate
 *   readComputed("dream", "UpgUnlocked", [0])  - number of unlocked upgrades
 *   readComputed("dream", "UpgMaxLV", [i])     - max level for upgrade i
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputed, readComputedMany, gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { AccountRow } from "../components/AccountRow.js";
import { ActionButton } from "../components/ActionButton.js";
import { AccountSection } from "../components/AccountSection.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import { cleanName, createStaticRowReconciler, getOrCreateState, toInt, toNum, useWriteStatus, writeVerified } from "../accountShared.js";

const { div, span } = van.tags;

const fmtInt = (value) => String(toInt(value, { mode: "floor" }));

const getVisibleCloudIndexes = (firstUpgLevel, dreamChallengeArr, weeklyBossMap) => {
    const visibleCount = Math.max(0, Math.min(5, toInt(firstUpgLevel, { mode: "floor" })));
    const out = [];

    for (let i = 0; i < dreamChallengeArr.length && out.length < visibleCount; i++) {
        if (toNum(weeklyBossMap[`d_${i}`]) !== -1) out.push(i);
    }

    return out;
};

const EquinoxBar = ({ barFillState, barFillReqState, barFillRateState, fillBarStatus, doFillBar }) => {
    const barFill = div({
        class: () => {
            const full = barFillReqState.val > 0 && barFillState.val >= barFillReqState.val;
            return `equinox-bar__fill${full ? " equinox-bar__fill--full" : ""}`;
        },
    });

    van.derive(() => {
        const pct = barFillReqState.val > 0 ? Math.min(100, (barFillState.val / barFillReqState.val) * 100) : 100;
        barFill.style.setProperty("--equinox-fill-width", `${pct}%`);
    });

    return div(
        { class: "equinox-overview" },
        div(
            { class: "equinox-overview__row" },
            span({ class: "equinox-overview__label" }, "DREAM BAR"),
            span(
                { class: "equinox-overview__value" },
                () => `${fmtInt(barFillState.val)} / ${fmtInt(barFillReqState.val)}`
            ),
            span({ class: "equinox-overview__rate" }, () => `+${fmtInt(barFillRateState.val)} / hr`),
            ActionButton({
                label: () => (fillBarStatus.val === "success" ? "FILLED!" : "FILL BAR"),
                status: fillBarStatus,
                tooltip: "Fill the Dream Bar to the current requirement",
                onClick: (e) => {
                    e.preventDefault();
                    doFillBar();
                },
            })
        ),
        div({ class: "equinox-bar" }, barFill)
    );
};

const SectionCount = ({ countState, activeSuffix, emptySuffix }) =>
    span(
        {
            class: () => `equinox-section-count${countState.val > 0 ? "" : " equinox-section-count--empty"}`,
        },
        () => (countState.val > 0 ? `${countState.val} ${activeSuffix}` : emptySuffix)
    );

const CloudRow = ({ entry }) => {
    const { status, run } = useWriteStatus();

    const doComplete = async () => {
        await run(async () => {
            const path = `WeeklyBoss.h.d_${entry.cloudIndex}`;
            const required = toInt(entry.requiredState.val, { mode: "floor" });
            await writeVerified(path, required, {
                message: `Write mismatch at ${path}: expected ${required}, got failed verification`,
            });
            entry.progressState.val = required;
        });
    };

    return AccountRow({
        rowClass: entry.cloudIndex >= 35 ? "cloud-row--nightmare" : "",
        info: [
            span({ class: "account-row__index" }, `#${entry.cloudIndex + 1}`),
            span({ class: "account-row__name" }, entry.name),
        ],
        badge: () => `${fmtInt(entry.progressState.val)} / ${fmtInt(entry.requiredState.val)}`,
        controls: ActionButton({
            label: "COMPLETE",
            status,
            tooltip: "Set cloud progress to required value",
            onClick: (e) => {
                e.preventDefault();
                doComplete();
            },
        }),
    });
};

const UpgradeRow = ({ entry, onAfterSet }) =>
    ClampedLevelRow({
        valueState: entry.levelState,
        max: entry.maxLevelState,
        integerMode: "floor",
        write: async (nextLevel) => {
            const path = `Dream[${entry.index + 2}]`;
            const verified = await writeVerified(path, nextLevel, {
                message: `Write mismatch at ${path}: expected ${nextLevel}, got failed verification`,
            });
            await onAfterSet();
            return verified;
        },
        indexLabel: `#${entry.index + 1}`,
        name: entry.name,
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / ${entry.maxLevelState.val}`,
    });

const buildStaticMeta = async () => {
    const [rawDreamUpg, rawDreamChallenge] = await Promise.all([readCList("DreamUpg"), readCList("DreamChallenge")]);

    return {
        dreamUpgArr: toIndexedArray(rawDreamUpg ?? []),
        dreamChallengeArr: toIndexedArray(rawDreamChallenge ?? []),
    };
};

export const EquinoxTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Equinox" });
    const { status: fillBarStatus, run: fillBarRun } = useWriteStatus();

    const barFillState = van.state(0);
    const barFillReqState = van.state(0);
    const barFillRateState = van.state(0);
    const cloudCountState = van.state(0);
    const upgradeCountState = van.state(0);

    const cloudProgressStates = new Map();
    const cloudRequiredStates = new Map();
    const upgradeLevelStates = new Map();
    const upgradeMaxLevelStates = new Map();

    const cloudRowsNode = div({ class: "content-stack" });
    const upgradeRowsNode = div({ class: "content-stack" });

    let staticMeta = null;

    const getCloudProgressState = (index) => getOrCreateState(cloudProgressStates, index);
    const getCloudRequiredState = (index) => getOrCreateState(cloudRequiredStates, index);
    const getUpgradeLevelState = (index) => getOrCreateState(upgradeLevelStates, index);
    const getUpgradeMaxLevelState = (index) => getOrCreateState(upgradeMaxLevelStates, index);

    const reconcileCloudRows = createStaticRowReconciler(cloudRowsNode);
    const reconcileUpgradeRows = createStaticRowReconciler(upgradeRowsNode);

    const updateCloudRows = (visibleIndexes, weeklyBossMap, dreamChallengeArr) => {
        const clouds = visibleIndexes.map((index) => {
            const row = toIndexedArray(dreamChallengeArr[index] ?? []);
            return {
                cloudIndex: index,
                name: cleanName(row[0], "Unknown"),
                required: toInt(row[1], { mode: "floor" }),
                progress: toInt(weeklyBossMap[`d_${index}`] ?? 0, { mode: "floor" }),
            };
        });

        cloudCountState.val = clouds.length;

        for (const cloud of clouds) {
            getCloudProgressState(cloud.cloudIndex).val = cloud.progress;
            getCloudRequiredState(cloud.cloudIndex).val = cloud.required;
        }

        reconcileCloudRows(
            clouds.map((cloud) => `${cloud.cloudIndex}:${cloud.name}`).join("|"),
            () =>
                clouds.map((cloud) =>
                    CloudRow({
                        entry: {
                            cloudIndex: cloud.cloudIndex,
                            name: cloud.name,
                            progressState: getCloudProgressState(cloud.cloudIndex),
                            requiredState: getCloudRequiredState(cloud.cloudIndex),
                        },
                    })
                )
        );
    };

    const updateUpgradeRows = (upgrades) => {
        upgradeCountState.val = upgrades.length;

        for (const upgrade of upgrades) {
            getUpgradeLevelState(upgrade.index).val = upgrade.level;
            getUpgradeMaxLevelState(upgrade.index).val = upgrade.maxLevel;
        }

        reconcileUpgradeRows(
            upgrades.map((upgrade) => `${upgrade.index}:${upgrade.name}`).join("|"),
            () =>
                upgrades.map((upgrade) =>
                    UpgradeRow({
                        entry: {
                            index: upgrade.index,
                            name: upgrade.name,
                            levelState: getUpgradeLevelState(upgrade.index),
                            maxLevelState: getUpgradeMaxLevelState(upgrade.index),
                        },
                        onAfterSet: refreshAfterUpgrade,
                    })
                )
        );
    };

    const refreshAfterUpgrade = async () => {
        try {
            const [rawDream, rawWeeklyBoss, newBarFillReq] = await Promise.all([
                gga("Dream"),
                gga("WeeklyBoss.h").catch(() => ({})),
                readComputed("dream", "BarFillReq", [0]).catch(() => barFillReqState.val),
            ]);

            const dreamArr = toIndexedArray(rawDream ?? []);
            const weeklyBossMap = rawWeeklyBoss ?? {};
            barFillReqState.val = toInt(newBarFillReq, { mode: "floor" });

            const visibleIndexes = getVisibleCloudIndexes(
                toInt(dreamArr[2], { mode: "floor" }),
                staticMeta?.dreamChallengeArr ?? [],
                weeklyBossMap
            );
            updateCloudRows(visibleIndexes, weeklyBossMap, staticMeta?.dreamChallengeArr ?? []);
        } catch {
            return;
        }
    };

    const doFillBar = () =>
        fillBarRun(async () => {
            const req = barFillReqState.val;
            if (!req) return;

            await writeVerified("Dream[0]", req, {
                message: `Write mismatch at Dream[0]: expected ${req}, got failed verification`,
            });
            barFillState.val = req;
        });

    const load = async () =>
        run(async () => {
            if (!staticMeta) staticMeta = await buildStaticMeta();

            const [rawDream, rawWeeklyBoss, barFillReq, barFillRate, upgUnlocked] = await Promise.all([
                gga("Dream"),
                gga("WeeklyBoss.h"),
                readComputed("dream", "BarFillReq", [0]),
                readComputed("dream", "BarFillRate", [0]),
                readComputed("dream", "UpgUnlocked", [0]),
            ]);

            const dreamArr = toIndexedArray(rawDream ?? []);
            const weeklyBossMap = rawWeeklyBoss ?? {};
            const upgradeCount = toInt(upgUnlocked, { mode: "floor" });
            const computedResults = await readComputedMany(
                "dream",
                "UpgMaxLV",
                Array.from({ length: upgradeCount }, (_, index) => [index])
            );

            const upgrades = Array.from({ length: upgradeCount }, (_, index) => {
                const item = computedResults[index];
                if (!item?.ok) throw new Error(`UpgMaxLV failed for upgrade ${index}`);

                return {
                    index,
                    name: cleanName(toIndexedArray(staticMeta.dreamUpgArr[index] ?? [])[0], `Upgrade ${index + 1}`),
                    maxLevel: toInt(item.value, { mode: "floor" }),
                    level: toInt(dreamArr[index + 2], { mode: "floor" }),
                };
            });
            const visibleIndexes = getVisibleCloudIndexes(
                toInt(dreamArr[2], { mode: "floor" }),
                staticMeta.dreamChallengeArr,
                weeklyBossMap
            );

            barFillState.val = toInt(dreamArr[0], { mode: "floor" });
            barFillReqState.val = toInt(barFillReq, { mode: "floor" });
            barFillRateState.val = toInt(barFillRate, { mode: "floor" });
            updateUpgradeRows(upgrades);
            updateCloudRows(visibleIndexes, weeklyBossMap, staticMeta.dreamChallengeArr);
        });

    load();

    const content = div(
        { class: "equinox-content" },
        EquinoxBar({ barFillState, barFillReqState, barFillRateState, fillBarStatus, doFillBar }),
        AccountSection({
            title: "CLOUDS",
            note: "You will have to claim rewards in-game. You can only set progress here.",
            meta: SectionCount({
                countState: cloudCountState,
                activeSuffix: "ACTIVE",
                emptySuffix: "NONE VISIBLE",
            }),
            body: [
                WarningBanner(
                    "Setting progress only edits the tracker value. It does not perform the actual in-game action."
                ),
                cloudRowsNode,
            ],
        }),
        AccountSection({
            title: "UPGRADES",
            meta: SectionCount({
                countState: upgradeCountState,
                activeSuffix: "UNLOCKED",
                emptySuffix: "NONE UNLOCKED",
            }),
            body: upgradeRowsNode,
        })
    );

    return PersistentAccountListPage({
        rootClass: "tab-container scroll-container",
        title: "EQUINOX",
        description: "Dream bar fill, active clouds, and upgrade levels.",
        actions: RefreshButton({
            onRefresh: load,
            disabled: () => loading.val,
            tooltip: "Re-read Equinox values from game memory",
        }),
        state: { loading, error },
        loadingText: "READING EQUINOX",
        errorTitle: "EQUINOX READ FAILED",
        body: content,
    });
};
