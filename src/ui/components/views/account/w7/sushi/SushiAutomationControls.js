import van from "../../../../../vendor/van-1.6.0.js";
import { executeCheatAction } from "../../../../../services/api.js";
const { div, label, select, option, input, button, p } = van.tags;

export function SushiAutomationControls(busy) {
    const state = van.state({});
    const pending = van.state(false);
    const mode = van.state("manual");
    const tier = van.state("1");
    const targetCount = van.state("40");
    const targetTier = van.state("64");
    const reserveSlots = van.state("2");
    const showSort = van.state(false);
    const showPlay = van.state(false);
    const feedback = van.state("");
    try {
        const saved = JSON.parse(localStorage.getItem("sushi-purchase-settings"));
        if (saved && ["manual", "wind"].includes(saved.mode) && Number.isInteger(saved.tier) && saved.tier >= 1) {
            showSort.val = saved.showSort === true;
            showPlay.val = saved.showPlay === true;
            mode.val = saved.mode;
            tier.val = String(saved.tier);
            if (Number.isInteger(saved.targetCount)) targetCount.val = String(saved.targetCount);
            if (Number.isInteger(saved.targetTier)) targetTier.val = String(saved.targetTier);
            if (Number.isInteger(saved.reserveSlots)) reserveSlots.val = String(saved.reserveSlots);
        }
    } catch {
        /* Optional local preference. */
    }
    function save() {
        try {
            localStorage.setItem(
                "sushi-purchase-settings",
                JSON.stringify({
                    mode: mode.val,
                    tier: Number(tier.val),
                    targetCount: Number(targetCount.val),
                    targetTier: Number(targetTier.val),
                    reserveSlots: Number(reserveSlots.val),
                    showSort: showSort.val,
                    showPlay: showPlay.val,
                })
            );
        } catch {
            /* Optional local preference. */
        }
    }
    async function command(action) {
        const response = await executeCheatAction("w7 sushitools " + action);
        if (typeof response.result !== "string" || response.result.startsWith("Error:"))
            throw new Error(response.result || "Sushi command failed.");
        return JSON.parse(response.result);
    }
    async function update() {
        try {
            state.val = await command(`status manual 1 ${targetCount.val} ${targetTier.val} ${reserveSlots.val}`);
            busy.val = Boolean(state.val.busy);
        } catch (error) {
            feedback.val = error.message;
        }
    }
    async function run(action) {
        if (action === "sort" || action === "configure" || action.startsWith("start")) {
            if (
                ![targetCount.val, targetTier.val, reserveSlots.val].every(
                    (value) => value.trim() !== "" && Number.isInteger(Number(value))
                )
            ) {
                feedback.val = "Enter whole numbers for the target and reserved slots.";
                return;
            }
            const configuring = action === "configure";
            if (action === "sort") action = "sort manual 1";
            if (configuring) action = "configure " + mode.val + " " + (mode.val === "wind" ? "1" : tier.val);
            action += ` ${targetCount.val} ${targetTier.val} ${reserveSlots.val}`;
            if (configuring) action += ` ${showSort.val} ${showPlay.val}`;
        }
        pending.val = true;
        try {
            const result = await command(action);
            feedback.val = "";
            busy.val = Boolean(result.busy);
            await update();
        } catch (error) {
            feedback.val = error.message;
        } finally {
            pending.val = false;
        }
    }
    const controls = div(
        { class: "sushi-automation-controls" },
        div(
            { class: "sushi-automation-actions" },
            label(
                "Buy mode ",
                select(
                    {
                        value: mode,
                        disabled: () => busy.val || pending.val,
                        onchange: (e) => {
                            mode.val = e.target.value;
                            save();
                        },
                    },
                    option({ value: "manual" }, "Manual"),
                    option({ value: "wind" }, "East Wind")
                )
            ),
            label(
                "Manual tier ",
                input({
                    type: "number",
                    min: 1,
                    step: 1,
                    value: tier,
                    max: () => state.val.maxPurchaseTier || 1,
                    disabled: () => busy.val || pending.val || mode.val === "wind",
                    oninput: (e) => {
                        tier.val = e.target.value;
                    },
                    onchange: save,
                })
            ),
            ...[
                ["Target tier ", targetTier, 1],
                ["Target quantity ", targetCount, 1],
                ["Empty slots ", reserveSlots, 0],
            ].map(([text, value, min]) =>
                label(
                    text,
                    input({
                        type: "number",
                        min,
                        step: 1,
                        value,
                        disabled: () => busy.val || pending.val,
                        oninput: (e) => {
                            value.val = e.target.value;
                        },
                        onchange: save,
                    })
                )
            ),
            button(
                {
                    type: "button",
                    disabled: () => busy.val || pending.val,
                    onclick: () => run("sort"),
                },
                "Sort"
            ),
            button(
                {
                    type: "button",
                    disabled: () => pending.val || state.val.stopping,
                    onclick: () =>
                        run(busy.val ? "stop" : mode.val === "wind" ? "start wind 1" : "start manual " + tier.val),
                },
                () => (busy.val ? (state.val.stopping ? "Stopping…" : "Stop") : "Auto Play")
            )
        ),
        div(
            { class: "sushi-automation-actions" },
            label(
                input({
                    type: "checkbox",
                    checked: showSort,
                    disabled: () => busy.val || pending.val,
                    onchange: (e) => {
                        showSort.val = e.target.checked;
                        save();
                    },
                }),
                "Show in-game Sort"
            ),
            label(
                input({
                    type: "checkbox",
                    checked: showPlay,
                    disabled: () => busy.val || pending.val,
                    onchange: (e) => {
                        showPlay.val = e.target.checked;
                        save();
                    },
                }),
                "Show in-game Auto Play / Stop"
            ),
            button(
                { type: "button", disabled: () => busy.val || pending.val, onclick: () => run("configure") },
                "Apply settings"
            )
        ),
        p(() =>
            mode.val === "wind"
                ? `Buys tier ${state.val.suggestedTier || "…"} (East Wind limit − 26).`
                : `Unlocked purchase tiers: 1–${state.val.maxPurchaseTier || "…"}.`
        ),
        p(() => {
            const guide = state.val.fuelGuide;
            if (mode.val !== "manual" || !guide || guide.perSecond === null || !guide.suggestions.length) return "";
            const rate = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(
                guide.perSecond
            );
            return `Fuel: ${rate}/s. ${guide.suggestions.map((item) => item.seconds / 60 + " min: " + (item.tier === null ? "below tier 1 budget" : "up to tier " + item.tier)).join(" · ")}. Assumes ${guide.slots} buys/cycle; 15% margin.`;
        }),
        p(
            { role: "status", "aria-live": "polite" },
            () => feedback.val || state.val.error || state.val.message || "Connecting…"
        ),
        p(
            "Keep Sushi Station open in the game. Sushi at or above the target tier count toward your goal and are protected. Refresh the board below after automation finishes."
        )
    );
    // Poll only while this view remains mounted; the automation itself lives in the game.
    async function poll() {
        if (!controls.isConnected) return;
        if (!pending.val) await update();
        setTimeout(poll, 1000);
    }
    setTimeout(poll, 100);
    return controls;
}
