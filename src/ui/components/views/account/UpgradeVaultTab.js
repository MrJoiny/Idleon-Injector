/**
 * Upgrade Vault Tab
 *
 * Reads/writes gga.UpgVault[index] for all vault upgrades.
 *
 * Data sources:
 *   cList.UpgradeVault[i][0] = name (underscores + è£½ stripped)
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
import { Icons } from "../../../assets/icons.js";
import { withTooltip } from "../../Tooltip.js";
import { EditableNumberRow } from "./EditableNumberRow.js";
import { AccountPageShell } from "./components/AccountPageShell.js";
import { FeatureTabHeader } from "./components/FeatureTabHeader.js";
import { runAccountLoad } from "./accountLoadPolicy.js";
import { AsyncFeatureBody, cleanName, toNum } from "./featureShared.js";
import { toIndexedArray } from "../../../utils/index.js";

const { div, button, span } = van.tags;

// ── VaultRow ──────────────────────────────────────────────────────────────

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
            const ok = await gga(path, nextLevel);
            if (!ok) throw new Error(`Write mismatch at ${path}`);
            return nextLevel;
        },
        renderInfo: () => [
            span({ class: "feature-row__name" }, name),
            span({ class: "feature-row__index" }, `#${index}`),
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

// ── UpgradeVaultTab ───────────────────────────────────────────────────────

export const UpgradeVaultTab = () => {
    const data = van.state(null); // { upgrades: [{ index, name, baseMax, realMax }] }
    const loading = van.state(false);
    const error = van.state(null);
    const levelStates = [];

    const getLevelState = (index) => {
        if (!levelStates[index]) levelStates[index] = van.state(0);
        return levelStates[index];
    };

    const load = async () =>
        runAccountLoad(
            { loading, error, label: "Upgrade Vault" },
            async () => {
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
        }
        );

    load();

    const renderBody = AsyncFeatureBody({
        loading,
        error,
        data,
        isEmpty: (resolved) => resolved.upgrades.length === 0,
        renderContent: (resolved) =>
            div(
                { class: "feature-list" },
                ...resolved.upgrades.map((upgrade) =>
                    VaultRow({
                        index: upgrade.index,
                        name: upgrade.name,
                        baseMax: upgrade.baseMax,
                        realMax: upgrade.realMax,
                        levelState: getLevelState(upgrade.index),
                    })
                )
            ),
    });

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "UPGRADE VAULT",
            description:
                "Set levels for all vault upgrades — real max includes Glimbo trade bonuses and Pot Of Gold bundle bonus",
            actions: withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read vault levels from game memory"
            ),
        }),
        topNotices: div(
            { class: "warning-banner" },
            Icons.Warning(),
            " Max level is sourced from VaultUpgMaxLV formula plus Pot Of Gold bundle bonus (0 or +10). " +
                "SET accepts any value ≥ 0 — no hard upper limit enforced."
        ),
        body: renderBody,
    });
};
