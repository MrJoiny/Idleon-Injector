/**
 * Upgrade Vault Tab
 *
 * Reads/writes gga.UpgVault[index] for all vault upgrades.
 *
 * Data sources:
 *   cList.UpgradeVault[i][0] = name (underscores + 製 stripped)
 *   cList.UpgradeVault[i][4] = base max level (soft cap)
 *   VaultUpgMaxLV via readComputed("summoning", "VaultUpgMaxLV", [i, 0])
 *                 = real max level (includes Glimbo trade bonuses)
 *   gga.UpgVault[i]                = current level
 *
 * Write: gga.UpgVault[XX] = YY
 */

import van from "../../../vendor/van-1.6.0.js";
import { readGga, writeGga, readComputed, readCList } from "../../../services/api.js";
import { NumberInput } from "../../NumberInput.js";
import { Loader } from "../../Loader.js";
import { EmptyState } from "../../EmptyState.js";
import { Icons } from "../../../assets/icons.js";
import { withTooltip } from "../../Tooltip.js";
import { toNum, useWriteStatus } from "./featureShared.js";

const { div, button, span, h3, p } = van.tags;

// Strip underscores and the 製 character used as a tap-info marker
const cleanName = (raw) => (raw ?? "").replace(/製.*$/, "").replace(/_/g, " ").trim();

// ── VaultRow ──────────────────────────────────────────────────────────────

const VaultRow = ({ index, name, baseMax, realMax, initialLevel }) => {
    const inputVal = van.state(String(initialLevel ?? 0));
    const levelDisplay = van.state(initialLevel ?? 0);
    const { status, run } = useWriteStatus();

    const doSet = async (targetVal) => {
        const lvl = Math.max(0, Number(targetVal));
        if (isNaN(lvl)) return;
        await run(async () => {
            await writeGga(`UpgVault[${index}]`, lvl);
            inputVal.val = String(lvl);
            levelDisplay.val = lvl;
        });
    };

    const maxLabel = realMax !== baseMax ? `${realMax} (base ${baseMax})` : String(realMax);

    return div(
        {
            class: () =>
                `feature-row ${status.val === "success" ? "feature-row--success" : ""} ${
                    status.val === "error" ? "feature-row--error" : ""
                }`,
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__name" }, name),
            span({ class: "feature-row__index" }, `#${index}`)
        ),
        span({ class: "feature-row__badge" }, () => `LV ${levelDisplay.val} / ${realMax}`),
        div(
            { class: "feature-row__controls" },
            NumberInput({
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            withTooltip(
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                        onclick: () => doSet(inputVal.val),
                        disabled: () => status.val === "loading",
                    },
                    () => (status.val === "loading" ? "..." : "SET")
                ),
                `Set level for ${name} (max: ${maxLabel})`
            ),
            withTooltip(
                button(
                    {
                        class: "feature-btn feature-btn--apply",
                        onclick: () => doSet(realMax),
                        disabled: () => status.val === "loading",
                    },
                    "MAX"
                ),
                `Set to max level (${maxLabel})`
            )
        )
    );
};

// ── UpgradeVaultTab ───────────────────────────────────────────────────────

export const UpgradeVaultTab = () => {
    const data = van.state(null); // { upgrades: [{name, baseMax, realMax}], levels: [] }
    const loading = van.state(false);
    const error = van.state(null);

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

            const [rawInfo, rawLevels] = await Promise.all([readCList("UpgradeVault"), readGga("UpgVault")]);

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
                    const name = cleanName(entry?.[0]);
                    if (!name) return null;
                    const baseMax = toNum(entry?.[4]);
                    if (baseMax <= 0) return null;
                    const realMax = realMaxes[i] ?? baseMax;
                    return { index: i, name, baseMax, realMax };
                })
                .filter(Boolean);

            data.val = { upgrades, levels };
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
                    "Set levels for all vault upgrades — real max includes Glimbo trade bonuses"
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
            " Max level is sourced directly from the game's VaultUpgMaxLV formula (base + Glimbo trade bonuses). " +
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

            const { upgrades, levels } = data.val;

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
                        initialLevel: levels?.[u.index] ?? 0,
                    })
                )
            );
        }
    );
};
