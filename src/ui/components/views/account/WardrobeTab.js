import van from "../../../vendor/van-1.6.0.js";
import { executeCheatAction, fetchWardrobeLoadouts, saveWardrobeLoadout } from "../../../services/api.js";
import { AccountTabHeader } from "./components/AccountTabHeader.js";
import { AccountSection } from "./components/AccountSection.js";
import { ActionButton } from "./components/ActionButton.js";
import { RefreshButton, WarningBanner } from "./components/AccountPageChrome.js";
const { div, p, label, select, option, ol, li, strong, input, optgroup, button, h3 } = van.tags;
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
    const saved = van.state({}),
        loadoutName = van.state(""),
        dialog = van.state(null);
    let resolveDialog = null,
        previousFocus = null;
    const state = van.state(null),
        selected = van.state(""),
        preview = van.state(null),
        busy = van.state(false),
        message = van.state("");
    function choices() {
        return [
            ...(state.val?.presets || []),
            ...Object.values(saved.val).filter(
                (p) =>
                    p.classes?.includes(state.val?.baseClass) &&
                    (p.characterClass === undefined || p.characterClass === state.val?.characterClass)
            ),
        ];
    }
    function closeDialog(confirmed) {
        dialog.val = null;
        const resolve = resolveDialog;
        resolveDialog = null;
        previousFocus?.focus();
        if (resolve) resolve(confirmed);
    }
    function confirmInPage(title, text, notes = [], informational = false) {
        previousFocus = document.activeElement;
        dialog.val = { title, text, notes, informational };
        return new Promise((resolve) => {
            resolveDialog = resolve;
            setTimeout(() => root.querySelector(".wardrobe-dialog button")?.focus(), 0);
        });
    }
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
            saved.val = (await fetchWardrobeLoadouts()).loadouts;
            if (!choices().some((p) => p.id === selected.val)) selected.val = choices()[0]?.id || "";
        });
    }
    async function apply() {
        await run(async () => {
            const confirmed = preview.val;
            if (!confirmed) return;
            if (
                !(await confirmInPage(
                    "APPLY LOADOUT?",
                    warning +
                        " Apply " +
                        confirmed.name +
                        " to " +
                        confirmed.character +
                        " (" +
                        confirmed.baseClass +
                        ")?"
                ))
            ) {
                await command("cancel");
                preview.val = null;
                message.val = "Cancelled. Nothing changed.";
                return;
            }
            const result = await command("apply " + selected.val + " " + confirmed.token);
            preview.val = null;
            message.val = result.message;
            await confirmInPage("LOADOUT APPLIED", result.message, result.notes || [], true);
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
                title: "SAVE CURRENT LOADOUT",
                body: div(
                    { class: "content-stack" },
                    p(
                        "Save this character's current gear, food choices, cards, prayers, chips and personal/family obols to My Loadouts in config.custom.js. Applying rebuilds gear with Perfect Equipped bonuses; premium hat, trophy, cape and nametag stay unchanged. Unmapped keychains retain their saved rolls."
                    ),
                    label({ for: "wardrobe-name" }, "Loadout name"),
                    input({
                        id: "wardrobe-name",
                        class: "input-base",
                        maxlength: 80,
                        value: loadoutName,
                        oninput: (e) => (loadoutName.val = e.target.value),
                        disabled: () => busy.val,
                    }),
                    ActionButton({
                        label: "SAVE CURRENT LOADOUT",
                        disabled: () => busy.val || !state.val || !loadoutName.val.trim(),
                        onClick: () =>
                            run(async () => {
                                const captured = await command("capture");
                                captured.name = loadoutName.val.trim();
                                saved.val = (await saveWardrobeLoadout(captured.id, captured)).loadouts;
                                selected.val = captured.id;
                                preview.val = null;
                                loadoutName.val = "";
                                message.val = "Loadout saved to config.custom.js. Equipped items were not changed.";
                            }),
                    })
                ),
            }),
            AccountSection({
                title: "LOADOUT",
                body: div(
                    { class: "content-stack" },
                    p(() =>
                        state.val
                            ? state.val.character +
                              " · " +
                              state.val.baseClass +
                              " · " +
                              (state.val.prayerCheat ? "Prayer cheat ON" : "Vanilla prayers") +
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
                            ...[
                                ["Predefined", state.val?.presets || []],
                                ["My Loadouts", choices().filter((p) => saved.val[p.id])],
                            ].map(([title, items]) =>
                                optgroup(
                                    { label: title },
                                    items.map((preset) =>
                                        option({ value: preset.id, selected: preset.id === selected.val }, preset.name)
                                    )
                                )
                            )
                        ),
                    p(
                        () =>
                            choices().find((p) => p.id === selected.val)?.description ||
                            (choices().some((p) => p.id === selected.val)
                                ? "Player-made loadout."
                                : "No loadouts for this base class.")
                    ),
                    p(
                        "Town progression selects stones I–VII. Random stat rolls use your main stat. Premium and Tempest gear keep their special rules."
                    ),
                    p(
                        "Wardrobe equips eligible choices, substitutes the highest eligible tool when needed, and reports omissions. Card stars and prayer levels are preserved. With the prayer cheat on, predefined loadouts use their expanded prayer list; turning it off restores their vanilla list during this game session."
                    ),
                    ActionButton({
                        label: () => (busy.val ? "WORKING…" : "PREVIEW LOADOUT"),
                        disabled: () => busy.val || !selected.val,
                        onClick: () =>
                            run(async () => {
                                const custom = saved.val[selected.val];
                                preview.val = await command(
                                    custom
                                        ? "preview-saved " + encodeURIComponent(JSON.stringify(custom))
                                        : "preview " + selected.val
                                );
                            }),
                    }),
                    ActionButton({
                        label: "DELETE SAVED LOADOUT...",
                        variant: "danger",
                        disabled: () => busy.val || !saved.val[selected.val],
                        onClick: () =>
                            run(async () => {
                                const id = selected.val;
                                if (
                                    !(await confirmInPage(
                                        "DELETE SAVED LOADOUT?",
                                        "Delete " +
                                            saved.val[id].name +
                                            " from config.custom.js? Equipped items will not change."
                                    ))
                                )
                                    return;
                                saved.val = (await saveWardrobeLoadout(id, null)).loadouts;
                                preview.val = null;
                                selected.val = choices()[0]?.id || "";
                                message.val = "Saved loadout deleted.";
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
                                  ...(preview.val.notes?.length ? [ol(preview.val.notes.map((note) => li(note)))] : []),
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
                                              strong(
                                                  (section.labels?.[index] ||
                                                      labels[section.title]?.[index] ||
                                                      "Slot " + (index + 1)) + ": "
                                              ),
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
    van.add(root, () =>
        dialog.val
            ? div(
                  {
                      class: "modal wardrobe-dialog",
                      role: "dialog",
                      "aria-modal": "true",
                      "aria-labelledby": "wardrobe-dialog-title",
                      onkeydown: (e) => {
                          if (e.key === "Escape") {
                              e.preventDefault();
                              closeDialog(false);
                          }
                          if (e.key === "Tab") {
                              const buttons = root.querySelectorAll(".wardrobe-dialog button");
                              if (e.shiftKey && document.activeElement === buttons[0]) {
                                  e.preventDefault();
                                  buttons[buttons.length - 1].focus();
                              } else if (!e.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
                                  e.preventDefault();
                                  buttons[0].focus();
                              }
                          }
                      },
                  },
                  div(
                      { class: "modal-box" },
                      div({ class: "modal-header" }, h3({ id: "wardrobe-dialog-title" }, dialog.val.title)),
                      div(
                          { class: "modal-body" },
                          p(dialog.val.text),
                          ...(dialog.val.notes.length ? [ol(dialog.val.notes.map((note) => li(note)))] : [])
                      ),
                      div(
                          { class: "modal-footer" },
                          dialog.val.informational
                              ? null
                              : button(
                                    { type: "button", class: "btn-secondary", onclick: () => closeDialog(false) },
                                    "CANCEL"
                                ),
                          button(
                              { type: "button", class: "btn-danger", onclick: () => closeDialog(true) },
                              dialog.val.informational ? "CLOSE" : "CONFIRM"
                          )
                      )
                  )
              )
            : div()
    );
    let polling = false;
    const timer = setInterval(async () => {
        if (!root.isConnected) {
            clearInterval(timer);
            closeDialog(false);
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
                next.characterClass !== state.val.characterClass ||
                next.world !== state.val.world ||
                next.prayerCheat !== state.val.prayerCheat
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
