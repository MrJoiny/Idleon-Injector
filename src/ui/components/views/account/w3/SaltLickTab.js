/**
 * W3 - Salt Lick Tab
 *
 * Data sources:
 *   gga.SaltLick[n]                   - current level of upgrade n
 *   cList.SaltLicks[n][1] - upgrade name
 *   cList.SaltLicks[n][4] - max level for upgrade n
 *
 * Array length is taken from cList.SaltLicks (authoritative game table).
 * gga.SaltLick may contain more entries than there are actual upgrades - it is
 * implicitly trimmed because load() only iterates over defs.length entries.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { PersistentAccountListPage } from "../components/PersistentAccountListPage.js";
import {
    cleanNameEffect,
    createIndexedStateGetter,
    createStaticRowReconciler,
    readLevelDefinitions,
    runBulkSet,
    toNum,
    useWriteStatus,
} from "../accountShared.js";

const { div } = van.tags;

const toLevelInt = (value, maxLevel) => {
    const n = Math.trunc(toNum(value));
    const cap = Math.max(0, Math.trunc(toNum(maxLevel)));
    return Math.max(0, Math.min(cap, n));
};

const SaltLickRow = ({ index, name, maxLevel, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `SaltLick[${index}]`,
        max: maxLevel,
        integerMode: "trunc",
        indexLabel: `#${index + 1}`,
        name,
    });

export const SaltLickTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Salt Lick" });
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const getLevelState = createIndexedStateGetter();
    const rowList = div({ class: "account-list" });
    let upgradesMeta = [];
    const reconcileRows = createStaticRowReconciler(rowList);

    const doSetAll = async (targetLevel) => {
        if (!upgradesMeta.length) return;
        await runBulk(async () => {
            await runBulkSet({
                entries: upgradesMeta,
                getTargetValue: (upgrade) =>
                    toLevelInt(targetLevel === null ? upgrade.maxLevel : targetLevel, upgrade.maxLevel),
                getValueState: (_, index) => getLevelState(index),
                getPath: (_, index) => `SaltLick[${index}]`,
            });
        });
    };

    const load = async () =>
        run(async () => {
            const upgrades = await readLevelDefinitions({
                levelsPath: "SaltLick",
                definitionsPath: "SaltLicks",
                mapEntry: ({ definition, rawLevel, index }) => {
                    const maxLevel = Math.max(0, Math.trunc(toNum(definition[4])));
                    return {
                        name: cleanNameEffect(definition[1], `Salt Lick ${index + 1}`),
                        level: toLevelInt(rawLevel, maxLevel),
                        maxLevel,
                    };
                },
            });

            reconcileRows(upgrades.map((upgrade) => `${upgrade.name}:${upgrade.maxLevel}`).join("|"), () =>
                upgrades.map((upgrade, index) =>
                    SaltLickRow({
                        index,
                        name: upgrade.name,
                        maxLevel: upgrade.maxLevel,
                        levelState: getLevelState(index),
                    })
                )
            );

            upgrades.forEach((upgrade, i) => {
                getLevelState(i).val = upgrade.level;
            });

            upgradesMeta = upgrades;
        });

    load();

    return PersistentAccountListPage({
        title: "SALT LICK",
        description: "Set Salt Lick upgrade levels.",
        wrapActions: false,
        actions: BulkActionBar({
            actions: [
                {
                    label: "MAX ALL",
                    status: bulkStatus,
                    tooltip: "Set every Salt Lick upgrade to its max level",
                    onClick: () => doSetAll(null),
                },
                {
                    label: "RESET ALL",
                    status: bulkStatus,
                    tooltip: "Reset every Salt Lick upgrade to 0",
                    onClick: () => doSetAll(0),
                },
            ],
            refresh: {
                onClick: load,
            },
        }),
        state: { loading, error },
        loadingText: "READING SALT LICK",
        errorTitle: "SALT LICK READ FAILED",
        initialWrapperClass: "account-list",
        body: rowList,
    });
};
