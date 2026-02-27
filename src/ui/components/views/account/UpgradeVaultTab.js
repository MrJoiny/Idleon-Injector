/**
 * Upgrade Vault Tab
 *
 * Reads/writes gga.UpgVault[index] for all 62 vault upgrades.
 *
 * Data source:
 *   cList.UpgradeVault[i][0] = name (underscores + 製 stripped)
 *   cList.UpgradeVault[i][4] = base max level (soft cap — Vault Mastery can push it higher)
 *   gga.UpgVault[i]          = current level
 *
 * Write: gga.UpgVault[XX] = YY
 */

import van from "../../../vendor/van-1.6.0.js";
import { readMany, writeAttr } from "../../../helpers/gameHelper.js";
import { NumberInput } from "../../NumberInput.js";
import { Loader } from "../../Loader.js";
import { EmptyState } from "../../EmptyState.js";
import { Icons } from "../../../assets/icons.js";
import { withTooltip } from "../../Tooltip.js";

const { div, button, span, h3, p } = van.tags;

// Strip underscores and the 製 character used as a tap-info marker
const cleanName = (raw) =>
    (raw ?? "").replace(/製.*$/, "").replace(/_/g, " ").trim();

// ── VaultRow ──────────────────────────────────────────────────────────────

const VaultRow = ({ index, name, baseMax, getData, onReload }) => {
    const inputVal = van.state(String(getData()?.levels?.[index] ?? 0));
    const status   = van.state(null);

    const doSet = async (targetVal) => {
        const lvl = Math.max(0, Number(targetVal));
        if (isNaN(lvl)) return;
        status.val = "loading";
        try {
            await writeAttr(`gga.UpgVault[${index}] = ${lvl}`);
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
            await new Promise((r) => setTimeout(r, 300));
            const fresh = await onReload?.();
            inputVal.val = String(fresh?.levels?.[index] ?? lvl);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () =>
                `feature-row ${status.val === "success" ? "feature-row--success" : ""} ${
                    status.val === "error" ? "feature-row--error" : ""
                }`,
        },
        div({ class: "feature-row__info" },
            span({ class: "feature-row__name" }, name),
            span({ class: "feature-row__index" }, `#${index}`)
        ),
        span({ class: "feature-row__badge" },
            () => {
                const cur = getData()?.levels?.[index] ?? 0;
                return `LV ${cur} / ${baseMax}`;
            }
        ),
        div({ class: "feature-row__controls" },
            NumberInput({
                value:       inputVal,
                oninput:     (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            withTooltip(
                button({
                    class:    () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    onclick:  () => doSet(inputVal.val),
                    disabled: () => status.val === "loading",
                }, () => (status.val === "loading" ? "..." : "SET")),
                `Set level for ${name} (base max: ${baseMax})`
            ),
            withTooltip(
                button({
                    class:    "feature-btn feature-btn--apply",
                    onclick:  () => doSet(baseMax),
                    disabled: () => status.val === "loading",
                }, "MAX"),
                `Set to base max level (${baseMax})`
            )
        )
    );
};

// ── UpgradeVaultTab ───────────────────────────────────────────────────────

export const UpgradeVaultTab = () => {
    const data    = van.state(null); // { upgrades: [{name, baseMax}], levels: [] }
    const loading = van.state(false);
    const error   = van.state(null);

    const load = async () => {
        loading.val = true;
        error.val   = null;
        try {
            const result = await readMany({
                info:          `cList.UpgradeVault`,
                levels:        `gga.UpgVault`,
                researchKeys:  `cList.Research[26]`,
                researchBonus: `gga.Research[12]`,
                researchGrid:  `cList.Research[29]`,
            });

            const toArr = (raw) => Array.isArray(raw)
                ? raw
                : Object.keys(raw).sort((a, b) => Number(a) - Number(b)).map((k) => raw[k]);

            const info          = toArr(result.info          ?? []);
            const levels        = toArr(result.levels        ?? []);
            const researchKeys  = toArr(result.researchKeys  ?? []);
            const researchBonus = toArr(result.researchBonus ?? []);
            const researchGrid  = toArr(result.researchGrid  ?? []);

            // Replicate VaultUpgMaxLV formula from game source:
            //   base = UpgradeVault[i][4]
            //   if i is in Research[26]:
            //     bonus = Research[12][indexOf(i)]
            //     if Research[29][indexOf(i)] == 1: bonus *= (1 + GridBonus)  [Grid not implemented here yet]
            //     max = base + bonus
            const computeMax = (i) => {
                const base = parseInt(info[i]?.[4]) || 0;
                const idx  = researchKeys.indexOf(String(i));
                if (idx === -1) return base;
                const bonus = Number(researchBonus[idx] ?? 0);
                const grid  = Number(researchGrid[idx]  ?? 0);
                // Grid bonus multiplier — grid active means ×(1 + GridBonus); we use 1 when unknown
                return Math.round(base + bonus * (grid === 1 ? 1 : 1));
            };

            // Build upgrade definitions from cList, filter out trailing junk (e.g. the XP entry)
            const upgrades = info
                .map((entry, i) => ({
                    index:   i,
                    name:    cleanName(entry?.[0]),
                    baseMax: computeMax(i),
                }))
                .filter((u) => u.name.length > 0 && u.baseMax > 0);

            data.val = { upgrades, levels };
            return data.val;
        } catch (e) {
            error.val = e.message || "Failed to read Upgrade Vault data";
        } finally {
            loading.val = false;
        }
    };

    load();

    return div({ class: "world-feature scroll-container" },

        div({ class: "feature-header" },
            div(null,
                h3("UPGRADE VAULT"),
                p({ class: "feature-header__desc" },
                    "Set levels for all vault upgrades — base max shown, Vault Mastery can push beyond it"
                )
            ),
            withTooltip(
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
                "Re-read vault levels from game memory"
            )
        ),

        div({ class: "warning-banner" },
            "⚠ Max level is calculated live from game data, including any Research bonuses. " +
            "SET accepts any value ≥ 0 — no hard upper limit enforced."
        ),

        () => {
            if (loading.val)
                return div({ class: "feature-list" },
                    div({ class: "feature-loader" }, Loader({ text: "READING VAULT" }))
                );

            if (error.val)
                return div({ class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "VAULT READ FAILED", subtitle: error.val })
                );

            if (!data.val) return div({ class: "feature-list" });

            const { upgrades } = data.val;

            if (!upgrades.length)
                return div({ class: "feature-list" },
                    EmptyState({ icon: Icons.SearchX(), title: "NO VAULT DATA", subtitle: "Ensure the game is running, then hit REFRESH" })
                );

            return div({ class: "feature-list" },
                ...upgrades.map((u) =>
                    VaultRow({
                        index:   u.index,
                        name:    u.name,
                        baseMax: u.baseMax,
                        getData: () => data.val,
                        onReload: load,
                    })
                )
            );
        }
    );
};
