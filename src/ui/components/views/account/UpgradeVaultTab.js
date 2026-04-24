/**
 * Upgrade Vault Tab
 *
 * Reads/writes gga.UpgVault[index] for all vault upgrades.
 *
 * Data sources:
 *   cList.UpgradeVault[i][0] = name (underscores + 製 stripped)
 *   cList.UpgradeVault[i][4] = base max level (soft cap)
 *   VaultUpgMaxLV via readComputedMany("summoning", "VaultUpgMaxLV", [[i, 0], ...])
 *                 = real max level (includes Glimbo trade bonuses)
 *   gga.BundlesReceived.h.bon_u
 *                 = Pot Of Gold bundle flag (0 or 1) for +0/+10 max bonus
 *   gga.UpgVault[i]                = current level
 *
 * Write: gga.UpgVault[XX] = YY
 */

import van from "../../../vendor/van-1.6.0.js";
import { gga, readComputedMany } from "../../../services/api.js";
import { withTooltip } from "../../Tooltip.js";
import { ClampedLevelRow } from "./ClampedLevelRow.js";
import { RefreshButton, WarningBanner } from "./components/AccountPageChrome.js";
import { PersistentAccountListPage } from "./components/PersistentAccountListPage.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { cleanName, createIndexedStateGetter, readLevelDefinitions, toNum } from "./accountShared.js";

const { div } = van.tags;

// -- VaultRow --------------------------------------------------------------

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

// -- UpgradeVaultTab -------------------------------------------------------

export const UpgradeVaultTab = () => {
    const data = van.state(null); // { upgrades: [{ index, name, baseMax, realMax }] }
    const { loading, error, run } = useAccountLoad({ label: "Upgrade Vault" });
    const getLevelState = createIndexedStateGetter();

    const load = async () =>
        run(async () => {
            const [upgradeRows, rawBonU] = await Promise.all([
                readLevelDefinitions({
                    levelsPath: "UpgVault",
                    definitionsPath: "UpgradeVault",
                    mapEntry: ({ definition, rawLevel, index }) => {
                        const name = cleanName(definition[0], "", { stripMarker: true });
                        const baseMax = toNum(definition[4]);
                        if (!name || baseMax <= 0) return null;
                        return { index, name, baseMax, level: toNum(rawLevel) };
                    },
                }),
                gga("BundlesReceived.h.bon_u"),
            ]);
            const bonU = Number(rawBonU);
            const bundleBonus = bonU === 1 ? 10 : 0;

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
                realMax: realMaxes[i] + bundleBonus,
            }));

            upgrades.forEach((upgrade) => {
                getLevelState(upgrade.index).val = upgrade.level;
            });

            data.val = { upgrades };
        });

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
        description: "Set levels for all vault upgrades real max includes Glimbo trade bonuses and Pot Of Gold bundle bonus",
        actions: RefreshButton({
            onRefresh: load,
            tooltip: "Re-read vault levels from game memory",
        }),
        topNotices: WarningBanner(
            " Max level is sourced from VaultUpgMaxLV formula plus Pot Of Gold bundle bonus (0 or +10). " +
                "SET accepts any value = 0 no hard upper limit enforced."
        ),
        state: { loading, error },
        body: () => (data.val ? renderBody(data.val) : null),
    });
};
