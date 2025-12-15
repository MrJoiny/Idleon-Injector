import van from '../../van-1.6.0.js';
import store from '../../store.js';
import { Loader } from '../Loader.js';
import { debounce } from '../../utils.js';

const { div, input, button, span, details, summary } = van.tags;

export const Cheats = () => {
    // Local UI State
    const filterText = van.state("");
    const shouldOpen = van.state(false); // Categories closed by default

    // Load Data on Mount (if empty)
    if (store.cheats.val.length === 0) {
        store.loadCheats();
    }

    // Optimized Search Handler
    const handleInput = debounce((e) => {
        const val = e.target.value.trim();
        filterText.val = val;
        // Auto-expand categories if searching, collapse if empty
        shouldOpen.val = val.length > 0;
    }, 300); // Wait 300ms before rerendering

    // Helper: Grouping Logic
    const groupCheats = (list, filter) => {
        const groups = {};
        const term = filter.toLowerCase();

        // Helper: does cheat match?
        const matches = (c) => {
            if (!term) return true;
            const msg = (typeof c === 'object' ? c.message : c).toLowerCase();
            const val = (typeof c === 'object' ? c.value : c).toLowerCase();
            return msg.includes(term) || val.includes(term);
        };

        list.forEach(cheat => {
            if (!matches(cheat)) return;

            const val = typeof cheat === 'object' ? cheat.value : cheat;
            const msg = typeof cheat === 'object' ? cheat.message : cheat;
            if (!val) return;

            const parts = val.split(' ');
            let category = (parts.length > 1) ? parts[0] : 'General';
            category = category.charAt(0).toUpperCase() + category.slice(1);

            if (!groups[category]) groups[category] = [];
            groups[category].push({ message: msg, value: val, baseCommand: parts[0] });
        });

        // Sort Categories
        return Object.keys(groups).sort().reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {});
    };

    // Render
    return div({ id: 'cheats-tab', class: 'tab-pane active' },

        // Control Bar
        div({ class: 'control-bar' },
            div({ class: 'search-wrapper' },
                span({ class: 'search-icon' }, "ᐳ"),
                input({
                    type: 'text',
                    placeholder: 'SEARCH_COMMANDS...',
                    oninput: handleInput // Debounced
                })
            )
        ),

        // Content
        () => {
            if (store.isLoading.val && store.cheats.val.length === 0) {
                return Loader({ text: "INITIALIZING..." });
            }

            // This calculation now only happens once every 300ms
            const grouped = groupCheats(store.cheats.val, filterText.val);
            const categories = Object.keys(grouped);

            if (categories.length === 0) {
                return div({ style: 'padding: 20px; color: var(--c-text-dim);' }, "NO CHEATS FOUND.");
            }

            return div({ id: 'cheat-buttons', class: 'grid-layout' },
                categories.map(cat => {
                    // We explicitly bind 'open' to the state
                    // Note: We use a function () => ... for the open attribute to make it reactive
                    return details({ class: 'cheat-category', open: () => shouldOpen.val },
                        summary(cat),
                        div({ class: 'cheat-category-content' },
                            grouped[cat].map(cheat => CheatItem(cheat))
                        )
                    );
                })
            );
        }
    );
};

// Sub-component (unchanged logic, just re-declaring for completeness)
const CheatItem = (cheat) => {
    const needsValue = store.needsConfirmation.val.includes(cheat.baseCommand);
    const inputValue = van.state("");

    const handleExecute = () => {
        let finalAction = cheat.value;
        if (needsValue) {
            if (!inputValue.val.trim()) {
                store.notify(`Value required for '${cheat.message}'`, 'error');
                return;
            }
            finalAction = `${cheat.value} ${inputValue.val.trim()}`;
        }
        store.executeCheat(finalAction, cheat.message);
    };

    return div({ class: 'cheat-item-container' },
        needsValue ? input({
            type: 'text',
            class: 'cheat-input',
            placeholder: 'Val',
            oninput: e => inputValue.val = e.target.value
        }) : null,
        button({ class: 'cheat-button', onclick: handleExecute }, cheat.message)
    );
};