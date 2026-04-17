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
 * Failed entries fall back to 0 so the tab still renders.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputedMany, gga, readCList } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { FeatureBulkActionBar } from "../FeatureBulkActionBar.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { AsyncFeatureBody, toNum, useWriteStatus } from "../featureShared.js";

const { div, span } = van.tags;

const AtomRow = ({ index, name, maxLevel, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) => {
            const lvl = Math.max(0, Math.min(maxLevel, toNum(rawValue)));
            return Number.isNaN(lvl) ? null : lvl;
        },
        write: async (nextLevel) => {
            const path = `Atoms[${index}]`;
            const ok = await gga(path, nextLevel);
            if (!ok) throw new Error(`Write mismatch at ${path}: expected ${nextLevel}, got failed verification`);
            return nextLevel;
        },
        renderInfo: () => [
            span({ class: "feature-row__index" }, index + 1),
            span({ class: "feature-row__name" }, name),
        ],
        renderBadge: (currentValue) => `LV ${currentValue} / ${maxLevel}`,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = toNum(rawValue, toNum(currentValue, 0));
            return Math.max(0, Math.min(maxLevel, base + delta));
        },
    });

export const AtomColliderTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const data = van.state(null);
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const levelStates = [];

    const getLevelState = (i) => {
        if (!levelStates[i]) levelStates[i] = van.state(0);
        return levelStates[i];
    };

    const doSetAll = async (targetLevel) => {
        if (!data.val || data.val.atoms.length === 0) return;
        await runBulk(async () => {
            const atoms = data.val.atoms;
            const expectedLevels = atoms.map((a) => (targetLevel === null ? a.maxLevel : targetLevel));
            for (let i = 0; i < atoms.length; i++) {
                const path = `Atoms[${i}]`;
                const ok = await gga(path, expectedLevels[i]);
                if (!ok) {
                    throw new Error(
                        `Write mismatch at ${path}: expected ${expectedLevels[i]}, got failed verification`
                    );
                }
                await new Promise((r) => setTimeout(r, 20));
            }
            for (let i = 0; i < atoms.length; i++) {
                getLevelState(i).val = expectedLevels[i];
            }
        });
    };

    const load = async (showSpinner = true) => {
        if (showSpinner) loading.val = true;
        error.val = null;
        try {
            const [rawLevels, rawAtomInfo] = await Promise.all([gga("Atoms"), readCList("AtomInfo")]);

            const atomInfoArr = toIndexedArray(rawAtomInfo ?? []);

            let computedResults = null;
            try {
                computedResults = await readComputedMany(
                    "atomCollider",
                    "AtomMaxLv",
                    atomInfoArr.map((_, i) => [i, 0])
                );
            } catch {
                // Batch read unavailable - fall back to 0 for all rows.
            }

            const maxLevels = atomInfoArr.map((_, i) => {
                const item = computedResults?.[i];
                return item?.ok ? toNum(item.value) : 0;
            });

            const atoms = atomInfoArr.map((entry, i) => {
                const entryArr = toIndexedArray(entry ?? []);
                const name = String(entryArr[0] ?? `Atom ${i + 1}`)
                    .replace(/\+\{/g, "")
                    .replace(/_/g, " ")
                    .trim();
                return { name, maxLevel: maxLevels[i] ?? 0 };
            });

            const rawArr = toIndexedArray(rawLevels ?? []);
            atoms.forEach((_, i) => {
                getLevelState(i).val = toNum(rawArr[i]);
            });

            data.val = { atoms };
        } catch (e) {
            error.val = e?.message ?? "Failed to load";
        } finally {
            if (showSpinner) loading.val = false;
        }
    };

    load(true);

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        renderLoading: () => div({ class: "feature-loader" }, Loader()),
        renderError: (message) => EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: message }),
        isEmpty: (resolved) => !resolved.atoms.length,
        renderEmpty: () =>
            EmptyState({ icon: Icons.SearchX(), title: "NO DATA", subtitle: "No Atom Collider data found." }),
        renderContent: (resolved) =>
            div(
                { class: "feature-list" },
                ...resolved.atoms.map((a, i) =>
                    AtomRow({
                        index: i,
                        name: a.name,
                        maxLevel: a.maxLevel,
                        levelState: getLevelState(i),
                    })
                )
            ),
    });

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "ATOM COLLIDER",
            description: "Set Atom Collider upgrade levels. Max levels are computed from game data.",
            wrapActions: false,
            actions: FeatureBulkActionBar({
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
        body: renderBody,
    });
};
