import van from "../../../vendor/van-1.6.0.js";
import { executeCheatAction } from "../../../services/api.js";
import { createStaticRowReconciler } from "./accountShared.js";
const { div, p, span, select, option, button, details, summary, h3, ul, li } = van.tags;

export function createAttireAppearancePanel({ catalog, busy, runWrite, read }) {
    const states = new Map();
    const current = van.state("");
    const names = van.state([]);
    const bulk = van.state("");
    const message = van.state("");
    const warning =
        "Applying deletes the existing attire in each changed slot, if one is worn. It will not be moved to inventory or storage.";
    const confirmation = van.state(null);
    let finishConfirmation = null;
    let previousFocus = null;
    const finish = (accepted) => {
        const resolve = finishConfirmation;
        finishConfirmation = null;
        confirmation.val = null;
        if (resolve) resolve(accepted);
        setTimeout(() => previousFocus?.focus(), 0);
    };
    const confirm = (pending) =>
        new Promise((resolve) => {
            previousFocus = document.activeElement;
            finishConfirmation = resolve;
            confirmation.val = pending;
            setTimeout(() => document.getElementById("attire-appearance-cancel")?.focus(), 0);
        });
    const rows = div({ class: "attire-appearance__rows" });
    const reconcile = createStaticRowReconciler(rows);
    const changes = () =>
        names.val
            .filter((name) => {
                const row = states.get(name);
                return row.available.val && row.draft.val !== row.item.val;
            })
            .map((name) => ({ name, before: states.get(name).item.val, item: states.get(name).draft.val }));
    const outfitOptions = (selected) => [
        option({ value: "Blank", selected: selected === "Blank" }, "No attire"),
        ...catalog.val.map(({ id, name }) => option({ value: id, selected: selected === id }, name)),
    ];
    const apply = () =>
        runWrite(
            async () => {
                message.val = "";
                const pending = changes();
                if (!pending.length) return { cancelled: true };
                if (!(await confirm(pending))) return { cancelled: true };
                const request = encodeURIComponent(JSON.stringify({ active: current.val, changes: pending }));
                const response = await executeCheatAction(`wide attire wear ${request}`);
                if (!response.result || !Array.isArray(response.result.changed))
                    throw new Error(response.result || "Could not apply character attire.");
                await read();
                message.val = response.result.message;
            },
            {
                onError: (caught) => {
                    message.val = caught.message;
                },
            }
        );
    const node = details(
        { class: "attire-appearance" },
        summary("CHARACTER APPEARANCE"),
        p("Choose what each character wears, then apply your changes together. Changes use normal game saving."),
        p(
            "A worn outfit still grants its normal bonuses even if its rack switch is off. Selected outfits are counted once."
        ),
        div(
            { class: "attire-appearance__bulk" },
            select(
                {
                    class: "select-base",
                    "aria-label": "Outfit for all characters",
                    value: bulk,
                    disabled: busy,
                    onchange: (event) => {
                        bulk.val = event.target.value;
                    },
                },
                option({ value: "" }, "Choose an outfit for everyone..."),
                () => van.tags.optgroup({ label: "Outfits" }, ...outfitOptions())
            ),
            button(
                {
                    class: "btn-secondary",
                    disabled: () => busy() || !bulk.val,
                    onclick: () => {
                        for (const row of states.values()) if (row.available.val) row.draft.val = bulk.val;
                    },
                },
                "USE FOR ALL"
            )
        ),
        rows,
        p({ class: "attire-appearance__warning" }, warning),
        div(
            { class: "attire-appearance__bulk" },
            button(
                { class: "btn-secondary", disabled: () => busy() || !changes().length, onclick: apply },
                "APPLY APPEARANCES"
            ),
            span({ role: "status", "aria-live": "polite" }, () => (busy() ? "WORKING..." : message.val))
        )
    );
    van.add(node, () => {
        const pending = confirmation.val;
        if (!pending) return span({ class: "is-hidden" });
        const outfitName = (id) =>
            id === "Blank" ? "No attire" : (catalog.val.find((item) => item.id === id)?.name ?? "Current outfit");
        return div(
            {
                class: "modal",
                role: "dialog",
                "aria-modal": "true",
                "aria-labelledby": "attire-appearance-title",
                onclick: () => finish(false),
                onkeydown: (event) => {
                    if (event.key === "Escape") {
                        event.preventDefault();
                        finish(false);
                    }
                    if (event.key === "Tab") {
                        const buttons = [...event.currentTarget.querySelectorAll("button")];
                        if (event.shiftKey && document.activeElement === buttons[0]) {
                            event.preventDefault();
                            buttons[buttons.length - 1].focus();
                        } else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) {
                            event.preventDefault();
                            buttons[0].focus();
                        }
                    }
                },
            },
            div(
                { class: "modal-box attire-appearance__modal", onclick: (event) => event.stopPropagation() },
                div({ class: "modal-header" }, h3({ id: "attire-appearance-title" }, "REPLACE CHARACTER ATTIRE?")),
                div(
                    { class: "modal-body" },
                    p({ class: "attire-appearance__warning" }, warning),
                    ul(
                        ...pending.map((change) =>
                            li(`${change.name}: ${outfitName(change.before)} → ${outfitName(change.item)}`)
                        )
                    )
                ),
                div(
                    { class: "modal-footer" },
                    button(
                        { id: "attire-appearance-cancel", class: "btn-secondary", onclick: () => finish(false) },
                        "CANCEL"
                    ),
                    button({ class: "btn-primary", onclick: () => finish(true) }, "REPLACE ATTIRE")
                )
            )
        );
    });
    return {
        node,
        sync(data) {
            current.val = data.current;
            names.val = (data.characters ?? []).map(({ name }) => name);
            for (const name of states.keys()) if (!names.val.includes(name)) states.delete(name);
            for (const character of data.characters ?? []) {
                if (!states.has(character.name))
                    states.set(character.name, {
                        item: van.state(character.item),
                        draft: van.state(character.item),
                        available: van.state(character.available),
                        active: van.state(character.active),
                    });
                const row = states.get(character.name);
                const followCurrent = row.draft.val === row.item.val;
                row.item.val = character.item;
                row.available.val = character.available;
                row.active.val = character.active;
                if (followCurrent) row.draft.val = character.item;
            }
            reconcile(JSON.stringify([names.val, catalog.val.map(({ id }) => id)]), () =>
                names.val.map((name) => {
                    const row = states.get(name);
                    return div(
                        { class: "attire-appearance__row", "data-attire-character": name },
                        div(
                            span(name),
                            span({ class: "attire-appearance__context" }, () =>
                                !row.available.val
                                    ? "Unavailable"
                                    : row.active.val
                                      ? "Active character"
                                      : "Saved character"
                            )
                        ),
                        select(
                            {
                                class: "select-base",
                                "aria-label": `Attire for ${name}`,
                                value: row.draft,
                                disabled: () => busy() || !row.available.val,
                                onchange: (event) => {
                                    row.draft.val = event.target.value;
                                },
                            },
                            ...outfitOptions(row.draft.val),
                            () =>
                                row.item.val !== "Blank" && !catalog.val.some(({ id }) => id === row.item.val)
                                    ? option({ value: row.item.val, disabled: true, selected: true }, "Current outfit")
                                    : null
                        )
                    );
                })
            );
        },
    };
}
