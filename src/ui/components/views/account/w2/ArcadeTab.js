import van from "../../../../vendor/van-1.6.0.js";
import { readGga, writeGga } from "../../../../services/api.js";
import { NumberInput } from "../../../NumberInput.js";
import { Loader } from "../../../Loader.js";
import { EmptyState } from "../../../EmptyState.js";
import { Icons } from "../../../../assets/icons.js";

const { div, button, span, h3, p } = van.tags;

// ── Helpers ─────────────────────────────────────────────────────────────

// Mapping index to name based on `CustomLists.h.ArcadeShopInfo[i][0]`
const ArcadeCard = ({ index, name, initialLevel }) => {
    const inputVal = van.state(String(initialLevel));
    const levelDisplay = van.state(initialLevel);
    const status = van.state(null); // null | "loading" | "success" | "error"

    const isCosmic = van.derive(() => levelDisplay.val >= 101);

    const doSet = async (raw) => {
        const lvl = Math.max(0, Number(raw));
        if (isNaN(lvl)) return;
        status.val = "loading";
        try {
            await writeGga(`ArcadeUpg[${index}]`, lvl);
            inputVal.val = String(lvl);
            levelDisplay.val = lvl;
            status.val = "success";
            setTimeout(() => (status.val = null), 1200);
        } catch {
            status.val = "error";
            setTimeout(() => (status.val = null), 1200);
        }
    };

    return div(
        {
            class: () => [
                "arcade-card",
                isCosmic.val ? "arcade-card--cosmic" : "",
                status.val === "success" ? "arcade-card--success" : "",
                status.val === "error" ? "arcade-card--error" : "",
            ].filter(Boolean).join(" "),
        },

        div(
            { class: "arcade-card__top" },
            span({ class: "arcade-card__index" }, `#${index}`),
            () => isCosmic.val ? span({ class: "arcade-card__cosmic-badge" }, "✦ COSMIC") : null
        ),

        div({ class: "arcade-card__name" }, name),

        div(
            { class: "arcade-card__level-row" },
            span({ class: "arcade-card__level-label" }, "LV"),
            span({ class: "arcade-card__level-val" }, levelDisplay),
        ),

        div(
            { class: "arcade-card__controls" },
            NumberInput({
                mode: "int",
                value: inputVal,
                oninput: (e) => (inputVal.val = e.target.value),
                onDecrement: () => (inputVal.val = String(Math.max(0, Number(inputVal.val) - 1))),
                onIncrement: () => (inputVal.val = String(Number(inputVal.val) + 1)),
            }),
            button(
                {
                    class: () => `feature-btn feature-btn--apply ${status.val === "loading" ? "feature-btn--loading" : ""}`,
                    disabled: () => status.val === "loading",
                    onclick: () => doSet(inputVal.val),
                },
                () => status.val === "loading" ? "…" : "SET"
            )
        )
    );
};

// ── Main Arcade Tab component ──────────────────────────────────────────────

