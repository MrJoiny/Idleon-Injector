import van from "../../../../../vendor/van-1.6.0.js";
import { executeCheatAction } from "../../../../../services/api.js";
import { AccountTabHeader } from "../../components/AccountTabHeader.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
const { div, label, select, option, input, button, p, h3, span } = van.tags;

export function SushiToolsTab() {
    const busy = van.state(false);
    const state = van.state({});
    const pending = van.state(false);
    const mode = van.state("manual");
    const tier = van.state("1");
    const targetCount = van.state("40");
    const targetTier = van.state("64");
    const reserveSlots = van.state("2");
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
                })
            );
        } catch {
            /* Optional local preference. */
        }
    }
    async function command(action, settings) {
        const response = await executeCheatAction(
            "w7 sushitools " + action + (settings ? " " + JSON.stringify(settings) : "")
        );
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
            state.val = await command("status", {
                targetCount: Number(targetCount.val),
                targetTier: Number(targetTier.val),
                reserveSlots: Number(reserveSlots.val),
            });
            busy.val = Boolean(state.val.busy);
            feedback.val = "";
            return state.val;
        } catch (error) {
            feedback.val = error.message;
            return null;
        }
    }
    async function run(action, settings) {
        if (action === "configure" || action === "start") {
            if (
                ![targetCount.val, targetTier.val, reserveSlots.val].every(
                    (value) => value.trim() !== "" && Number.isInteger(Number(value))
                )
            ) {
                feedback.val = "Enter whole numbers for the target and reserved slots.";
                return;
            }
            settings = {
                mode: mode.val,
                tier: mode.val === "wind" ? 1 : Number(tier.val),
                targetCount: Number(targetCount.val),
                targetTier: Number(targetTier.val),
                reserveSlots: Number(reserveSlots.val),
                extendChain: extendChain.val,
                higherTier: higherTier.val,
            };
        }
        pending.val = true;
        try {
            const result = await command(action, settings);
            feedback.val = "";
            busy.val = Boolean(result.busy);
            const updated = await update();
            if (updated && !result.busy) feedback.val = result.message || "";
        } catch (error) {
            feedback.val = error.message;
        } finally {
            pending.val = false;
        }
    }
    const locked = () => busy.val || pending.val;
    const numberField = (title, value, min, description = null, disabled = locked) =>
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
            description ? span({ class: "sushi-setting__help" }, description) : null
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
        { class: "sushi-automation-controls scrollable-panel", "aria-busy": () => pending.val },
        div(
            { class: "sushi-automation-header" },
            h3("AUTOMATION"),
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
                        onclick: () => run(busy.val ? "stop" : "start"),
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
                span({ class: "sushi-setting__help" }, "East Wind uses its tier limit minus 26.")
            ),
            numberField("Manual tier", tier, 1, null, () => locked() || mode.val === "wind"),
            numberField("Target tier", targetTier, 1, "Keep this tier and higher; never merge them."),
            numberField("Target quantity", targetCount, 1, "Stop when this many reach the target tier."),
            numberField("Empty slots", reserveSlots, 0, "Reserve space after sorting and refilling.")
        ),
        div(
            { class: "sushi-settings-section" },
            h3("EAST WIND OVERRIDES"),
            p({ class: "sushi-setting__help" }, "Requires East Wind. Also affects manual merges."),
            div(
                { class: "sushi-toggle-grid" },
                toggle("Extended chain", extendChain, "Remove the 25-tile chain limit."),
                toggle("Higher tier limit", higherTier, "Allow Wind up to one tier below the game maximum.")
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
            p({ class: "sushi-setting__help" }, "Apply again after restarting. Auto Play also applies these settings.")
        ),
        div(
            { class: "sushi-settings-section" },
            h3("KNOWLEDGE SIMULATION"),
            p(
                { class: "sushi-setting__help" },
                "Add XP for crafting from tier 1, including current XP bonuses and the pink fireplace bonus."
            ),
            div(
                { class: "sushi-settings-grid" },
                numberField("Simulation tier", knowledgeTier, 1),
                numberField("Simulation quantity", knowledgeQuantity, 1)
            ),
            p(
                { class: "sushi-setting__help" },
                "Requires Knowledge. Each click adds XP again; fuel and board contents stay unchanged."
            ),
            button(
                {
                    type: "button",
                    class: "account-btn account-btn--apply",
                    disabled: locked,
                    onclick: () =>
                        run("knowledge", {
                            tier: Number(knowledgeTier.val),
                            quantity: Number(knowledgeQuantity.val),
                        }),
                },
                "Add Knowledge XP"
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
            p({ role: "status", "aria-live": "polite", class: "sushi-automation-status" }, () =>
                pending.val ? "Working…" : feedback.val || state.val.error || state.val.message || "Connecting…"
            )
        )
    );
    update();
    return div(
        { class: "tab-container" },
        AccountTabHeader({
            title: "SUSHI TOOLS",
            description: "Keep the in-game Sushi board open in sushi-move mode for Sort and Auto Play.",
            actions: RefreshButton({ onRefresh: update, disabled: () => pending.val }),
        }),
        controls
    );
}
