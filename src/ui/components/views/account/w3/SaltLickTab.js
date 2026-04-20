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
import { gga, ggaMany, readCList } from "../../../../services/api.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { FeatureBulkActionBar } from "../FeatureBulkActionBar.js";
import { useAccountLoadState } from "../accountLoadPolicy.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { AsyncFeatureBody, toNum, useWriteStatus, writeVerified } from "../featureShared.js";

const { div, span } = van.tags;

const toLevelInt = (value, maxLevel) => {
    const n = Math.trunc(toNum(value));
    const cap = Math.max(0, Math.trunc(toNum(maxLevel)));
    return Math.max(0, Math.min(cap, n));
};

const SaltLickRow = ({ index, name, maxLevel, levelState }) =>
    EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) => toLevelInt(rawValue, maxLevel),
        write: async (nextLevel) => {
            const path = `SaltLick[${index}]`;
            return writeVerified(path, nextLevel, {
                message: `Write mismatch at ${path}: expected ${nextLevel}, got failed verification`,
            });
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

export const SaltLickTab = () => {
    const { loading, error, run } = useAccountLoadState({ label: "Salt Lick" });
    const data = van.state(null);
    const { status: bulkStatus, run: runBulk } = useWriteStatus();
    const levelStates = [];

    const getLevelState = (i) => {
        if (!levelStates[i]) levelStates[i] = van.state(0);
        return levelStates[i];
    };

    const doSetAll = async (targetLevel) => {
        if (!data.val || data.val.upgrades.length === 0) return;
        await runBulk(async () => {
            const upgrades = data.val.upgrades;
            const expectedLevels = upgrades.map((u) =>
                toLevelInt(targetLevel === null ? u.maxLevel : targetLevel, u.maxLevel)
            );
            const writes = [];
            for (let i = 0; i < upgrades.length; i++) {
                if (Number(getLevelState(i).val ?? 0) === expectedLevels[i]) continue;
                writes.push({ path: `SaltLick[${i}]`, value: expectedLevels[i] });
            }
            if (writes.length > 0) {
                const result = await ggaMany(writes);
                const failed = result.results.filter((entry) => !entry.ok);
                if (failed.length > 0) {
                    const failedWrite = writes.find((entry) => entry.path === failed[0].path);
                    throw new Error(
                        `Write mismatch at ${failed[0].path}: expected ${failedWrite?.value ?? "unknown"}, got failed verification`
                    );
                }
            }
            for (let i = 0; i < upgrades.length; i++) {
                getLevelState(i).val = expectedLevels[i];
            }
        });
    };

    const load = async () =>
        run(async () => {
                const [rawLevels, rawDefs] = await Promise.all([gga("SaltLick"), readCList("SaltLicks")]);

                const defs = toIndexedArray(rawDefs ?? []);
                const upgrades = defs.map((entry, i) => {
                    const entryArr = toIndexedArray(entry ?? []);
                    const name = String(entryArr[1] ?? `Salt Lick ${i + 1}`)
                        .replace(/\+\{/g, "")
                        .replace(/_/g, " ")
                        .trim();
                    const maxLevel = Math.max(0, Math.trunc(toNum(entryArr[4])));
                    return { name, maxLevel };
                });

                const rawArr = toIndexedArray(rawLevels ?? []);
                const nextLevels = upgrades.map((u, i) => toLevelInt(rawArr[i], u.maxLevel));
                nextLevels.forEach((level, i) => {
                    getLevelState(i).val = level;
                });

                data.val = { upgrades };
        });

    load();

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        isEmpty: (resolved) => !resolved.upgrades.length,
        renderEmpty: () =>
            EmptyState({ icon: Icons.SearchX(), title: "NO DATA", subtitle: "No Salt Lick data found." }),
        renderContent: (resolved) =>
            div(
                { class: "feature-list" },
                ...resolved.upgrades.map((u, i) =>
                    SaltLickRow({
                        index: i,
                        name: u.name,
                        maxLevel: u.maxLevel,
                        levelState: getLevelState(i),
                    })
                )
            ),
    });

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "SALT LICK",
            description: "Set Salt Lick upgrade levels.",
            wrapActions: false,
            actions: FeatureBulkActionBar({
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
        }),
        body: renderBody,
    });
};