export const ArcadeTab = () => {
    const loading = van.state(true);
    const error = van.state(null);
    const bulkStatus = van.state(null);

    // Ball counts states
    const normalBalls = van.state("0");
    const goldenBalls = van.state("0");
    const cosmicBalls = van.state("0");

    // Upgrade array state
    const upgrades = van.state([]);

    const load = async () => {
        loading.val = true;
        error.val = null;
        try {
            const [
                rawNormal,
                rawGolden,
                rawCosmic,
                rawArcadeShopInfo,
                rawArcadeUpg
            ] = await Promise.all([
                readGga("OptionsListAccount[74]"),
                readGga("OptionsListAccount[75]"),
                readGga("OptionsListAccount[324]"),
                readGga("CustomLists.h.ArcadeShopInfo"),
                readGga("ArcadeUpg"),
            ]);

            normalBalls.val = String(rawNormal ?? 0);
            goldenBalls.val = String(rawGolden ?? 0);
            cosmicBalls.val = String(rawCosmic ?? 0);

            // `ArcadeShopInfo` gives us names, `ArcadeUpg` gives us levels.
            const shopInfo = Array.isArray(rawArcadeShopInfo) ? rawArcadeShopInfo : Object.values(rawArcadeShopInfo || {});
            const upgLevels = Array.isArray(rawArcadeUpg) ? rawArcadeUpg : Object.values(rawArcadeUpg || {});

            const items = [];
            for (let i = 0; i < shopInfo.length; i++) {
                // shopInfo[i] usually is an array, element [0] is the name.
                // Assuming it ignores blanks ("Blank") or placeholders if needed.
                const nameInfo = shopInfo[i]?.[0];
                if (!nameInfo || nameInfo.trim() === "Blank" || nameInfo.trim() === "") {
                    continue; // Skip empties or placeholders if they exist
                }

                const name = nameInfo.replace(/^\+\{\s*/, "").replace(/_/g, " ").trim();
                const level = upgLevels[i] ?? 0;

                items.push({ index: i, name, level });
            }

            upgrades.val = items;
        } catch (e) {
            error.val = e?.message ?? "Failed to load Arcade data";
        } finally {
            loading.val = false;
        }
    };

    const doSetBall = async (ballType, valueState) => {
        let index;
        if (ballType === "normal") index = 74;
        else if (ballType === "golden") index = 75;
        else if (ballType === "cosmic") index = 324;
        else return;

        try {
            const numVal = Number(valueState.val);
            await writeGga(`OptionsListAccount[${index}]`, numVal);
            valueState.val = String(numVal);
        } catch (err) {
            console.error(err);
        }
    };

    const doSetAll = async (targetLevel) => {
        if (!upgrades.val || upgrades.val.length === 0) return;

        bulkStatus.val = "loading";
        try {
            for (const item of upgrades.val) {
                await writeGga(`ArcadeUpg[${item.index}]`, targetLevel);
                await new Promise((r) => setTimeout(r, 20)); // Small throttle
            }
            bulkStatus.val = "done";
            setTimeout(() => (bulkStatus.val = null), 1500);
            await load();
        } catch {
            bulkStatus.val = null;
        }
    };

    // Load initially
    load();

    return div(
        { class: "arcade-tab tab-container" },

        // Header
        div(
            { class: "feature-header" },
            div(
                {},
                h3({}, "ARCADE UPGRADES"),
                p({ class: "feature-header__desc" }, "Manage Arcade balls and upgrade levels."),
            ),
            div(
                { class: "feature-header__actions" },
                button(
                    {
                        class: () => `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(100),
                    },
                    "MAX ALL"
                ),
                button(
                    {
                        class: () => `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(101),
                    },
                    "MAX ALL COSMIC"
                ),
                button(
                    {
                        class: () => `feature-btn feature-btn--apply ${bulkStatus.val === "loading" ? "feature-btn--loading" : ""}`,
                        disabled: () => bulkStatus.val === "loading",
                        onclick: () => doSetAll(0),
                    },
                    "RESET ALL"
                ),
                button({ class: "btn-secondary", onclick: load }, "REFRESH"),
            ),
        ),

        // 3 Ball Inputs Header Summary Wrap
        () => {
            if (loading.val) return div(); // Hide inputs while loading
            return div(
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
                    button(
                        { class: "feature-btn feature-btn--apply", onclick: () => doSetBall("normal", normalBalls) },
                        "SET"
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
                        { class: "feature-btn feature-btn--apply", onclick: () => doSetBall("golden", goldenBalls) },
                        "SET"
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
                        { class: "feature-btn feature-btn--apply", onclick: () => doSetBall("cosmic", cosmicBalls) },
                        "SET"
                    )
                ),
            );
        },

        // Scrollable Grids for upgrades
        () => {
            if (loading.val) return div({ class: "feature-loader" }, Loader());
            if (error.val) return EmptyState({ icon: Icons.SearchX(), title: "LOAD FAILED", subtitle: error.val });

            const items = upgrades.val;
            if (items.length === 0) return div({ class: "empty-state" }, "No upgrades found.");

            return div(
                { class: "arcade-grid scrollable-panel" },
                ...items.map(item => ArcadeCard({
                    index: item.index,
                    name: item.name,
                    initialLevel: item.level,
                }))
            );
        }
    );
};
