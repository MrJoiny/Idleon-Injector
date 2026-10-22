/**
 * Upgrade Vault Tab
 *
 * Reads/writes gga.UpgVault[index] for all vault upgrades.
 *
 * Data sources:
 *   cList.UpgradeVault[i][0] = name (underscores + 製 stripped)
 *   cList.UpgradeVault[i][4] = base max level (soft cap)
 *   VaultUpgMaxLV via readComputedMany("summoning", "VaultUpgMaxLV", [[i, 0], ...])
 *                 = real max level (includes applicable trade, bundle, research, and event bonuses)
 *   gga.UpgVault[i]                = current level
 *
 * Write: gga.UpgVault[XX] = YY
 */

import van from "../../../vendor/van-1.6.0.js";
import { readComputedMany } from "../../../services/api.js";
import { withTooltip } from "../../Tooltip.js";
import { BulkActionBar } from "./BulkActionBar.js";
import { ClampedLevelRow } from "./ClampedLevelRow.js";
import { WarningBanner } from "./components/AccountPageChrome.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import {
    cleanName,
    createIndexedStateGetter,
    readLevelDefinitions,
    runBulkSet,
    toNum,
    useWriteStatus,
} from "./accountShared.js";

const { div, span } = van.tags;

const VaultRow = ({ index, name, baseMax, realMax, levelState }) => {
    const maxLabel = realMax !== baseMax ? `${realMax} (base ${baseMax})` : String(realMax);

    return ClampedLevelRow({
        valueState: levelState,
        writePath: `UpgVault[${index}]`,
        max: Infinity,
        indexLabel: `#${index}`,
        name,
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / ${realMax}`,
        wrapApplyButton: (applyButton) => withTooltip(applyButton, `Set level for ${name} (max: ${maxLabel})`),
        maxAction: {
            value: realMax,
            tooltip: `Set to max level (${maxLabel})`,
        },
    });
};

export const UpgradeVaultTab = () => {
    const data = van.state(null);
    const { loading, error, run } = useAccountLoad({ label: "Upgrade Vault" });
    const { status: maxAllStatus, run: runMaxAll } = useWriteStatus();
    const getLevelState = createIndexedStateGetter();

    const load = async () =>
        run(async () => {
            const upgradeRows = await readLevelDefinitions({
                levelsPath: "UpgVault",
                definitionsPath: "UpgradeVault",
                mapEntry: ({ definition, rawLevel, index }) => {
                    const name = cleanName(definition[0], "", { stripMarker: true });
                    const baseMax = toNum(definition[4]);
                    if (!name || baseMax <= 0) return null;
                    return { index, name, baseMax, level: toNum(rawLevel) };
                },
            });

            const argSets = upgradeRows.map((upgrade) => [upgrade.index, 0]);
            const computedResults = await readComputedMany("summoning", "VaultUpgMaxLV", argSets);

            const realMaxes = computedResults.map((item, i) => {
                if (!item?.ok) {
                    throw new Error(`VaultUpgMaxLV failed for upgrade ${upgradeRows[i].index}`);
                }
                const value = toNum(item.value);
                return value > 0 ? value : 0;
            });

            const upgrades = upgradeRows.map((upgrade, i) => ({
                index: upgrade.index,
                name: upgrade.name,
                baseMax: upgrade.baseMax,
                level: upgrade.level,
                realMax: realMaxes[i],
            }));

            upgrades.forEach((upgrade) => {
                getLevelState(upgrade.index).val = upgrade.level;
            });

            data.val = { upgrades };
        });

    const doMaxAll = async () => {
        if (loading.val || error.val || !data.val?.upgrades.length) return;
        await runMaxAll(async () => {
            await runBulkSet({
                entries: data.val.upgrades,
                getTargetValue: (upgrade) => upgrade.realMax,
                getValueState: (upgrade) => getLevelState(upgrade.index),
                getPath: (upgrade) => `UpgVault[${upgrade.index}]`,
            });
        });
    };

    load();

    const renderBody = (resolved) => {
        return div(
            { class: "account-list" },
            ...resolved.upgrades.map((upgrade) =>
                VaultRow({
                    index: upgrade.index,
                    name: upgrade.name,
                    baseMax: upgrade.baseMax,
                    realMax: upgrade.realMax,
                    levelState: getLevelState(upgrade.index),
                })
            )
        );
    };

    return PersistentAccountListPage({
        title: "UPGRADE VAULT",
        description:
            "Set levels for all vault upgrades. Real max includes applicable trade, bundle, research, and event bonuses.",
        wrapActions: false,
        actions: BulkActionBar({
            leading: span({ class: "account-write-feedback", role: "status" }, () => {
                if (maxAllStatus.val === "loading") return "Saving all vault upgrades";
                if (maxAllStatus.val === "success") return "All vault upgrades saved";
                if (maxAllStatus.val === "error") return "Failed to save all vault upgrades";
                return "";
            }),
            actions: [
                {
                    label: "MAX ALL",
                    status: maxAllStatus,
                    disabled: () => loading.val || Boolean(error.val) || !data.val?.upgrades.length,
                    tooltip: "Set all vault upgrades to their real max levels",
                    onClick: doMaxAll,
                },
            ],
            refresh: {
                onClick: load,
                tooltip: "Re-read vault levels from game memory",
                disabled: () => maxAllStatus.val === "loading",
            },
        }),
        topNotices: WarningBanner(
            " Max level is sourced from the game's VaultUpgMaxLV formula. " +
                "SET accepts any value >= 0; no hard upper limit is enforced."
        ),
        state: { loading, error },
        body: () => (data.val ? renderBody(data.val) : null),
    });
};
