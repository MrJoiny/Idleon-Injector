/**
 * W2 - Arcade Tab
 *
 * Ball counts in OptionsListAccount:
 *   [74]  -> normal balls
 *   [75]  -> golden balls
 *   [324] -> cosmic balls
 *
 * Upgrade sources:
 *   cList.ArcadeShopInfo[i][0] -> upgrade name (BLANK rows skipped)
 *   ArcadeUpg[i]                        -> current upgrade level
 *
 * Level rules:
 *   Allowed range is 0-101.
 *   Level 101 is shown as COSMIC in the UI.
 *
 * Bulk actions:
 *   MAX ALL        -> set every ArcadeUpg[i] to 100
 *   MAX ALL COSMIC -> set every ArcadeUpg[i] to 101
 *   RESET ALL      -> set every ArcadeUpg[i] to 0
 */

import van from "../../../../vendor/van-1.6.0.js";
import { gga, readCList } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { FeatureBulkActionBar } from "../FeatureBulkActionBar.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { FeatureTabFrame } from "../components/FeatureTabFrame.js";
import { FeatureTabHeader } from "../components/FeatureTabHeader.js";
import { usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button, span } = van.tags;
const ARCADE_LEVEL_MAX = 101;

const sanitizeArcadeName = (raw) =>
    String(raw ?? "")
        .replace(/^\+\{\s*/, "")
        .replace(/_/g, " ")
        .trim();

const ArcadeCard = ({ entry }) => {
    const inputVal = van.state("0");
    const { status, run } = useWriteStatus();

    const isCosmic = van.derive(() => Number(entry.levelState.val ?? 0) >= 101);

    van.derive(() => {
        inputVal.val = String(entry.levelState.val ?? 0);
    });

    const doSet = async (raw) => {
        const lvl = Math.max(0, Math.min(ARCADE_LEVEL_MAX, Number(raw)));
        if (isNaN(lvl)) return;

        await run(async () => {
            const path = `ArcadeUpg[${entry.index}]`;
            const ok = await gga(path, lvl);
            if (!ok) throw new Error(`Write mismatch at ${path}: expected ${lvl}`);
            entry.levelState.val = lvl;
            inputVal.val = String(lvl);
        });
    };

    return div(
        {
            class: () =>
                [
                    "arcade-card",
                    isCosmic.val ? "arcade-card--cosmic" : "",
                    status.val === "success" ? "feature-row--success" : "",
                    status.val === "error" ? "feature-row--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div({ class: "arcade-card__top" }, span({ class: "arcade-card__index" }, `#${entry.index}`), () =>
            isCosmic.val ? span({ class: "arcade-card__cosmic-badge" }, "COSMIC") : null
        ),
        div({ class: "arcade-card__name" }, entry.name),
        div(
            { class: "arcade-card__level-row" },
            span({ class: "arcade-card__level-label" }, "LV"),
            span({ class: "arcade-card__level-val" }, () => entry.levelState.val ?? 0)
        ),
        div(
            { class: "arcade-card__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Math.min(ARCADE_LEVEL_MAX, Number(inputVal.val) + 1))),
            }),
            button(
                {
                    class: () =>
                        `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => (status.val === "loading" ? "..." : "SET")
            )
        )
    );
};

export const ArcadeTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const refreshError = van.state(null);
    const { status: bulkStatus, run: runBulkSetAll } = useWriteStatus();
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    const normalBalls = van.state("0");
    const goldenBalls = van.state("0");
    const cosmicBalls = van.state("0");
    const normalBallWrite = useWriteStatus();
    const goldenBallWrite = useWriteStatus();
    const cosmicBallWrite = useWriteStatus();

    // Entries are created once from the first load and then updated in place.
    const upgradeEntries = van.state([]);

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;

        try {
            const [rawNormal, rawGolden, rawCosmic, rawArcadeShopInfo, rawArcadeUpg] = await Promise.all([
                gga("OptionsListAccount[74]"),
                gga("OptionsListAccount[75]"),
                gga("OptionsListAccount[324]"),
                readCList("ArcadeShopInfo"),
                gga("ArcadeUpg"),
            ]);

            normalBalls.val = String(rawNormal ?? 0);
            goldenBalls.val = String(rawGolden ?? 0);
            cosmicBalls.val = String(rawCosmic ?? 0);

            const shopInfo = toIndexedArray(rawArcadeShopInfo ?? []);
            const upgLevels = toIndexedArray(rawArcadeUpg ?? []);

            const parsed = [];
            for (let i = 0; i < shopInfo.length; i++) {
                const infoRow = toIndexedArray(shopInfo[i] ?? []);
                const rawName = String(infoRow[0] ?? "").trim();
                if (!rawName || rawName.toUpperCase() === "BLANK") continue;

                parsed.push({
                    index: i,
                    name: sanitizeArcadeName(rawName),
                    level: Number(upgLevels[i] ?? 0),
                });
            }

            const existing = upgradeEntries.val;
            const sameShape =
                existing.length === parsed.length &&
                existing.every((entry, i) => entry.index === parsed[i].index && entry.name === parsed[i].name);

            if (!sameShape) {
                upgradeEntries.val = parsed.map((item) => ({
                    index: item.index,
                    name: item.name,
                    levelState: van.state(item.level),
                }));
            } else {
                parsed.forEach((item, i) => {
                    existing[i].levelState.val = item.level;
                });
            }

            markReady();
        } catch (e) {
            const message = e?.message ?? "Failed to load Arcade data";
            if (!initialized.val) error.val = message;
            else refreshError.val = message;
        } finally {
            loading.val = false;
        }
    };

    const doSetBall = async (ballType, valueState) => {
        const configByType = {
            normal: { index: 74, writer: normalBallWrite },
            golden: { index: 75, writer: goldenBallWrite },
            cosmic: { index: 324, writer: cosmicBallWrite },
        };

        const config = configByType[ballType];
        if (!config) return;
        if (config.writer.status.val === "loading") return;

        const numVal = Math.max(0, Number(valueState.val));
        if (isNaN(numVal)) return;

        await config.writer.run(
            async () => {
                const path = `OptionsListAccount[${config.index}]`;
                const ok = await gga(path, numVal);
                if (!ok) throw new Error(`Write mismatch at ${path}: expected ${numVal}`);
                return numVal;
            },
            {
                onSuccess: (verified) => {
                    valueState.val = String(verified);
                },
                onError: (err) => {
                    console.error(err);
                },
            }
        );
    };

    const doSetAll = async (targetLevel) => {
        const entries = upgradeEntries.val;
        if (!entries.length) return;

        const lvl = Math.max(0, Number(targetLevel));
        if (isNaN(lvl)) return;

        await runBulkSetAll(async () => {
            for (const entry of entries) {
                const ok = await gga(`ArcadeUpg[${entry.index}]`, lvl);
                if (!ok) throw new Error(`Write mismatch at ArcadeUpg[${entry.index}]: expected ${lvl}`);
                await new Promise((r) => setTimeout(r, 20));
            }
            for (const entry of entries) {
                entry.levelState.val = lvl;
            }
        });
    };

    load();

    const topBallsFlashClass = () => {
        const states = [normalBallWrite.status.val, goldenBallWrite.status.val, cosmicBallWrite.status.val];
        if (states.includes("error")) return "feature-row--error";
        if (states.includes("success")) return "feature-row--success";
        return "";
    };

    const content = div(
        { class: () => paneClass("arcade-content") },
        div(
            {
                class: () => ["arcade-balls-summary", topBallsFlashClass()].filter(Boolean).join(" "),
            },
            div(
                { class: "arcade-ball-item" },
                span({ class: "arcade-ball-label" }, "Normal:"),
                NumberInput({
                    mode: "int",
                    value: normalBalls,
                    oninput: (e) => (normalBalls.val = e.target.value),
                    onDecrement: () => (normalBalls.val = String(Math.max(0, Number(normalBalls.val) - 1))),
                    onIncrement: () => (normalBalls.val = String(Number(normalBalls.val) + 1)),
                }),
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${normalBallWrite.status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => normalBallWrite.status.val === "loading",
                        onclick: () => doSetBall("normal", normalBalls),
                    },
                    () => (normalBallWrite.status.val === "loading" ? "..." : "SET")
                )
            ),
            div(
                { class: "arcade-ball-item" },
                span({ class: "arcade-ball-label" }, "Golden:"),
                NumberInput({
                    mode: "int",
                    value: goldenBalls,
                    oninput: (e) => (goldenBalls.val = e.target.value),
                    onDecrement: () => (goldenBalls.val = String(Math.max(0, Number(goldenBalls.val) - 1))),
                    onIncrement: () => (goldenBalls.val = String(Number(goldenBalls.val) + 1)),
                }),
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${goldenBallWrite.status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => goldenBallWrite.status.val === "loading",
                        onclick: () => doSetBall("golden", goldenBalls),
                    },
                    () => (goldenBallWrite.status.val === "loading" ? "..." : "SET")
                )
            ),
            div(
                { class: "arcade-ball-item" },
                span({ class: "arcade-ball-label" }, "Cosmic:"),
                NumberInput({
                    mode: "int",
                    value: cosmicBalls,
                    oninput: (e) => (cosmicBalls.val = e.target.value),
                    onDecrement: () => (cosmicBalls.val = String(Math.max(0, Number(cosmicBalls.val) - 1))),
                    onIncrement: () => (cosmicBalls.val = String(Number(cosmicBalls.val) + 1)),
                }),
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${cosmicBallWrite.status.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => cosmicBallWrite.status.val === "loading",
                        onclick: () => doSetBall("cosmic", cosmicBalls),
                    },
                    () => (cosmicBallWrite.status.val === "loading" ? "..." : "SET")
                )
            )
        ),
        () => {
            const entries = upgradeEntries.val;
            if (!entries.length) return div({ class: "empty-state" }, "No upgrades found.");

            return div({ class: "arcade-grid scrollable-panel" }, ...entries.map((entry) => ArcadeCard({ entry })));
        }
    );

    return FeatureTabFrame({
        rootClass: "arcade-tab tab-container feature-tab-frame",
        header: FeatureTabHeader({
            title: "ARCADE UPGRADES",
            description: "Manage Arcade balls and upgrade levels.",
            wrapActions: false,
            actions: FeatureBulkActionBar({
                actions: [
                    {
                        label: "MAX ALL",
                        status: bulkStatus,
                        tooltip: "Set every Arcade upgrade to 100",
                        onClick: () => doSetAll(100),
                    },
                    {
                        label: "MAX ALL COSMIC",
                        status: bulkStatus,
                        tooltip: "Set every Arcade upgrade to 101",
                        onClick: () => doSetAll(101),
                    },
                    {
                        label: "RESET ALL",
                        status: bulkStatus,
                        tooltip: "Reset every Arcade upgrade to 0",
                        onClick: () => doSetAll(0),
                    },
                ],
                refresh: {
                    onClick: load,
                },
            }),
        }),
        refreshError: () =>
            !loading.val && refreshError.val
                ? div(
                      { class: "warning-banner" },
                      Icons.Warning(),
                      " Refresh failed. Showing last loaded values. ",
                      refreshError.val
                  )
                : null,
        initialState: [
            () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),
            () =>
                !loading.val && error.val && !initialized.val
                    ? EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val })
                    : null,
        ],
        body: content,
    });
};
