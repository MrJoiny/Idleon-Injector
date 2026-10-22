import van from "../../../../../vendor/van-1.6.0.js";
import { executeCheatAction, fetchConfig, updateSessionConfig, saveConfigFile } from "../../../../../services/api.js";
import { AccountTabHeader } from "../../components/AccountTabHeader.js";
import { RefreshButton } from "../../components/AccountPageChrome.js";
import { AccountSection } from "../../components/AccountSection.js";
import { AccountRow } from "../../components/AccountRow.js";
import { ActionButton } from "../../components/ActionButton.js";
const { div, label, input, p, h3, span } = van.tags;

export function SushiToolsTab() {
    const enabled = van.state(false);
    const state = van.state({});
    const pending = van.state(false);
    const settingsLoaded = van.state(false);
    const settings = {
        tier: van.state(""),
        targetCount: van.state(""),
        targetTier: van.state(""),
        reserveSlots: van.state(""),
        extendChain: van.state(false),
        higherTier: van.state(false),
        ingameButtons: van.state(false),
    };
    const knowledgeTier = van.state("1");
    const knowledgeQuantity = van.state("1");
    const feedback = van.state("");
    async function refresh() {
        pending.val = true;
        settingsLoaded.val = false;
        try {
            const config = await fetchConfig();
            const saved = config.cheatConfig.w7.sushitools;
            for (const [key, value] of Object.entries(settings)) value.val = saved[key];
            state.val = await command("status");
            settingsLoaded.val = true;
            enabled.val = state.val.enabled;
            feedback.val = "";
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
            draft.tier < 1 ||
            draft.tier > state.val.maxPurchaseTier ||
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
    async function run(action) {
        pending.val = true;
        try {
            if (action === "save" || (action === "" && !enabled.val)) await saveSettings();
            if (action === "save") {
                feedback.val = "Settings saved.";
                return;
            }
            const result = await command(action);
            enabled.val = result.enabled;
            state.val = { ...state.val, error: null };
            feedback.val = result.message;
        } catch (error) {
            feedback.val = error.message;
        } finally {
            pending.val = false;
        }
    }
    const locked = () => enabled.val || pending.val || !settingsLoaded.val;
    const numberField = (title, value, min = 1) =>
        label(
            { class: "sushi-setting" },
            span({ class: "sushi-setting__title" }, title),
            input({
                "aria-label": title,
                type: "number",
                min,
                step: 1,
                value,
                disabled: locked,
                oninput: (e) => {
                    value.val = e.target.value;
                },
            })
        );
    const toggle = (title, value) =>
        label(
            { class: "toggle-switch sushi-toggle" },
            input({
                type: "checkbox",
                role: "switch",
                checked: value,
                disabled: locked,
                onchange: (e) => {
                    value.val = e.target.checked;
                },
            }),
            span({ class: "slider", "aria-hidden": "true" }),
            span({ class: "label" }, title)
        );
    const controls = div(
        { class: "scrollable-panel", "aria-busy": () => pending.val },
        div(
            { class: "sushi-tools-layout" },
            AccountSection({
                title: "AUTOMATION SETTINGS",
                rootClass: "sushi-automation-controls",
                body: [
                    div(
                        { class: "content-stack" },
                        div(
                            { class: "sushi-settings-section" },
                            h3("PURCHASE"),
                            div(
                                { class: "sushi-settings-grid" },
                                numberField("Purchase tier", settings.tier)
                            )
                        ),
                        div(
                            { class: "sushi-settings-section" },
                            h3("GOAL & BOARD"),
                            div(
                                { class: "sushi-settings-grid" },
                                numberField("Target tier", settings.targetTier),
                                numberField("Target quantity", settings.targetCount),
                                numberField("Empty slots", settings.reserveSlots, 0)
                            )
                        ),
                        div(
                            { class: "sushi-settings-section" },
                            h3("EAST WIND"),
                            div(
                                { class: "account-item-stack" },
                                toggle("Extended East Wind chain", settings.extendChain),
                                toggle("Higher East Wind tier limit", settings.higherTier)
                            )
                        )
                    ),
                    div(
                        { class: "sushi-automation-footer" },
                        p({ class: "sushi-setting__help" }, "Auto Play also saves these settings."),
                        ActionButton({
                            label: () => (pending.val ? "Working…" : "Save settings"),
                            disabled: locked,
                            onClick: () => run("save"),
                        })
                    ),
                ],
            }),
            div(
                { class: "content-stack" },
                AccountSection({
                    title: "AUTOMATION",
                    rootClass: "sushi-automation-controls",
                    body: [
                        AccountRow({
                            info: "Target",
                            badge: () => `${settings.targetCount.val || "…"} × tier ${settings.targetTier.val || "…"}+`,
                        }),
                        p({ class: "sushi-setting__help" }, "Idles at the goal. Disable and enable to run again."),
                        div(
                            { class: "account-item-stack" },
                            ActionButton({
                                label: () => (enabled.val ? "Disable Auto Play" : "Enable Auto Play"),
                                variant: "account-btn",
                                className: () => (enabled.val ? "account-btn--danger" : "account-btn--apply"),
                                disabled: () => pending.val || (!enabled.val && !settingsLoaded.val),
                                onClick: () => run(""),
                            }),
                            ActionButton({ label: "Sort", disabled: locked, onClick: () => run("sort") })
                        ),
                        toggle("Show in-game buttons", settings.ingameButtons),
                        div(
                            { class: "sushi-automation-info" },
                            p({ role: "status", "aria-live": "polite", class: "sushi-automation-status" }, () =>
                                pending.val
                                    ? "Working…"
                                    : feedback.val || state.val.error || state.val.message || "Connecting…"
                            )
                        ),
                    ],
                }),
                AccountSection({
                    title: "KNOWLEDGE XP",
                    rootClass: "sushi-automation-controls",
                    body: [
                        p({ class: "sushi-setting__help" }, "Requires Knowledge. Adds crafting-tree XP only."),
                        div(
                            { class: "sushi-settings-grid" },
                            numberField("Simulation tier", knowledgeTier),
                            numberField("Simulation quantity", knowledgeQuantity)
                        ),
                        p({ class: "sushi-setting__help" }, "Each click adds XP again; board and fuel stay unchanged."),
                        ActionButton({
                            label: "Add Knowledge XP",
                            disabled: locked,
                            onClick: () => run("knowledge " + knowledgeTier.val + " " + knowledgeQuantity.val),
                        }),
                    ],
                })
            )
        )
    );
    const root = div(
        { class: "tab-container" },
        AccountTabHeader({
            title: "SUSHI TOOLS",
            description: "Keep the in-game Sushi board open in sushi-move mode for Sort and Auto Play.",
            actions: RefreshButton({ onRefresh: refresh, disabled: () => pending.val }),
        }),
        controls
    );
    refresh();
    return root;
}
