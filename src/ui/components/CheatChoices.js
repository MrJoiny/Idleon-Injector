import van from "../vendor/van-1.6.0.js";

const { div, details, summary, input, button, span } = van.tags;

const families = {
    drop: ["Drop items", "Quantity"],
    nomore: ["Block or unblock item drops", ""],
    multiplestacks: ["Configure multiple chest stacks", "Stack count"],
    spawn: ["Spawn monsters", "Quantity"],
    bulk: ["Drop all items of a type", "Quantity per item"],
    buy: ["Claim bundle items, excluding gems and pets", ""],
    class: ["Change character class", ""],
    lvl: ["Change skill or system levels", "Level"],
    keychain: ["Override keychain stats", ""],
    "w4 chips": ["Add lab chips", "Amount"],
    "w5 jargems": ["Add jar gems", "Amount"],
    "w6 sumunit": ["Choose summoning unit type", ""],
};

/**
 * Group target variants for the Web UI without changing executable commands.
 * @param {object[]} cheats - Original suggestions, also used by saved actions.
 * @returns {object[]} Ordinary suggestions and one choice entry per family.
 */
export const groupCheatChoices = (cheats) => {
    const groups = new Map();
    const result = [];
    for (const cheat of cheats) {
        const family = Object.keys(families).find((key) => cheat.value === key || cheat.value.startsWith(`${key} `));
        if (!family) {
            result.push(cheat);
            continue;
        }
        if (!groups.has(family)) {
            const [message, amountLabel] = families[family];
            const group = { value: family, message, category: cheat.category, choices: [], amountLabel };
            groups.set(family, group);
            result.push(group);
        }
        if (cheat.value !== family) groups.get(family).choices.push(cheat);
    }
    return result;
};

/**
 * Build a selected variant's command, retaining zero and negative numeric arguments.
 * @param {object} cheat - Grouped suggestion.
 * @param {object} state - Target, amount, and custom regex VanJS states.
 * @returns {string|null} Executable action, or null until inputs are complete.
 */
export const buildChoiceAction = (cheat, state) => {
    const target = state.target.val;
    if (cheat.value === "nomore" && target === "custom") {
        const pattern = state.pattern.val.trim();
        if (!pattern || /\s/.test(pattern)) return null;
        try {
            new RegExp(pattern);
        } catch {
            return null;
        }
        return `nomore ${pattern}`;
    }
    if (!cheat.choices.some((choice) => choice.value === target)) return null;
    if (!cheat.amountLabel) return target;
    const amount = state.amount.val.trim();
    return /^-?\d+$/.test(amount) ? `${target} ${amount}` : null;
};

/**
 * Search a command's targets by name or ID, rendering at most 80 matches.
 * @param {{cheat: object, state: object, compact?: boolean}} props
 * @returns {HTMLElement}
 */
export const CheatChoices = ({ cheat, state, compact = false }) => {
    const query = van.state("");
    const options = cheat.choices.map((choice) => ({
        value: choice.value,
        label: choice.message
            ? `${choice.message} (${choice.value.slice(cheat.value.length + 1)})`
            : choice.value.slice(cheat.value.length + 1),
        search: `${choice.value} ${choice.message || ""}`.toLowerCase(),
    }));
    if (cheat.value === "nomore") options.push({ value: "custom", label: "Custom regex", search: "custom regex" });
    const matches = van.derive(() =>
        options.filter((option) => option.search.includes(query.val.trim().toLowerCase()))
    );
    const heading = summary(
        { title: () => options.find((option) => option.value === state.target.val)?.label || "Select a target..." },
        () => options.find((option) => option.value === state.target.val)?.label || "Select a target..."
    );
    const menu = details(
        {
            class: "atlas-choice-menu",
            onfocusout: (event) => {
                if (!menu.contains(event.relatedTarget)) menu.open = false;
            },
            onkeydown: (event) => {
                if (event.key === "Escape") {
                    event.stopPropagation();
                    menu.open = false;
                    heading.focus();
                }
            },
        },
        heading,
        div(
            { class: "atlas-choice-popup" },
            input({
                type: "search",
                placeholder: "Search by name or ID...",
                "aria-label": `Search ${cheat.value} targets`,
                value: query,
                oninput: (event) => (query.val = event.target.value),
                onkeydown: (event) => {
                    if (event.key === "ArrowDown") {
                        event.preventDefault();
                        menu.querySelector(".atlas-choice-results button")?.focus();
                    }
                },
            }),
            span({ class: "atlas-choice-count", "aria-live": "polite" }, () =>
                matches.val.length > 80
                    ? `${matches.val.length} matches; showing first 80. Refine your search.`
                    : `${matches.val.length} matches`
            ),
            div({ class: "atlas-choice-results" }, () =>
                div(
                    ...matches.val.slice(0, 80).map((option) =>
                        button(
                            {
                                type: "button",
                                "aria-pressed": () => String(state.target.val === option.value),
                                onclick: () => {
                                    state.target.val = option.value;
                                    menu.open = false;
                                    heading.focus();
                                },
                                onkeydown: (event) => {
                                    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
                                    event.preventDefault();
                                    const next =
                                        event.key === "ArrowDown"
                                            ? event.currentTarget.nextElementSibling
                                            : event.currentTarget.previousElementSibling;
                                    next?.focus();
                                },
                            },
                            option.label
                        )
                    )
                )
            )
        )
    );
    return div(
        { class: "atlas-choice-controls", onclick: (event) => event.stopPropagation() },
        menu,
        cheat.amountLabel
            ? input({
                  type: "number",
                  step: "1",
                  placeholder: compact && cheat.amountLabel === "Quantity per item" ? "Quantity" : cheat.amountLabel,
                  title: cheat.amountLabel,
                  "aria-label": `${cheat.value} ${cheat.amountLabel}`,
                  value: state.amount,
                  oninput: (event) => (state.amount.val = event.target.value),
              })
            : null,
        cheat.value === "nomore"
            ? div(
                  { hidden: () => state.target.val !== "custom" },
                  input({
                      type: "text",
                      placeholder: "Regex, e.g. ^Equipment",
                      "aria-label": "Custom drop-blocking regex",
                      value: state.pattern,
                      oninput: (event) => (state.pattern.val = event.target.value),
                  })
              )
            : null
    );
};
