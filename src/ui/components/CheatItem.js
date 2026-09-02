import van from "../vendor/van-1.6.0.js";
import { Icons } from "../assets/icons.js";

const { div, button, span } = van.tags;

/**
 * Stable Atlas table row for one real cheat command or saved parameterized action.
 * Row selection is intentionally separate from execution.
 * @param {object} props
 * @returns {Element}
 */
export const CheatItem = ({
    entry,
    selected,
    getStateInfo,
    isFavorite,
    onSelect,
    onExecute,
    onFavorite,
    onOpenConfig,
    canExecute,
}) => {
    const pending = van.state(false);
    const feedback = van.state(null);
    const cheat = entry.cheat;
    const needsParameter = cheat.needsParam === true;

    const flash = (value) => {
        feedback.val = value;
        setTimeout(() => {
            if (feedback.val === value) feedback.val = null;
        }, 1200);
    };

    const execute = async () => {
        if (pending.val || !canExecute()) return;

        if (needsParameter && !entry.parameter) {
            onSelect(entry, { focusParameter: true });
            return;
        }

        try {
            pending.val = true;
            await onExecute(entry.action, cheat.message || cheat.value);
            flash("success");
        } catch {
            flash("error");
        } finally {
            pending.val = false;
        }
    };

    const actionControl = () => {
        const state = getStateInfo(cheat.value);

        if (state.known && !needsParameter) {
            return button(
                {
                    type: "button",
                    class: () =>
                        `atlas-cheat-switch ${getStateInfo(cheat.value).active ? "is-on" : ""} ${
                            pending.val ? "is-pending" : ""
                        }`,
                    role: "switch",
                    "aria-checked": () => String(getStateInfo(cheat.value).active),
                    "aria-label": () => `${getStateInfo(cheat.value).active ? "Disable" : "Enable"} ${cheat.value}`,
                    disabled: () => pending.val || !canExecute(),
                    onclick: (event) => {
                        event.stopPropagation();
                        execute();
                    },
                },
                span({ class: "atlas-cheat-switch-thumb" })
            );
        }

        return button(
            {
                type: "button",
                class: () => `atlas-cheat-run ${pending.val ? "is-pending" : ""}`,
                disabled: () => pending.val || !canExecute(),
                onclick: (event) => {
                    event.stopPropagation();
                    execute();
                },
            },
            () => (pending.val ? "Running" : needsParameter && !entry.parameter ? "Set value" : "Run")
        );
    };

    return div(
        {
            class: () =>
                `atlas-cheat-row ${selected() ? "is-selected" : ""} ${
                    getStateInfo(cheat.value).active ? "is-active" : ""
                } ${feedback.val ? `feedback-${feedback.val}` : ""}`,
            role: "row",
            tabindex: "0",
            "aria-selected": () => String(selected()),
            "aria-label": `${entry.action || cheat.value}: ${cheat.message || "No description provided"}`,
            "data-cheat-row": entry.id,
            onclick: () => onSelect(entry),
            onkeydown: (event) => {
                if (event.target !== event.currentTarget) return;
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                onSelect(entry);
            },
        },
        div(
            { class: "atlas-cheat-command-cell", role: "cell" },
            span({ class: "atlas-cheat-glyph", "aria-hidden": "true" }, Icons.Lightning()),
            div(
                { class: "atlas-cheat-command-copy" },
                span({ class: "atlas-cheat-command" }, entry.action || cheat.value),
                entry.parameter ? span({ class: "atlas-cheat-saved-value" }, `Saved value: ${entry.parameter}`) : null
            ),
            entry.hasConfig
                ? button(
                      {
                          type: "button",
                          class: "atlas-cheat-config-link",
                          title: "Edit linked configuration",
                          "aria-label": `Edit configuration for ${cheat.value}`,
                          onclick: (event) => {
                              event.stopPropagation();
                              onOpenConfig(entry);
                          },
                      },
                      Icons.Config()
                  )
                : null
        ),
        span({ class: "atlas-cheat-description", role: "cell" }, cheat.message || "No description provided"),
        span({ class: "atlas-cheat-category", role: "cell" }, cheat.category || "general"),
        div(
            { class: "atlas-cheat-state-cell", role: "cell" },
            () => actionControl(),
            button(
                {
                    type: "button",
                    class: () => `atlas-cheat-favorite ${isFavorite(entry) ? "is-favorite" : ""}`,
                    title: () => (isFavorite(entry) ? "Remove from favorites" : "Add to favorites"),
                    "aria-label": () => (isFavorite(entry) ? "Remove from favorites" : "Add to favorites"),
                    "aria-pressed": () => String(isFavorite(entry)),
                    onclick: (event) => {
                        event.stopPropagation();
                        onFavorite(entry);
                    },
                },
                Icons.Star()
            )
        )
    );
};
