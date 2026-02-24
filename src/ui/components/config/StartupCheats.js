import van from "../../vendor/van-1.6.0.js";
import store from "../../state/store.js";
import { EmptyState } from "../EmptyState.js";
import { Icons } from "../../assets/icons.js";

const { div, ul, li, input, button } = van.tags;

const normalizeAction = (action) => (typeof action === "string" ? action.trim() : "");

const findCheatMatch = (action) => {
    if (!action) return null;

    let bestMatch = null;
    for (const cheat of store.data.cheats) {
        if (!cheat || typeof cheat.value !== "string") continue;

        const command = cheat.value;
        if (action !== command && !action.startsWith(`${command} `)) continue;

        if (!bestMatch || command.length > bestMatch.value.length) {
            bestMatch = cheat;
        }
    }

    return bestMatch;
};

const parseStartupAction = (action) => {
    const normalizedAction = normalizeAction(action);
    const cheat = findCheatMatch(normalizedAction);

    if (!cheat || cheat.needsParam !== true) {
        return { command: normalizedAction, value: "", needsParam: false };
    }

    const value = normalizedAction === cheat.value ? "" : normalizedAction.slice(cheat.value.length + 1);

    return {
        command: cheat.value,
        value,
        needsParam: true,
    };
};

const buildStartupAction = (command, value = "") => {
    const normalizedCommand = normalizeAction(command);
    if (!normalizedCommand) return "";

    const normalizedValue = normalizeAction(value);
    return normalizedValue ? `${normalizedCommand} ${normalizedValue}` : normalizedCommand;
};

export const StartupCheats = (list) => {
    if (store.data.cheats.length === 0) store.loadCheats();

    const addItem = (val) => {
        if (!val) return;
        list.push(val);
    };

    const element = div({ class: "startup-cheats-editor" }, () => {
        // Accessing length triggers reactivity when items are added/removed
        if (list.length === 0) {
            return EmptyState({
                icon: Icons.Lightning(),
                title: "NO STARTUP CHEATS",
                subtitle: "Add cheats that will run automatically on injection",
            });
        }
        return ul(
            { class: "startup-cheats-list" },
            ...list.map((v, i) => {
                const parsed = parseStartupAction(v);

                if (parsed.needsParam) {
                    return li(
                        { class: "cheat-item-row startup-cheat-param-row" },
                        input({
                            type: "text",
                            class: "startup-cheat-input startup-cheat-command-input",
                            value: parsed.command,
                            onchange: (e) => (list[i] = buildStartupAction(e.target.value, parsed.value)),
                        }),
                        input({
                            type: "text",
                            class: "startup-cheat-input startup-cheat-value-input",
                            placeholder: "Value",
                            title: "This startup cheat requires a value",
                            value: parsed.value,
                            onchange: (e) => (list[i] = buildStartupAction(parsed.command, e.target.value)),
                        }),
                        button({ class: "remove-cheat-button", onclick: () => list.splice(i, 1) }, Icons.X())
                    );
                }

                return li(
                    { class: "cheat-item-row" },
                    input({
                        type: "text",
                        class: "startup-cheat-input",
                        value: parsed.command,
                        onchange: (e) => (list[i] = e.target.value),
                    }),
                    button({ class: "remove-cheat-button", onclick: () => list.splice(i, 1) }, Icons.X())
                );
            })
        );
    });

    return { element, addItem };
};

export const AddCheatSearchBar = (onAdd, onCancel, currentCheats = []) => {
    const searchTerm = van.state("");

    const handleAdd = (val) => {
        onAdd(val);
        searchTerm.val = "";
    };

    const searchInput = input({
        type: "text",
        class: "cheat-search-input",
        placeholder: "Search cheats",

        value: searchTerm,
        oninput: (e) => (searchTerm.val = e.target.value),
        onkeydown: (e) => {
            if (e.key === "Enter" && searchTerm.val) handleAdd(searchTerm.val);
            if (e.key === "Escape") onCancel();
        },
    });

    setTimeout(() => searchInput.focus(), 0);

    return div(
        { class: "add-cheat-search-bar" },

        searchInput,
        button({ class: "btn-secondary", onclick: onCancel }, "CANCEL"),
        (() => {
            const resultsContainer = ul({
                class: "cheat-search-results",
            });

            van.derive(() => {
                const term = searchTerm.val.toLowerCase().trim();
                const allCheats = store.data.cheats;
                resultsContainer.innerHTML = "";

                if (term.length < 2) {
                    resultsContainer.style.display = "none";
                    return;
                }

                const matches = allCheats
                    .filter((c) => {
                        const val = typeof c === "object" ? c.value : c;
                        if (currentCheats.includes(val)) return false;

                        const msg = typeof c === "object" ? c.message : c;
                        return val.toLowerCase().includes(term) || msg.toLowerCase().includes(term);
                    })
                    .slice(0, 10);

                if (matches.length === 0) {
                    resultsContainer.style.display = "none";
                    return;
                }

                resultsContainer.style.display = "block";

                matches.forEach((c) => {
                    const val = typeof c === "object" ? c.value : c;
                    const msg = typeof c === "object" ? c.message : c;
                    const paramHint = typeof c === "object" && c.needsParam === true ? " +VALUE" : "";
                    const item = li(
                        {
                            onmousedown: (e) => {
                                e.preventDefault();
                                handleAdd(val);
                            },
                        },
                        `${val}${paramHint} (${msg})`
                    );

                    resultsContainer.appendChild(item);
                });
            });
            return resultsContainer;
        })()
    );
};
