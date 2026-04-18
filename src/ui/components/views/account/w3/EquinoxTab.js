/**
 * W3 - Equinox Tab (Pattern A — persistent pane, in-place state updates)
 *
 * Data sources:
 *   gga.Dream[0]                           - current bar fill value
 *   gga.Dream[2]                           - first upgrade level (controls visible cloud count)
 *   gga.Dream[i+2]                         - level of upgrade i
 *   cList.DreamUpg[i][0]       - name of upgrade i
 *   cList.DreamChallenge[i][0] - cloud name (underscore-separated)
 *   cList.DreamChallenge[i][1] - cloud required progress (string int)
 *   gga.WeeklyBoss.h.d_i                   - current cloud progress (-1 = not active)
 *
 * Computed via events(579)._customBlock_Dreamstuff:
 *   readComputed("dream", "BarFillReq", [0])   - bar fill requirement
 *   readComputed("dream", "BarFillRate", [0])  - fill rate
 *   readComputed("dream", "UpgUnlocked", [0])  - number of unlocked upgrades
 *   readComputed("dream", "UpgMaxLV", [i])     - max level for upgrade i
 *
 * Refresh behaviour:
 *   - On REFRESH: only state values are updated in-place — no DOM teardown.
 *   - On upgrade SET: BarFillReq and cloud visibility are also refreshed
 *     because Dream[2] (the first upgrade) controls the visible cloud count.
 *   - cloudEntries / upgradeEntries only rebuild their DOM when the entry
 *     count / shape actually changes (same-shape check, same pattern as Arcade).
 */

