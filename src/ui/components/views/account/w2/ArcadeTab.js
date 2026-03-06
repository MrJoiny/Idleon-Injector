import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";
import { toIndexedArray } from "../../../../utils/index.js";
import { usePersistentPaneReady, useWriteStatus } from "../featureShared.js";

const { div, button, span, h3, p } = van.tags;
const ARCADE_LEVEL_MAX = 101;

const sanitizeArcadeName = (raw) =>
    String(raw ?? "")
        .replace(/^\+\{\s*/, "")
        .replace(/_/g, " ")
        .trim();

const ArcadeCard = ({ entry }) => {
    const inputVal = van.state(String(entry.levelState.val ?? 0));
    const { status, run } = useWriteStatus();

    const isCosmic = van.derive(() => Number(entry.levelState.val ?? 0) >= 101);

    van.derive(() => {
        inputVal.val = String(entry.levelState.val ?? 0);
    });

    const doSet = async (raw) => {
        const lvl = Math.max(0, Math.min(ARCADE_LEVEL_MAX, Number(raw)));
        if (isNaN(lvl)) return;

        await run(async () => {
            await writeGga(`ArcadeUpg[${entry.index}]`, lvl);
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
                    status.val === "success" ? "arcade-card--success" : "",
                    status.val === "error" ? "arcade-card--error" : "",
                ]
                    .filter(Boolean)
                    .join(" "),
        },
        div(
            { class: "arcade-card__top" },
            span({ class: "arcade-card__index" }, `#${entry.index}`),
            () => (isCosmic.val ? span({ class: "arcade-card__cosmic-badge" }, "COSMIC") : null)
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
    const bulkStatus = van.state(null);
    const { initialized, markReady, paneClass } = usePersistentPaneReady();

    const normalBalls = van.state("0");
    const goldenBalls = van.state("0");
    const cosmicBalls = van.state("0");

    // Entries are created once from the first load and then updated in place.
    const upgradeEntries = van.state([]);

    const load = async () => {
        loading.val = true;
        error.val = null;
        refreshError.val = null;

        try {
            const [rawNormal, rawGolden, rawCosmic, rawArcadeShopInfo, rawArcadeUpg] = await Promise.all([
                readGga("OptionsListAccount[74]"),
                readGga("OptionsListAccount[75]"),
                readGga("OptionsListAccount[324]"),
                readGga("CustomLists.h.ArcadeShopInfo"),
                readGga("ArcadeUpg"),
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
        const indexByType = {
            normal: 74,
            golden: 75,
            cosmic: 324,
        };

        const index = indexByType[ballType];
        if (index === undefined) return;

        const numVal = Math.max(0, Number(valueState.val));
        if (isNaN(numVal)) return;

        try {
            await writeGga(`OptionsListAccount[${index}]`, numVal);
            valueState.val = String(numVal);
        } catch (err) {
            console.error(err);
        }
    };

    const doSetAll = async (targetLevel) => {
        const entries = upgradeEntries.val;
        if (!entries.length) return;

        const lvl = Math.max(0, Number(targetLevel));
        if (isNaN(lvl)) return;

        bulkStatus.val = "loading";
        try {
            for (const entry of entries) {
                await writeGga(`ArcadeUpg[${entry.index}]`, lvl);
                entry.levelState.val = lvl;
                await new Promise((r) => setTimeout(r, 20));
            }
            bulkStatus.val = "done";
            setTimeout(() => (bulkStatus.val = null), 1500);
        } catch {
            bulkStatus.val = null;
        }
    };

    load();

    const content = div(
        { class: () => paneClass("arcade-content") },
        div(
            { class: "arcade-balls-summary" },
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
                button({ class: "feature-btn feature-btn--apply", onclick: () => doSetBall("normal", normalBalls) }, "SET")
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
                button({ class: "feature-btn feature-btn--apply", onclick: () => doSetBall("golden", goldenBalls) }, "SET")
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
                button({ class: "feature-btn feature-btn--apply", onclick: () => doSetBall("cosmic", cosmicBalls) }, "SET")
            )
        ),
        () => {
            const entries = upgradeEntries.val;
            if (!entries.length) return div({ class: "empty-state" }, "No upgrades found.");

            return div({ class: "arcade-grid scrollable-panel" }, ...entries.map((entry) => ArcadeCard({ entry })));
        }
    );

    return div(
        { class: "arcade-tab tab-container" },
        div(
            { class: "feature-header" },
            div({}, h3({}, "ARCADE UPGRADES"), p({ class: "feature-header__desc" }, "Manage Arcade balls and upgrade levels.")),
            div(
                { class: "feature-header__actions" },
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(100),
                    },
                    "MAX ALL"
                ),
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(101),
                    },
                    "MAX ALL COSMIC"
                ),
                button(
                    {
                        class: () =>
                            `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(0),
                    },
                    "RESET ALL"
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH")
            )
        ),
        () =>
            !loading.val && refreshError.val
                ? div(
                      { class: "warning-banner" },
                      Icons.Warning(),
                      " Refresh failed. Showing last loaded values. ",
                      refreshError.val
                  )
                : null,
        () => (loading.val && !initialized.val ? div({ class: "feature-loader" }, Loader()) : null),
        () =>
            !loading.val && error.val && !initialized.val
                ? EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val })
                : null,
        content
    );
};
