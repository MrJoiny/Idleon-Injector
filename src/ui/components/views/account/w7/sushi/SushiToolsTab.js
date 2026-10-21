import van from "../../../../../vendor/van-1.6.0.js";
import { executeCheatAction, fetchConfig, updateSessionConfig, saveConfigFile } from "../../../../../services/api.js";
import { AccountTabHeader } from "../../components/AccountTabHeader.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
const { div, label, select, option, input, button, p, h3, span } = van.tags;

export function SushiToolsTab() {
    const busy = van.state(false);
    const state = van.state({});
    const pending = van.state(false);
    const settingsLoaded = van.state(false);
    const settings = {
        mode: van.state(""),
        tier: van.state(""),
        targetCount: van.state(""),
        targetTier: van.state(""),
        reserveSlots: van.state(""),
        extendChain: van.state(false),
        higherTier: van.state(false),
    };
    const knowledgeTier = van.state("1");
    const knowledgeQuantity = van.state("1");
    const feedback = van.state("");
    async function refresh() {
        pending.val = true;
        try {
            const config = await fetchConfig();
            const saved = config.cheatConfig.w7.sushitools;
            for (const [key, value] of Object.entries(settings)) value.val = saved[key];
            settingsLoaded.val = true;
            await update();
        } catch (error) {
            feedback.val = error.message;
        } finally {
            pending.val = false;
        }
    }
    async function saveSettings() {
        const draft = Object.fromEntries(Object.entries(settings).map(([key, value]) => [key, value.val]));
        for (const key of ["tier", "targetCount", "targetTier", "reserveSlots"]) {
            if (String(draft[key]).trim() === "" || !Number.isInteger(Number(draft[key])))
                throw new Error("Enter whole numbers for tiers, quantity and empty slots.");
            draft[key] = Number(draft[key]);
        }
        if (
            !["manual", "wind"].includes(draft.mode) ||
            draft.tier < 1 ||
            (draft.mode === "manual" && draft.tier > state.val.maxPurchaseTier) ||
            draft.targetTier < 1 ||
            draft.targetTier > state.val.maxTier + 1 ||
            draft.targetCount < 1 ||
            draft.targetCount > 120 ||
            draft.reserveSlots < 0 ||
            draft.reserveSlots > 119
        )
            throw new Error("Choose valid tiers, 1–120 target sushi and 0–119 empty slots.");
        const result = await updateSessionConfig({ cheatConfig: { w7: { sushitools: draft } } });
        // Saving rewrites all overrides, so read the complete current config first.
        const config = await fetchConfig();
        await saveConfigFile({
            cheatConfig: config.cheatConfig,
            startupCheats: config.startupCheats,
            injectorConfig: config.injectorConfig,
        });
        if (result.message.includes("failed to apply in game"))
            throw new Error("Settings saved, but could not apply in game. Reconnect and save again.");
    }
    async function command(action) {
        const response = await executeCheatAction("w7 sushitools" + (action ? " " + action : ""));
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
            state.val = await command("status");
            busy.val = Boolean(state.val.busy);
            feedback.val = "";
            return state.val;
        } catch (error) {
            feedback.val = error.message;
            return null;
        }
    }
    async function run(action) {
        pending.val = true;
        try {
            if (action === "save" || (action === "" && !busy.val)) await saveSettings();
            if (action === "save") {
                feedback.val = "Settings saved.";
                return;
            }
            const result = await command(action);
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
    const locked = () => busy.val || pending.val || !settingsLoaded.val;
    const numberField = (title, value, min = 1, disabled = locked) =>
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
            })
        );
    const toggle = (title, value) =>
        label(
            { class: "sushi-toggle" },
            input({
                type: "checkbox",
                checked: value,
                disabled: locked,
                onchange: (e) => {
                    value.val = e.target.checked;
                },
            }),
            span(title)
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
                        disabled: () => pending.val || state.val.stopping || (!busy.val && !settingsLoaded.val),
                        onclick: () => run(""),
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
                        value: settings.mode,
                        disabled: locked,
                        onchange: (e) => {
                            settings.mode.val = e.target.value;
                        },
                    },
                    option({ value: "manual" }, "Manual tier"),
                    option({ value: "wind" }, "East Wind preset")
                )
            ),
            numberField("Manual tier", settings.tier, 1, () => locked() || settings.mode.val === "wind"),
            numberField("Target tier", settings.targetTier),
            numberField("Target quantity", settings.targetCount),
            numberField("Empty slots", settings.reserveSlots, 0)
        ),
        div(
            { class: "sushi-toggle-grid" },
            toggle("Extended East Wind chain", settings.extendChain),
            toggle("Higher East Wind tier limit", settings.higherTier)
        ),
        div(
            { class: "sushi-automation-footer" },
            button(
                {
                    type: "button",
                    class: "account-btn account-btn--apply",
                    disabled: locked,
                    onclick: () => run("save"),
                },
                () => (pending.val ? "Working…" : "Save settings")
            ),
            p({ class: "sushi-setting__help" }, "Auto Play also saves these settings.")
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
                numberField("Simulation tier", knowledgeTier),
                numberField("Simulation quantity", knowledgeQuantity)
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
                    onclick: () => run("knowledge " + knowledgeTier.val + " " + knowledgeQuantity.val),
                },
                "Add Knowledge XP"
            )
        ),
        div(
            { class: "sushi-automation-info" },
            p({ role: "status", "aria-live": "polite", class: "sushi-automation-status" }, () =>
                pending.val ? "Working…" : feedback.val || state.val.error || state.val.message || "Connecting…"
            )
        )
    );
    refresh();
    return div(
        { class: "tab-container" },
        AccountTabHeader({
            title: "SUSHI TOOLS",
            description: "Keep the in-game Sushi board open in sushi-move mode for Sort and Auto Play.",
            actions: RefreshButton({ onRefresh: refresh, disabled: () => pending.val }),
        }),
        controls
    );
}