import van from "../../../../vendor/van-1.6.0.js";
import { readComputed, readComputedMany, gga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { AccountPageShell } from "../components/AccountPageShell.js";
import { runPersistentAccountLoad } from "../accountLoadPolicy.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { toInt, toNum, usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button, span } = van.tags;

// All displayed numbers are plain integers — no decimals, no thousands commas
const fmtInt = (v) => String(toInt(v, { mode: "floor" }));

const fmtCloudName = (raw) =>
    String(raw ?? "")
        .replace(/_/g, " ")
        .trim() || "Unknown";

// Mirrors in-game visibility: visible count = clamp(Dream[2], 0, 5),
// then include cloud i when WeeklyBoss.h["d_i"] !== -1, up to that count.
function getVisibleCloudIndexes(firstUpgLevel, dreamChallengeArr, weeklyBossMap) {
    const visibleCount = Math.max(0, Math.min(5, toInt(firstUpgLevel, { mode: "floor" })));
    const out = [];
    for (let i = 0; i < dreamChallengeArr.length && out.length < visibleCount; i++) {
        if (toNum(weeklyBossMap["d_" + i]) !== -1) out.push(i);
    }
    return out;
}

// ── Overview bar ──────────────────────────────────────────────────────────────

const EquinoxBar = ({ barFillState, barFillReqState, barFillRateState }) => {
    const barFill = div({
        class: () => {
            const full = barFillReqState.val > 0 && barFillState.val >= barFillReqState.val;
            return `equinox-bar__fill${full ? " equinox-bar__fill--full" : ""}`;
        },
    });

    van.derive(() => {
        const pct = barFillReqState.val > 0 ? Math.min(100, (barFillState.val / barFillReqState.val) * 100) : 100;
        barFill.style.setProperty("--equinox-fill-width", `${pct}%`);
    });

    return div(
        { class: "equinox-overview" },
        div(
            { class: "equinox-overview__row" },
            span({ class: "equinox-overview__label" }, "DREAM BAR"),
            span(
                { class: "equinox-overview__value" },
                () => `${fmtInt(barFillState.val)} / ${fmtInt(barFillReqState.val)}`
            ),
            span({ class: "equinox-overview__rate" }, () => `+${fmtInt(barFillRateState.val)} / hr`)
        ),
        div({ class: "equinox-bar" }, barFill)
    );
};

// ── Section header with reactive entry count badge ────────────────────────────

const SectionHeader = ({ label, entriesState, activeSuffix = "ACTIVE", emptySuffix = "NONE VISIBLE" }) =>
    div({ class: "equinox-section-header" }, span({}, label), () => {
        const count = entriesState.val.length;
        return count > 0
            ? span({ class: "equinox-section-header__badge" }, `${count} ${activeSuffix}`)
            : span({ class: "equinox-section-header__badge equinox-section-header__badge--empty" }, emptySuffix);
    });

// ── Cloud row ─────────────────────────────────────────────────────────────────

const CloudRow = ({ entry }) => {
    const { status, run } = useWriteStatus();

    const doComplete = async () => {
        await run(async () => {
            const path = `WeeklyBoss.h.d_${entry.cloudIndex}`;
            const ok = await gga(path, entry.required);
            if (!ok) throw new Error(`Write mismatch at ${path}: expected ${entry.required}, got failed verification`);
            entry.progressState.val = entry.required;
        });
    };

    return div(
        {
            class: () =>
                [
                    "feature-row",
                    entry.cloudIndex >= 35 ? "cloud-row--nightmare" : "",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, entry.cloudIndex + 1),
            span({ class: "feature-row__name" }, entry.name)
        ),
        span({ class: "feature-row__badge" }, () => `${fmtInt(entry.progressState.val)} / ${fmtInt(entry.required)}`),
        div(
            { class: "feature-row__controls" },
            button(
                {
                    type: "button",
                    onmousedown: (e) => e.preventDefault(),
                    class: () =>
                        `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: (e) => {
                        e.preventDefault();
                        doComplete();
                    },
                },
                () => (status.val === "loading" ? "..." : "COMPLETE")
            )
        )
    );
};

// ── Upgrade row ───────────────────────────────────────────────────────────────

const UpgradeRow = ({ entry, onAfterSet }) => {
    const inputVal = van.state("0");
    const { status, run } = useWriteStatus();

    van.derive(() => {
        inputVal.val = String(entry.levelState.val ?? 0);
    });

    const doSet = async (raw) => {
        const lvl = Math.max(0, Math.min(entry.maxLevel, toInt(raw, { mode: "floor" })));
        await run(async () => {
            // Dream[0] and Dream[1] are reserved; upgrades start at Dream[2]
            const path = `Dream[${entry.index + 2}]`;
            const ok = await gga(path, lvl);
            if (!ok) throw new Error(`Write mismatch at ${path}: expected ${lvl}, got failed verification`);
            entry.levelState.val = lvl;
            inputVal.val = String(lvl);
            // BarFillReq and cloud visibility depend on upgrade levels
            await onAfterSet();
        });
    };

    return div(
        {
            class: () =>
                [
                    "feature-row",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "feature-row__info" },
            span({ class: "feature-row__index" }, entry.index + 1),
            span({ class: "feature-row__name" }, entry.name)
        ),
        span({ class: "feature-row__badge" }, () => `LV ${entry.levelState.val} / ${entry.maxLevel}`),
        div(
            { class: "feature-row__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, toInt(inputVal.val, { mode: "floor" }) - 1))),
                onIncrement: () =>
                    (inputVal.val = String(Math.min(entry.maxLevel, toInt(inputVal.val, { mode: "floor" }) + 1))),
            }),
            button(
                {
                    type: "button",
                    onmousedown: (e) => e.preventDefault(),
                    class: () =>
                        `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: (e) => {
                        e.preventDefault();
                        doSet(inputVal.val);
                    },
                },
                () => (status.val === "loading" ? "..." : "SET")
            )
        )
    );
};

// ── EquinoxTab ────────────────────────────────────────────────────────────────

export const EquinoxTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    // Bar — top-level reactive states, always updated in-place
    const barFillState = van.state(0);
    const barFillReqState = van.state(0);
    const barFillRateState = van.state(0);

    // Entry lists — only the .val array reference changes when shape differs
    const cloudEntries = van.state([]);
    const upgradeEntries = van.state([]);

    // Cached after first load so refreshAfterUpgrade doesn't need to re-fetch it
    let cachedDreamChallengeArr = [];

    // Fill Bar
    const { status: fillBarStatus, run: fillBarRun } = useWriteStatus();
    const doFillBar = () =>
        fillBarRun(async () => {
            const req = barFillReqState.val;
            if (!req) return;
            const ok = await gga("Dream[0]", req);
            if (!ok) throw new Error(`Write mismatch at Dream[0]: expected ${req}, got failed verification`);
            barFillState.val = req;
        });

    // ── Cloud entry helpers ───────────────────────────────────────────────────

    const updateCloudEntries = (visibleIndexes, weeklyBossMap, dreamChallengeArr) => {
        const newClouds = visibleIndexes.map((i) => {
            const arr = toIndexedArray(dreamChallengeArr[i] ?? []);
            return {
                cloudIndex: i,
                name: fmtCloudName(arr[0]),
                required: toInt(arr[1], { mode: "floor" }),
                progress: toInt(weeklyBossMap["d_" + i] ?? 0, { mode: "floor" }),
            };
        });

        const existing = cloudEntries.val;
        const sameShape =
            existing.length === newClouds.length && existing.every((e, j) => e.cloudIndex === newClouds[j].cloudIndex);

        if (!sameShape) {
            // Shape changed (different clouds visible) — rebuild entry objects
            cloudEntries.val = newClouds.map((c) => ({
                cloudIndex: c.cloudIndex,
                name: c.name,
                required: c.required,
                progressState: van.state(c.progress),
            }));
        } else {
            // Same shape — only update progress in-place, no DOM rebuild
            newClouds.forEach((c, j) => {
                existing[j].progressState.val = c.progress;
            });
        }
    };

    // ── After-upgrade refresh (lighter than full reload) ──────────────────────
    // Re-fetches bar req and cloud visibility without showing a spinner or
    // rebuilding the upgrade list — upgrade levelState already updated in-place.

    const refreshAfterUpgrade = async () => {
        try {
            const [rawDream, rawWeeklyBoss, newBarFillReq] = await Promise.all([
                gga("Dream"),
                gga("WeeklyBoss.h").catch(() => ({})),
                readComputed("dream", "BarFillReq", [0]).catch(() => barFillReqState.val),
            ]);

            barFillReqState.val = toInt(newBarFillReq, { mode: "floor" });

            const dreamArr = toIndexedArray(rawDream ?? []);
            const weeklyBossMap = rawWeeklyBoss ?? {};
            const visibleIndexes = getVisibleCloudIndexes(
                toInt(dreamArr[2], { mode: "floor" }),
                cachedDreamChallengeArr,
                weeklyBossMap
            );
            updateCloudEntries(visibleIndexes, weeklyBossMap, cachedDreamChallengeArr);
        } catch {
            // Silent — upgrade write already succeeded; bar/cloud are best-effort
        }
    };

    // ── Full load ─────────────────────────────────────────────────────────────

    const load = async () =>
        runPersistentAccountLoad(
            {
                loading,
                error,
                refreshError,
                initialized,
                markReady,
                label: "Equinox",
                fallbackMessage: "Failed to load Equinox data",
            },
            async () => {
            const [rawDream, rawDreamUpg, rawDreamChallenge, rawWeeklyBoss, barFillReq, barFillRate, upgUnlocked] =
                await Promise.all([
                    gga("Dream"),
                    readCList("DreamUpg"),
                    readCList("DreamChallenge"),
                    gga("WeeklyBoss.h"),
                    readComputed("dream", "BarFillReq", [0]),
                    readComputed("dream", "BarFillRate", [0]),
                    readComputed("dream", "UpgUnlocked", [0]),
                ]);

            const dreamArr = toIndexedArray(rawDream ?? []);
            const weeklyBossMap = rawWeeklyBoss ?? {};
            const nextDreamChallengeArr = toIndexedArray(rawDreamChallenge ?? []);

            // ── Bar ───────────────────────────────────────────────────────────
            const nextBarFill = toInt(dreamArr[0], { mode: "floor" });
            const nextBarFillReq = toInt(barFillReq, { mode: "floor" });
            const nextBarFillRate = toInt(barFillRate, { mode: "floor" });

            // ── Upgrades ──────────────────────────────────────────────────────
            const count = toInt(upgUnlocked, { mode: "floor" });

            const computedResults = await readComputedMany(
                "dream",
                "UpgMaxLV",
                Array.from({ length: count }, (_, i) => [i])
            );

            const maxLevels = Array.from({ length: count }, (_, i) => {
                const item = computedResults[i];
                if (!item?.ok) throw new Error(`UpgMaxLV failed for upgrade ${i}`);
                return toInt(item.value, { mode: "floor" });
            });

            const dreamUpgArr = toIndexedArray(rawDreamUpg ?? []);
            const newUpgrades = Array.from({ length: count }, (_, i) => ({
                index: i,
                name: String(toIndexedArray(dreamUpgArr[i] ?? [])[0] ?? `Upgrade ${i + 1}`),
                maxLevel: maxLevels[i] ?? 0,
                level: toInt(dreamArr[i + 2], { mode: "floor" }),
            }));

            const existingUpg = upgradeEntries.val;

            // ── Clouds ────────────────────────────────────────────────────────
            const visibleIndexes = getVisibleCloudIndexes(
                toInt(dreamArr[2], { mode: "floor" }),
                nextDreamChallengeArr,
                weeklyBossMap
            );

            barFillState.val = nextBarFill;
            barFillReqState.val = nextBarFillReq;
            barFillRateState.val = nextBarFillRate;
            cachedDreamChallengeArr = nextDreamChallengeArr;

            if (existingUpg.length !== newUpgrades.length) {
                // Count changed - rebuild
                upgradeEntries.val = newUpgrades.map((u) => ({
                    index: u.index,
                    name: u.name,
                    maxLevel: u.maxLevel,
                    levelState: van.state(u.level),
                }));
            } else {
                // Same count - update values in-place without rebuilding rows
                newUpgrades.forEach((u, i) => {
                    existingUpg[i].name = u.name;
                    existingUpg[i].maxLevel = u.maxLevel;
                    existingUpg[i].levelState.val = u.level;
                });
            }

            updateCloudEntries(visibleIndexes, weeklyBossMap, nextDreamChallengeArr);
        }
        );

    load();

    // ── Persistent content (built once, updated via states) ───────────────────

    const content = div(
        { class: () => paneClass("equinox-content") },

        // ── Bar overview ──────────────────────────────────────────────────────
        EquinoxBar({ barFillState, barFillReqState, barFillRateState }),

        // ── Clouds ────────────────────────────────────────────────────────────
        SectionHeader({
            label: "CLOUDS",
            entriesState: cloudEntries,
            activeSuffix: "ACTIVE",
            emptySuffix: "NONE VISIBLE",
        }),
        div(
            { class: "equinox-clouds-note" },
            "You will have to claim rewards in-game. You can only set progress here."
        ),
        div(
            { class: "equinox-clouds-warning" },
            Icons.Warning(),
            span(
                {},
                "Setting progress only edits the tracker value — it does not perform the actual in-game action. " +
                    "For example, a challenge requiring 400 kills in a single Killroy run will not be completed by " +
                    "this; the counter will show as done but the real condition was never met."
            )
        ),
        () => {
            const entries = cloudEntries.val;
            if (!entries.length) return div({ class: "equinox-empty-section" }, "No clouds are visible yet.");
            // equinox-row-group: flex-col + gap, no overflow — scrolls with the page
            return div({ class: "equinox-row-group" }, ...entries.map((e) => CloudRow({ entry: e })));
        },

        // ── Upgrades ──────────────────────────────────────────────────────────
        SectionHeader({
            label: "UPGRADES",
            entriesState: upgradeEntries,
            activeSuffix: "UNLOCKED",
            emptySuffix: "NONE UNLOCKED",
        }),
        () => {
            const entries = upgradeEntries.val;
            if (!entries.length) return div({ class: "equinox-empty-section" }, "No upgrades unlocked yet.");
            return div(
                { class: "equinox-row-group" },
                ...entries.map((e) => UpgradeRow({ entry: e, onAfterSet: refreshAfterUpgrade }))
            );
        }
    );

    return AccountPageShell({
        header: FeatureTabHeader({
            title: "EQUINOX",
            description: "Dream bar fill, active clouds, and upgrade levels.",
            actions: [
                button(
                    {
                        type: "button",
                        onmousedown: (e) => e.preventDefault(),
                        class: () =>
                            [
                                "feature-btn",
                                "feature-btn--apply",
                                fillBarStatus.val === "loading" ? "feature-btn--loading" : "",
                                fillBarStatus.val === "success" ? "feature-row--success" : "",
                                fillBarStatus.val === "error" ? "feature-row--error" : "",
                            ]
                                .filter(Boolean)
                                .join(" "),
                        disabled: () => fillBarStatus.val === "loading",
                        onclick: (e) => {
                            e.preventDefault();
                            doFillBar();
                        },
                    },
                    () => (fillBarStatus.val === "success" ? "FILLED!" : "FILL BAR")
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ],
        }),
        persistentState: { loading, error, refreshError, initialized },
        body: content,
    });
};
