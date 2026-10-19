import van from "../../../../../vendor/van-1.6.0.js";
import { executeCheatAction } from "../../../../../services/api.js";
const { div, label, select, option, input, button, p, h3, span } = van.tags;

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
    const extendChain = van.state(false);
    const higherTier = van.state(false);
    const knowledgeTier = van.state("1");
    const knowledgeQuantity = van.state("1");
    const feedback = van.state("");
    try {
        const saved = JSON.parse(localStorage.getItem("sushi-purchase-settings"));
        if (saved && ["manual", "wind"].includes(saved.mode) && Number.isInteger(saved.tier) && saved.tier >= 1) {
            extendChain.val = saved.extendChain === true;
            higherTier.val = saved.higherTier === true;
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
                    extendChain: extendChain.val,
                    higherTier: higherTier.val,
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
            throw new Error(
                String(response.result || "Sushi command failed.")
                    .replace(/^(Error:\s*)+/, "")
                    .split(/\s+at\s|\n/)[0]
            );
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
            action += ` ${showSort.val} ${showPlay.val} ${extendChain.val} ${higherTier.val}`;
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
    const locked = () => busy.val || pending.val;
    const numberField = (title, value, min, description, disabled = locked) =>
        label(
            { class: "sushi-setting" },
            span({ class: "sushi-setting__title" }, title),
            input({
                "aria-label": title,
                type: "number",
                min,
                step: 1,
                value,
                disabled,
                oninput: (e) => {
                    value.val = e.target.value;
                },
                onchange: save,
            }),
            span({ class: "sushi-setting__help" }, description)
        );
    const toggle = (title, value, description) =>
        label(
            { class: "sushi-toggle" },
            input({
                "aria-label": title,
                type: "checkbox",
                checked: value,
                disabled: locked,
                onchange: (e) => {
                    value.val = e.target.checked;
                    save();
                },
            }),
            div(span({ class: "sushi-setting__title" }, title), p({ class: "sushi-setting__help" }, description))
        );
    const controls = div(
        { class: "sushi-automation-controls" },
        div(
            { class: "sushi-automation-header" },
            div(
                h3("SUSHI AUTOMATION"),
                p("Build your collection with native merges. Highest-tier sushi are never merged automatically.")
            ),
            div(
                { class: "sushi-automation-actions" },
                button(
                    {
                        type: "button",
                        class: "account-btn account-btn--apply",
                        disabled: locked,
                        onclick: () => run("sort"),
                    },
                    "Sort"
                ),
                button(
                    {
                        type: "button",
                        class: () => "account-btn " + (busy.val ? "account-btn--danger" : "account-btn--apply"),
                        disabled: () => pending.val || state.val.stopping,
                        onclick: () =>
                            run(busy.val ? "stop" : mode.val === "wind" ? "start wind 1" : "start manual " + tier.val),
                    },
                    () => (busy.val ? (state.val.stopping ? "Stopping…" : "Stop") : "Auto Play")
                )
            )
        ),
        div(
            { class: "sushi-settings-grid" },
            label(
                { class: "sushi-setting" },
                span({ class: "sushi-setting__title" }, "Buy mode"),
                select(
                    {
                        "aria-label": "Buy mode",
                        value: mode,
                        disabled: locked,
                        onchange: (e) => {
                            mode.val = e.target.value;
                            save();
                        },
                    },
                    option({ value: "manual" }, "Manual tier"),
                    option({ value: "wind" }, "East Wind preset")
                ),
                span(
                    { class: "sushi-setting__help" },
                    "Manual uses your chosen tier. East Wind buys at the effective Wind tier limit minus 26, within your unlocked range."
                )
            ),
            numberField(
                "Manual tier",
                tier,
                1,
                "Tier to buy on each refill. The game may produce the next tier too. Lower tiers usually cost less fuel.",
                () => locked() || mode.val === "wind"
            ),
            numberField(
                "Target tier",
                targetTier,
                1,
                "Keep sushi at this tier or higher. They count toward your goal and will not be merged."
            ),
            numberField(
                "Target quantity",
                targetCount,
                1,
                "Stop when this many sushi meet the target tier. Must fit the usable board."
            ),
            numberField(
                "Empty slots",
                reserveSlots,
                0,
                "Leave this many slots empty at the end of the board after sorting and refilling. Set 0 to use every unlocked slot."
            )
        ),
        div(
            { class: "sushi-settings-section" },
            h3("EAST WIND OVERRIDES"),
            p(
                { class: "sushi-setting__help" },
                "Optional changes to game rules. Both default off and affect manual merges too. East Wind must be unlocked. Apply settings to activate."
            ),
            div(
                { class: "sushi-toggle-grid" },
                toggle(
                    "Extended chain",
                    extendChain,
                    "Remove the 25-following-tile limit. Wind can continue across the unlocked board, stopping at a gap, locked slot or sushi that is not lower tier."
                ),
                toggle(
                    "Higher tier limit",
                    higherTier,
                    "Allow Wind from merges up to one tier below the game's maximum: tier 63 when the maximum is 64. The native lower-tier rule still applies."
                )
            )
        ),
        div(
            { class: "sushi-settings-section" },
            h3("IN-GAME SHORTCUTS"),
            div(
                { class: "sushi-toggle-grid" },
                toggle(
                    "Show in-game Sort",
                    showSort,
                    "Show a Sort button beside the board. The cheat-menu button is always available."
                ),
                toggle(
                    "Show in-game Auto Play / Stop",
                    showPlay,
                    "Start or stop without reopening the cheat menu. Both locations control the same run."
                )
            )
        ),
        div(
            { class: "sushi-settings-section" },
            h3("KNOWLEDGE SIMULATION"),
            p(
                { class: "sushi-setting__help" },
                "Add the Knowledge XP for crafting a quantity of sushi from tier 1. Tier 3 counts four tier-1 creations, two tier-2 creations and one tier-3 creation per item."
            ),
            div(
                { class: "sushi-settings-grid" },
                numberField("Simulation tier", knowledgeTier, 1, "Final tier of the simulated crafting tree."),
                numberField(
                    "Simulation quantity",
                    knowledgeQuantity,
                    1,
                    "How many final sushi to simulate. Each click adds XP again."
                )
            ),
            p(
                { class: "sushi-setting__help" },
                "Always includes your current pink XP fireplace multiplier and global Knowledge XP bonuses for the whole batch, regardless of fireplace placement. No East Wind, fuel spending, discoveries or board changes. Knowledge must be unlocked. Very large totals use the game's floating-point precision."
            ),
            button(
                {
                    type: "button",
                    class: "account-btn account-btn--apply",
                    disabled: locked,
                    onclick: () => run("knowledge " + knowledgeTier.val + " " + knowledgeQuantity.val),
                },
                "Add Knowledge XP"
            )
        ),
        div(
            { class: "sushi-automation-footer" },
            button(
                {
                    type: "button",
                    class: "account-btn account-btn--apply",
                    disabled: locked,
                    onclick: () => run("configure"),
                },
                () => (pending.val ? "Working…" : "Apply settings")
            ),
            p(
                { class: "sushi-setting__help" },
                "Apply works with the board closed. Sort and Auto Play require the Sushi board open in sushi-move mode. Preferences are saved in this browser; apply again after restarting the injector."
            )
        ),
        div(
            { class: "sushi-automation-info" },
            p(
                () =>
                    "Unlocked purchase tiers: 1–" +
                    (state.val.maxPurchaseTier || "…") +
                    (mode.val === "wind" && state.val.suggestedTier
                        ? ". East Wind preset: tier " + state.val.suggestedTier + "."
                        : ".")
            ),
            p(() => {
                const guide = state.val.fuelGuide;
                if (!guide || guide.perSecond === null || !guide.suggestions.length)
                    return "Open the Sushi board to see fuel estimates.";
                const rate = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(
                    guide.perSecond
                );
                return (
                    "Fuel: " +
                    rate +
                    "/s. " +
                    guide.suggestions
                        .map(
                            (item) =>
                                item.seconds / 60 +
                                " min refill cycle: " +
                                (item.tier === null ? "below tier 1 budget" : "up to tier " + item.tier)
                        )
                        .join(" · ") +
                    ". Estimates allow a 15% margin."
                );
            }),
            p(
                { role: "status", "aria-live": "polite", class: "sushi-automation-status" },
                () => feedback.val || state.val.message || state.val.error || "Connecting…"
            ),
            p(
                { class: "sushi-setting__help" },
                "Refresh the board editor below after automation finishes to see its new contents."
            )
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
