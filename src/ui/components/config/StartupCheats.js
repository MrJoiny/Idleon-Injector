import van from "../../van-1.6.0.js";
import vanX from "../../van-x-0.6.3.js";
import store from "../../store.js";
import { EmptyState } from "../EmptyState.js";
import { Icons } from "../../icons.js";

const { div, ul, li, input, button, span } = van.tags;

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
            ...list.map((v, i) =>
                li(
                    { class: "cheat-item-row" },
                    input({
                        type: "text",
                        class: "startup-cheat-input",
                        value: v,
                        onchange: (e) => (list[i] = e.target.value),
                    }),
                    button({ class: "remove-cheat-button", onclick: () => list.splice(i, 1) }, Icons.X())
                )
            )
        );
    });

    return { element, addItem };
};

export const AddCheatSearchBar = (onAdd, onCancel) => {
    const searchTerm = van.state("");

    const handleAdd = (val) => {
        onAdd(val);
        searchTerm.val = "";
    };

    const searchInput = input({
        type: "text",
        class: "cheat-search-input",
        placeholder: "Search cheats...",

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
                    const item = li(
                        {
                            onmousedown: (e) => {
                                e.preventDefault();
                                handleAdd(val);
                            },
                        },
                        `${msg} (${val})`
                    );

                    resultsContainer.appendChild(item);
                });
            });
            return resultsContainer;
        })()
    );
};
