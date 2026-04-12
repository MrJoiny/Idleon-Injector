/**
 * W3 - Salt Lick Tab
 *
 * Data sources:
 *   gga.SaltLick[n]                   - current level of upgrade n
 *   cList.SaltLicks[n][1] - upgrade name
 *   cList.SaltLicks[n][4] - max level for upgrade n
 *
 * Array length is taken from cList.SaltLicks (authoritative game table).
 * gga.SaltLick may contain more entries than there are actual upgrades — it is
 * implicitly trimmed because load() only iterates over defs.length entries.
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { FeatureBulkActionBar } from "../FeatureBulkActionBar.js";
import { EditableNumberRow } from "../EditableNumberRow.js";
import { AsyncFeatureBody, toNum, useWriteStatus } from "../featureShared.js";

const { div, span, h3, p } = van.tags;

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

export const SaltLickTab = () => {
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
        if (!data.val || data.val.upgrades.length === 0) return;
        await runBulk(async () => {
            const upgrades = data.val.upgrades;
            const expectedLevels = upgrades.map((u) =>
                toLevelInt(targetLevel === null ? u.maxLevel : targetLevel, u.maxLevel)
            );
            for (let i = 0; i < upgrades.length; i++) {
                const path = `SaltLick[${i}]`;
                const ok = await gga(path, expectedLevels[i]);
                if (!ok)
                    throw new Error(
                        `Write mismatch at ${path}: expected ${expectedLevels[i]}, got failed verification`
                    );
                await new Promise((r) => setTimeout(r, 20));
            }
            for (let i = 0; i < upgrades.length; i++) {
                getLevelState(i).val = expectedLevels[i];
            }
        });
    };

    const load = async (showSpinner = true) => {
        if (showSpinner) loading.val = true;
        error.val = null;
        try {
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
            upgrades.forEach((u, i) => {
                getLevelState(i).val = toLevelInt(rawArr[i], u.maxLevel);
            });

            data.val = { upgrades };
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

    return div(
        { class: "tab-container" },
        div(
            { class: "feature-header" },
            div({}, h3({}, "SALT LICK"), p({ class: "feature-header__desc" }, "Set Salt Lick upgrade levels.")),
            FeatureBulkActionBar({
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
            })
        ),
        renderBody
    );
};
