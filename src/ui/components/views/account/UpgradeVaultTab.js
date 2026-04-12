/**
 * Upgrade Vault Tab
 *
 * Reads/writes gga.UpgVault[index] for all vault upgrades.
 *
 * Data sources:
 *   cList.UpgradeVault[i][0] = name (underscores + è£½ stripped)
 *   cList.UpgradeVault[i][4] = base max level (soft cap)
 *   VaultUpgMaxLV via readComputed("summoning", "VaultUpgMaxLV", [i, 0])
 *                 = real max level (includes Glimbo trade bonuses)
 *   gga.BundlesReceived.h.bon_u
 *                 = Pot Of Gold bundle flag (0 or 1) for +0/+10 max bonus
 *   gga.UpgVault[i]                = current level
 *
 * Write: gga.UpgVault[XX] = YY
 */

import van from "../../../vendor/van-1.6.0.js";
import { gga, readComputed, readCList } from "../../../services/api.js";
import { Loader } from "../../Loader.js";
import { EmptyState } from "../../EmptyState.js";
import { Icons } from "../../../assets/icons.js";
import { withTooltip } from "../../Tooltip.js";
import { EditableNumberRow } from "./EditableNumberRow.js";
import { cleanName, toNum } from "./featureShared.js";

const { div, button, span, h3, p } = van.tags;

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

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const toArr = (raw) =>
                Array.isArray(raw)
                    ? raw
                    : Object.keys(raw)
                          .sort((a, b) => Number(a) - Number(b))
                          .map((k) => raw[k]);

            const [rawInfo, rawLevels, rawBonU] = await Promise.all([
                readCList("UpgradeVault"),
                gga("UpgVault"),
                gga("BundlesReceived.h.bon_u").catch(() => 0),
            ]);
            const bonU = Number(rawBonU);
            const bundleBonus = bonU === 1 ? 10 : 0;

            const info = toArr(rawInfo ?? []);
            const levels = toArr(rawLevels ?? []);

            // Probe whether the summoning computed namespace is available (requires injector restart
            // after the summoning namespace was added to stateAccessors). If the probe succeeds,
            // fetch real max levels for all upgrades; otherwise fall back to baseMax for all.
            let useComputed = false;
            try {
                await readComputed("summoning", "VaultUpgMaxLV", [0, 0]);
                useComputed = true;
            } catch {
                // Summoning namespace unavailable — injector restart required, silently use baseMax
            }

            const realMaxes = useComputed
                ? await Promise.all(
                      info.map(async (_, i) => {
                          try {
                              const v = toNum(await readComputed("summoning", "VaultUpgMaxLV", [i, 0]));
                              return v > 0 ? v : null;
                          } catch {
                              return null;
                          }
                      })
                  )
                : info.map(() => null);

            const upgrades = info
                .map((entry, i) => {
                    const name = cleanName(entry?.[0], "", { stripMarker: true });
                    if (!name) return null;
                    const baseMax = toNum(entry?.[4]);
                    if (baseMax <= 0) return null;
                    const computedMax = realMaxes[i] ?? baseMax;
                    const realMax = computedMax + bundleBonus;
                    return { index: i, name, baseMax, realMax };
                })
                .filter(Boolean);

            upgrades.forEach((upgrade) => {
                getLevelState(upgrade.index).val = toNum(levels?.[upgrade.index]);
            });

            data.val = { upgrades };
        } catch (e) {
            error.val = e.message || "Failed to read Upgrade Vault data";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div(
        { class: "world-feature scroll-container" },

        div(
            { class: "feature-header" },
            div(
                null,
                h3("UPGRADE VAULT"),
                p(
                    { class: "feature-header__desc" },
                    "Set levels for all vault upgrades — real max includes Glimbo trade bonuses and Pot Of Gold bundle bonus"
                )
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read vault levels from game memory"
            )
        ),

        div(
            { class: "warning-banner" },
            Icons.Warning(),
            " Max level is sourced from VaultUpgMaxLV formula plus Pot Of Gold bundle bonus (0 or +10). " +
                "SET accepts any value ≥ 0 — no hard upper limit enforced."
        ),

        () => {
            if (loading.val)
                return div(
                    { class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING VAULT" }))
                );

            if (error.val)
                return div(
                    { class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "VAULT READ FAILED", subtitle: error.val })
                );

            if (!data.val) return div({ class: "feature-list" });

            const { upgrades } = data.val;

            if (!upgrades.length)
                return div(
                    { class: "feature-list" },
                    EmptyState({
                        icon: Icons.SearchX(),
                        title: "NO VAULT DATA",
                        subtitle: "Ensure the game is running, then hit REFRESH",
                    })
                );

            return div(
                { class: "feature-list" },
                ...upgrades.map((u) =>
                    VaultRow({
                        index: u.index,
                        name: u.name,
                        baseMax: u.baseMax,
                        realMax: u.realMax,
                        levelState: getLevelState(u.index),
                    })
                )
            );
        }
    );
};
