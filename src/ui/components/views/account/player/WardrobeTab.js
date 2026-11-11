import van from "../../../../vendor/van-1.6.0.js";
import { performGameAction, fetchConfig, saveConfigFile } from "../../../../services/api.js";
import { AccountTabHeader } from "../components/AccountTabHeader.js";
import { AccountSection } from "../components/AccountSection.js";
import { RefreshButton, WarningBanner } from "../components/AccountPageChrome.js";
const { div, p, label, select, option, input, optgroup, button, h3, ul, li } = van.tags;
const warning = "Applying permanently replaces the listed items and settings. Store anything you want to keep first.";
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
        saved = van.state({}),
        selected = van.state("");
    const preview = van.state(null),
        busy = van.state(false),
        message = van.state("");
    const notes = van.state([]),
        name = van.state(""),
        dialog = van.state(null);
    let resolveDialog = null,
        previousFocus = null;
    const command = (action, args = {}) => performGameAction("wardrobe", action, args);
    const choices = () =>
        Object.values(saved.val).filter(
            (p) =>
                p.classes?.includes(state.val?.baseClass) &&
                (p.characterClass === undefined || p.characterClass === state.val?.characterClass)
        );
    const read = async () => {
        preview.val = null;
        state.val = await command("status");
        saved.val = (await fetchConfig()).wardrobeLoadouts;
        if (![...state.val.presets, ...choices()].some((p) => p.id === selected.val))
            selected.val = state.val.presets[0]?.id || choices()[0]?.id || "";
    };
    const run = async (task) => {
        if (busy.val) return;
        busy.val = true;
        message.val = "";
        notes.val = [];
        try {
            await task();
        } catch (error) {
            preview.val = null;
            message.val = error.message.replace(/^(Error:\s*)+/, "").split(/\n|\s+at\s/)[0];
        } finally {
            busy.val = false;
        }
    };
    const finish = (accepted) => {
        dialog.val = null;
        const resolve = resolveDialog;
        resolveDialog = null;
        previousFocus?.focus();
        resolve(accepted);
    };
    const confirm = (title, text) =>
        new Promise((resolve) => {
            previousFocus = document.activeElement;
            resolveDialog = resolve;
            dialog.val = { title, text };
            setTimeout(() => root.querySelector(".wardrobe-dialog button")?.focus(), 0);
        });
    const save = async (id, loadout) => {
        const config = await fetchConfig();
        await saveConfigFile({ ...config, wardrobeChange: { id, loadout } });
        saved.val = (await fetchConfig()).wardrobeLoadouts;
    };
    const apply = () =>
        run(async () => {
            const pending = preview.val;
            if (
                !(await confirm(
                    "APPLY LOADOUT?",
                    warning + " Apply " + pending.name + " to " + pending.character + "?"
                ))
            ) {
                await command("cancel");
                preview.val = null;
                message.val = "Cancelled.";
                return;
            }
            const result = await command("apply", { id: selected.val, token: pending.token });
            await read();
            message.val = result.message;
            notes.val = result.notes;
        });
    const action = (text, click, disabled, danger = false) =>
        button(
            {
                class: danger ? "btn-danger" : "btn-secondary",
                disabled: () => busy.val || disabled(),
                onclick: click,
            },
            text
        );
    const root = div(
        { class: "tab-container wardrobe-page" },
        AccountTabHeader({
            title: "WARDROBE",
            actions: RefreshButton({ onRefresh: () => run(read), disabled: () => busy.val }),
        }),
        div(
            { class: "scrollable-panel content-stack" },
            WarningBanner(warning),
            AccountSection({
                title: "LOADOUT",
                body: div(
                    { class: "content-stack" },
                    p(() => (state.val ? state.val.character + " · " + state.val.baseClass : "Reading character…")),
                    () =>
                        select(
                            {
                                class: "select-base",
                                "aria-label": "Loadout",
                                disabled: () => busy.val || !state.val,
                                onchange: (event) => {
                                    selected.val = event.target.value;
                                    preview.val = null;
                                },
                            },
                            ...[
                                ["Predefined", state.val?.presets || []],
                                ["My Loadouts", choices()],
                            ].map(([title, items]) =>
                                optgroup(
                                    { label: title },
                                    items.map((p) => option({ value: p.id, selected: selected.val === p.id }, p.name))
                                )
                            )
                        ),
                    div(
                        { class: "wardrobe-actions" },
                        action(
                            "PREVIEW",
                            () =>
                                run(async () => {
                                    preview.val = await command("preview", {
                                        id: selected.val,
                                        loadout: saved.val[selected.val],
                                    });
                                }),
                            () => !selected.val
                        ),
                        action(
                            "DELETE SAVED",
                            () =>
                                run(async () => {
                                    const id = selected.val;
                                    if (!(await confirm("DELETE LOADOUT?", "Delete " + saved.val[id].name + "?")))
                                        return;
                                    await save(id, null);
                                    await read();
                                    message.val = "Loadout deleted.";
                                }),
                            () => !saved.val[selected.val],
                            true
                        )
                    )
                ),
            }),
            AccountSection({
                title: "SAVE CURRENT",
                body: div(
                    { class: "wardrobe-actions" },
                    label(
                        "Name",
                        input({
                            class: "input-base",
                            value: name,
                            maxlength: 80,
                            "aria-label": "Loadout name",
                            oninput: (event) => (name.val = event.target.value),
                        })
                    ),
                    action(
                        "SAVE",
                        () =>
                            run(async () => {
                                const loadout = await command("capture");
                                loadout.name = name.val.trim();
                                await save(loadout.id, loadout);
                                await read();
                                selected.val = loadout.id;
                                name.val = "";
                                message.val = "Loadout saved.";
                            }),
                        () => !name.val.trim() || !state.val
                    )
                ),
            }),
            div({ role: "status", "aria-live": "polite" }, () => (busy.val ? "Working…" : message.val)),
            () => (notes.val.length ? ul(notes.val.map((note) => li(note))) : div()),
            () =>
                preview.val
                    ? div(
                          { class: "wardrobe-preview" },
                          AccountSection({
                              title: preview.val.name + " · " + preview.val.character,
                              rootClass: "wardrobe-review",
                              body: div(
                                  preview.val.notes.length ? ul(preview.val.notes.map((note) => li(note))) : div(),
                                  action("APPLY LOADOUT…", apply, () => !preview.val, true)
                              ),
                          }),
                          ...preview.val.sections.map((section) =>
                              AccountSection({
                                  title: section.title,
                                  body: ul(
                                      section.items.map((item, slot) =>
                                          li(
                                              (section.labels?.[slot] ||
                                                  labels[section.title]?.[slot] ||
                                                  "Slot " + (slot + 1)) +
                                                  ": " +
                                                  item
                                          )
                                      )
                                  ),
                              })
                          )
                      )
                    : div()
        ),
        () =>
            dialog.val
                ? div(
                      {
                          class: "modal wardrobe-dialog",
                          role: "dialog",
                          "aria-modal": "true",
                          "aria-labelledby": "wardrobe-dialog-title",
                          onkeydown: (event) => {
                              if (event.key === "Escape") finish(false);
                          },
                      },
                      div(
                          { class: "modal-box" },
                          div({ class: "modal-header" }, h3({ id: "wardrobe-dialog-title" }, dialog.val.title)),
                          div({ class: "modal-body" }, p(dialog.val.text)),
                          div(
                              { class: "modal-footer" },
                              button({ class: "btn-secondary", onclick: () => finish(false) }, "CANCEL"),
                              button({ class: "btn-danger", onclick: () => finish(true) }, "CONFIRM")
                          )
                      )
                  )
                : div()
    );
    void run(read);
    return root;
}
