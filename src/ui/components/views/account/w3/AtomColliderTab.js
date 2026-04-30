/**
 * W3 - Atom Collider Tab
 *
 * Data sources:
 *   gga.Atoms[b]                     - current level of atom b
 *   cList.AtomInfo[b][0] - atom name (underscores -> spaces)
 *
 * Max level is computed via:
 *   readComputedMany("atomCollider", "AtomMaxLv", [[b, 0], ...])
 *
 * Array length is taken from cList.AtomInfo (authoritative source).
 * All per-atom max level requests are batch-fetched during load.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputedMany } from "../../../../services/api.js";
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

const AtomRow = ({ index, name, maxLevel, levelState }) =>
    ClampedLevelRow({
        valueState: levelState,
        writePath: `Atoms[${index}]`,
        max: maxLevel,
        indexLabel: `#${index + 1}`,
        name,
    });

export const AtomColliderTab = () => {
    const { loading, error, run } = useAccountLoad({ label: "Atom Collider" });
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const getLevelState = createIndexedStateGetter();
    const rowList = div({ class: "account-list" });
    let atomsMeta = [];
    const reconcileRows = createStaticRowReconciler(rowList);

    const doSetAll = async (targetLevel) => {
        if (!atomsMeta.length) return;
        await runBulk(async () => {
            await runBulkSet({
                entries: atomsMeta,
                getTargetValue: (atom) => (targetLevel === null ? atom.maxLevel : targetLevel),
                getValueState: (_, index) => getLevelState(index),
                getPath: (_, index) => `Atoms[${index}]`,
            });
        });
    };

    const load = async () =>
        run(async () => {
            const atomRows = await readLevelDefinitions({
                levelsPath: "Atoms",
                definitionsPath: "AtomInfo",
                mapEntry: ({ definition, rawLevel, index }) => ({
                    name: cleanNameEffect(definition[0], `Atom ${index + 1}`),
                    level: toNum(rawLevel),
                }),
            });
            const computedResults = await readComputedMany(
                "atomCollider",
                "AtomMaxLv",
                atomRows.map((_, i) => [i, 0])
            );

            const atoms = atomRows.map((atom, i) => {
                const item = computedResults?.[i];
                if (!item?.ok) {
                    throw new Error(item?.error || `Failed to read AtomMaxLv for atom index ${i}`);
                }
                return { name: atom.name, level: atom.level, maxLevel: toNum(item.value) };
            });

            reconcileRows(atoms.map((atom) => `${atom.name}:${atom.maxLevel}`).join("|"), () =>
                atoms.map((atom, index) =>
                    AtomRow({
                        index,
                        name: atom.name,
                        maxLevel: atom.maxLevel,
                        levelState: getLevelState(index),
                    })
                )
            );

            atoms.forEach((atom, i) => {
                getLevelState(i).val = atom.level;
            });

            atomsMeta = atoms;
        });

    load();

    return PersistentAccountListPage({
        title: "ATOM COLLIDER",
        description: "Set Atom Collider upgrade levels. Max levels are computed from game data.",
        wrapActions: false,
        actions: BulkActionBar({
            actions: [
                {
                    label: "MAX ALL",
                    status: bulkStatus,
                    tooltip: "Set every atom to its computed max level",
                    onClick: () => doSetAll(null),
                },
                {
                    label: "RESET ALL",
                    status: bulkStatus,
                    tooltip: "Reset every atom to 0",
                    onClick: () => doSetAll(0),
                },
            ],
            refresh: {
                onClick: load,
            },
        }),
        state: { loading, error },
        loadingText: "READING ATOM COLLIDER",
        errorTitle: "ATOM COLLIDER READ FAILED",
        initialWrapperClass: "account-list",
        body: rowList,
    });
};
