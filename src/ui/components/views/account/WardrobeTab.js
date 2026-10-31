import van from "../../../vendor/van-1.6.0.js";
import { executeCheatAction } from "../../../services/api.js";
import { AccountTabHeader } from "./components/AccountTabHeader.js";
import { AccountSection } from "./components/AccountSection.js";
import { ActionButton } from "./components/ActionButton.js";
import { RefreshButton, WarningBanner } from "./components/AccountPageChrome.js";
const { div, p, label, select, option, ol, li, strong } = van.tags;
const warning =
    "This permanently overwrites the affected gear, food, cards, prayers, lab chips, and personal AND family obols. Unequip and store anything you want to keep first. Replaced items will not be stored or restored.";
const labels = {
    "Equipment & specials": [
        "Helmet",
        "Weapon",
        "Shirt",
        "Pendant",
        "Pants",
        "Ring 1",
        "Shoes",
        "Ring 2",
        "Premium hat",
        "Keychain 1",
        "Trophy",
        "Keychain 2",
        "Cape",
        "Chat ring",
        "Nametag",
        "Outfit",
    ],
    Tools: ["Pickaxe", "Hatchet", "Fishing rod", "Catching net", "Trap", "Worship skull", "DNA gun"],
};
export function WardrobeTab() {
    const state = van.state(null),
        selected = van.state(""),
        preview = van.state(null),
        busy = van.state(false),
        message = van.state("");
    async function command(action) {
        const response = await executeCheatAction("wide wardrobe " + action);
        if (typeof response.result !== "string" || response.result.startsWith("Error:"))
            throw new Error(
                String(response.result || "Wardrobe command failed.")
                    .replace(/^(Error:\s*)+/, "")
                    .split(/\s+at\s|\n/)[0]
            );
        return JSON.parse(response.result);
    }
    async function run(task) {
        if (busy.val) return;
        busy.val = true;
        message.val = "";
        try {
            await task();
        } catch (error) {
            message.val = error.message;
            preview.val = null;
        } finally {
            busy.val = false;
        }
    }
    async function load() {
        await run(async () => {
            preview.val = null;
            state.val = await command("status");
            if (!state.val.presets.some((p) => p.id === selected.val)) selected.val = state.val.presets[0]?.id || "";
        });
    }
    async function apply() {
        await run(async () => {
            const confirmed = preview.val;
            if (!confirmed) return;
            if (
                !window.confirm(
                    warning +
                        "\n\nApply " +
                        confirmed.name +
                        " to " +
                        confirmed.character +
                        " (" +
                        confirmed.baseClass +
                        ")?"
                )
            ) {
                await command("cancel");
                preview.val = null;
                message.val = "Cancelled. Nothing changed.";
                return;
            }
            const result = await command("apply " + selected.val + " " + confirmed.token);
            preview.val = null;
            message.val = result.message;
        });
    }
    void load();
    const root = div(
        { class: "tab-container wardrobe-page" },
        AccountTabHeader({
            title: "WARDROBE",
            description: "Apply a permanent loadout to the character currently active in the game.",
            actions: RefreshButton({ onRefresh: load, disabled: () => busy.val }),
        }),
        div(
            { class: "scrollable-panel content-stack" },
            WarningBanner(warning),
            AccountSection({
                title: "LOADOUT",
                body: div(
                    { class: "content-stack" },
                    p(() =>
                        state.val
                            ? state.val.character +
                              " · " +
                              state.val.baseClass +
                              " · W" +
                              state.val.world +
                              " town stones"
                            : "Select a character in the game, then refresh."
                    ),
                    label({ for: "wardrobe-preset" }, "Choose a loadout"),
                    () =>
                        select(
                            {
                                id: "wardrobe-preset",
                                class: "select-base",
                                disabled: () => busy.val || !state.val,
                                onchange: (e) => {
                                    selected.val = e.target.value;
                                    preview.val = null;
                                },
                            },
                            ...(state.val?.presets || []).map((preset) =>
                                option({ value: preset.id, selected: preset.id === selected.val }, preset.name)
                            )
                        ),
                    p(
                        () =>
                            state.val?.presets.find((p) => p.id === selected.val)?.description ||
                            "No loadouts for this base class."
                    ),
                    p(
                        "Town progression selects stones I–VII. Random stat rolls use your main stat. Premium and Tempest gear keep their special rules."
                    ),
                    p(
                        "This test preset requires its cards, prayers and chips to be unlocked, five food slots, eight card slots and Laboratory level 75. Card stars and prayer levels are preserved. Locked obol slots stay locked."
                    ),
                    ActionButton({
                        label: () => (busy.val ? "WORKING…" : "PREVIEW LOADOUT"),
                        disabled: () => busy.val || !selected.val,
                        onClick: () =>
                            run(async () => {
                                preview.val = await command("preview " + selected.val);
                            }),
                    })
                ),
            }),
            div({ class: "write-status", role: "status", "aria-live": "polite" }, message),
            () =>
                preview.val
                    ? div(
                          { class: "wardrobe-preview" },
                          AccountSection({
                              title: "REVIEW · " + preview.val.character,
                              rootClass: "wardrobe-review",
                              body: div(
                                  { class: "content-stack" },
                                  p(
                                      "Keep slots stay unchanged. Empty slots are cleared. This action has no undo or automatic restore."
                                  ),
                                  ActionButton({
                                      label: "APPLY LOADOUT…",
                                      variant: "danger",
                                      disabled: () => busy.val,
                                      onClick: apply,
                                  })
                              ),
                          }),
                          ...preview.val.sections.map((section) =>
                              AccountSection({
                                  title: section.title,
                                  body: ol(
                                      section.items.map((item, index) =>
                                          li(
                                              strong((labels[section.title]?.[index] || "Slot " + (index + 1)) + ": "),
                                              item
                                          )
                                      )
                                  ),
                              })
                          )
                      )
                    : div()
        )
    );
    let polling = false;
    const timer = setInterval(async () => {
        if (!root.isConnected) {
            clearInterval(timer);
            return;
        }
        if (busy.val || polling || document.hidden || root.offsetParent === null) return;
        polling = true;
        try {
            const next = await command("status");
            if (busy.val) return;
            if (
                !state.val ||
                next.character !== state.val.character ||
                next.baseClass !== state.val.baseClass ||
                next.world !== state.val.world
            ) {
                state.val = next;
                preview.val = null;
                selected.val = next.presets[0]?.id || "";
                message.val = "Active character updated. Preview your loadout before applying.";
            }
        } catch (error) {
            state.val = null;
            preview.val = null;
            selected.val = "";
            message.val = error.message;
        } finally {
            polling = false;
        }
    }, 3000);
    return root;
}
