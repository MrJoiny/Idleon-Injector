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
import { readComputedMany, gga, readCList } from "../../../../services/api.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { BulkActionBar } from "../BulkActionBar.js";
import { useAccountLoad } from "../accountLoadPolicy.js";
import { ClampedLevelRow } from "../ClampedLevelRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { cleanNameEffect, runBulkSet, toNum, useWriteStatus } from "../accountShared.js";

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
    const levelStates = [];
    const rowList = div({ class: "account-list" });
    let rowSignature = "";
    let atomsMeta = [];

    const getLevelState = (i) => {
        if (!levelStates[i]) levelStates[i] = van.state(0);
        return levelStates[i];
    };

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
                const [rawLevels, rawAtomInfo] = await Promise.all([gga("Atoms"), readCList("AtomInfo")]);
                const atomInfoArr = toIndexedArray(rawAtomInfo ?? []);
                const computedResults = await readComputedMany(
                    "atomCollider",
                    "AtomMaxLv",
                    atomInfoArr.map((_, i) => [i, 0])
                );

                const maxLevels = atomInfoArr.map((_, i) => {
                    const item = computedResults?.[i];
                    if (!item?.ok) {
                        throw new Error(item?.error || `Failed to read AtomMaxLv for atom index ${i}`);
                    }
                    return toNum(item.value);
                });

                const atoms = atomInfoArr.map((entry, i) => {
                    const entryArr = toIndexedArray(entry ?? []);
                    const name = cleanNameEffect(entryArr[0], `Atom ${i + 1}`);
                    return { name, maxLevel: maxLevels[i] ?? 0 };
                });

                const rawArr = toIndexedArray(rawLevels ?? []);
                const nextLevels = atoms.map((_, i) => toNum(rawArr[i]));

                const nextSignature = atoms.map((a) => `${a.name}:${a.maxLevel}`).join("|");
                if (nextSignature !== rowSignature) {
                    rowList.replaceChildren(
                        ...atoms.map((a, i) =>
                            AtomRow({
                                index: i,
                                name: a.name,
                                maxLevel: a.maxLevel,
                                levelState: getLevelState(i),
                            })
                        )
                    );
                    rowSignature = nextSignature;
                }

                nextLevels.forEach((level, i) => {
                    getLevelState(i).val = level;
                });

                atomsMeta = atoms;
        });

    load();

    return AccountPageShell({
        header: AccountTabHeader({
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
        }),
        persistentState: { loading, error },
        persistentLoadingText: "READING ATOM COLLIDER",
        persistentErrorTitle: "ATOM COLLIDER READ FAILED",
        persistentInitialWrapperClass: "account-list",
        body: rowList,
    });
};


