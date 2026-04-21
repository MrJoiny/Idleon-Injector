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
import { gga, readComputedMany, readCList } from "../../../services/api.js";
import { withTooltip } from "../../Tooltip.js";
import { EditableNumberRow } from "./EditableNumberRow.js";
import { AccountPageShell } from "./components/AccountPageShell.js";
import { RefreshButton, WarningBanner } from "./components/AccountPageChrome.js";
import { AccountTabHeader } from "./components/AccountTabHeader.js";
import { useAccountLoad } from "./accountLoadPolicy.js";
import { cleanName, toNum, writeVerified } from "./accountShared.js";
import { toIndexedArray } from "../../../utils/index.js";

const { div, span } = van.tags;

// -- VaultRow --------------------------------------------------------------

const VaultRow = ({ index, name, baseMax, realMax, levelState }) => {
    const maxLabel = realMax !== baseMax ? `${realMax} (base ${baseMax})` : String(realMax);

    return EditableNumberRow({
        valueState: levelState,
        normalize: (rawValue) => {
            const lvl = Math.max(0, Number(rawValue));
            return Number.isNaN(lvl) ? null : lvl;
        },
        write: async (nextLevel) => {
            const path = `UpgVault[${index}]`;
            return writeVerified(path, nextLevel);
        },
        renderInfo: () => [
            span({ class: "account-row__index" }, `#${index}`),
            span({ class: "account-row__name" }, name),
        ],
        renderBadge: (currentValue) => `LV ${currentValue ?? 0} / ${realMax}`,
        adjustInput: (rawValue, delta, currentValue) => {
            const base = Number(rawValue);
            const next = Number.isFinite(base) ? base : Number(currentValue ?? 0);
            return Math.max(0, next + delta);
        },
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
    const levelStates = [];

    const getLevelState = (index) => {
        if (!levelStates[index]) levelStates[index] = van.state(0);
        return levelStates[index];
    };

    const load = async () =>
        run(async () => {
            const [rawInfo, rawLevels, rawBonU] = await Promise.all([
                readCList("UpgradeVault"),
                gga("UpgVault"),
                gga("BundlesReceived.h.bon_u"),
            ]);
            const bonU = Number(rawBonU);
            const bundleBonus = bonU === 1 ? 10 : 0;

            const info = toIndexedArray(rawInfo ?? []);
            const levels = toIndexedArray(rawLevels ?? []);
            const argSets = info.map((_, i) => [i, 0]);
            const computedResults = await readComputedMany("summoning", "VaultUpgMaxLV", argSets);

            const realMaxes = computedResults.map((item, i) => {
                if (!item?.ok) {
                    throw new Error(`VaultUpgMaxLV failed for upgrade ${i}`);
                }
                const value = toNum(item.value);
                return value > 0 ? value : 0;
            });

            const upgrades = info
                .map((entry, i) => {
                    const name = cleanName(entry?.[0], "", { stripMarker: true });
                    if (!name) return null;
                    const baseMax = toNum(entry?.[4]);
                    if (baseMax <= 0) return null;
                    const computedMax = realMaxes[i];
                    const realMax = computedMax + bundleBonus;
                    return { index: i, name, baseMax, realMax };
                })
                .filter(Boolean);

            upgrades.forEach((upgrade) => {
                getLevelState(upgrade.index).val = toNum(levels?.[upgrade.index]);
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

    return AccountPageShell({
        header: AccountTabHeader({
            title: "UPGRADE VAULT",
            description:
                "Set levels for all vault upgrades real max includes Glimbo trade bonuses and Pot Of Gold bundle bonus",
            actions: RefreshButton({
                onRefresh: load,
                tooltip: "Re-read vault levels from game memory",
            }),
        }),
        topNotices: WarningBanner(
            " Max level is sourced from VaultUpgMaxLV formula plus Pot Of Gold bundle bonus (0 or +10). " +
                "SET accepts any value = 0 no hard upper limit enforced."
        ),
        loadState: { loading, error, data },
        renderBody,
    });
};
