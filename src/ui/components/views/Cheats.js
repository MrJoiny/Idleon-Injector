import van from '../../van-1.6.0.js';
import vanX from '../../van-x-0.6.3.js';
import store from '../../store.js';
import { Loader } from '../Loader.js';
import { debounce } from '../../utils.js';

const { div, input, button, span, details, summary } = van.tags;

export const Cheats = () => {
    // Local Reactive UI State
    const ui = vanX.reactive({
        filter: '',
        shouldOpen: false
    });

    // Initial Load
    if (store.data.cheats.length === 0) {
        store.loadCheats();
    }

    // Debounce Input
    const handleInput = debounce((e) => {
        const val = e.target.value.trim();
        ui.filter = val;
        // Auto-expand if searching, otherwise collapse
        ui.shouldOpen = val.length > 0;
    }, 300);

    // Derived State: Grouped Cheats
    // vanX.calc creates a readonly reactive object derived from other states
    // When store.data.cheats OR ui.filter changes, this re-runs.
    const derived = vanX.reactive({
        grouped: vanX.calc(() => {
            const list = store.data.cheats;
            const term = ui.filter.toLowerCase();
            // Pass 1: Identify all available categories from multi-part commands
            const categoriesSet = new Set();
            for (let i = 0; i < list.length; i++) {
                const val = typeof list[i] === 'object' ? list[i].value : list[i];
                if (!val) continue;
                const parts = val.trim().split(' ');
                if (parts.length > 1) {
                    categoriesSet.add(parts[0].toLowerCase());
                }
            }

            const groups = {};

            const matches = (c) => {
                if (!term) return true;
                const msg = (typeof c === 'object' ? c.message : c).toLowerCase();
                const val = (typeof c === 'object' ? c.value : c).toLowerCase();
                return msg.includes(term) || val.includes(term);
            };

            // Pass 2: Grouping
            for (let i = 0; i < list.length; i++) {
                const cheat = list[i];
                if (!matches(cheat)) continue;

                const val = typeof cheat === 'object' ? cheat.value : cheat;
                const msg = typeof cheat === 'object' ? cheat.message : cheat;
                if (!val) continue;

                const parts = val.trim().split(' ');
                const firstWordRaw = parts[0];
                const firstWordLower = firstWordRaw.toLowerCase();

                let category;
                // If it's multi-part, or if the single word is a known category name
                if (parts.length > 1 || categoriesSet.has(firstWordLower)) {
                    category = firstWordLower.charAt(0).toUpperCase() + firstWordLower.slice(1);
                } else {
                    category = 'General';
                }

                if (!groups[category]) groups[category] = [];
                groups[category].push({ message: msg, value: val, baseCommand: firstWordRaw });
            }

            // Sort keys
            return Object.keys(groups).sort().reduce((acc, key) => {
                acc[key] = groups[key];
                return acc;
            }, {});
        })
    });

    return div({ id: 'cheats-tab', class: 'tab-pane' },

        div({ class: 'control-bar' },
            div({ class: 'search-wrapper' },
                span({ class: 'search-icon' }, "ᐳ"),
                input({
                    type: 'text',
                    placeholder: 'SEARCH_COMMANDS...',
                    oninput: handleInput
                })
            )
        ),

        // Content Area
        () => {
            if (store.app.isLoading && store.data.cheats.length === 0) {
                return Loader({ text: "INITIALIZING..." });
            }

            // Accessing derived.grouped triggers dependency tracking
            const groupedData = derived.grouped;
            const categories = Object.keys(groupedData);

            if (categories.length === 0) {
                return div({ style: 'padding: 20px; color: var(--c-text-dim);' }, "NO CHEATS FOUND.");
            }

            // Grid Layout
            return div({ id: 'cheat-buttons', class: 'grid-layout' },
                categories.map(cat => {
                    return details({ class: 'cheat-category', open: () => ui.shouldOpen },
                        summary(cat),
                        div({ class: 'cheat-category-content' },
                            // Note: We are mapping standard arrays here because the 'grouped' object
                            // is regenerated entirely on filter. vanX.list is not necessary
                            // for the leaf nodes if the parent container is replaced anyway.
                            groupedData[cat].map(cheat => CheatItem(cheat))
                        )
                    );
                })
            );
        }
    );
};

const CheatItem = (cheat) => {
    // Check global confirmation list (Reactive access)
    // We use a derived check to ensure reactivity if the list updates
    const needsValue = van.derive(() => store.data.needsConfirmation.includes(cheat.baseCommand));

    // Local state for the input
    const inputValue = van.state("");

    const handleExecute = () => {
        let finalAction = cheat.value;
        if (needsValue.val) {
            if (!inputValue.val.trim()) {
                store.notify(`Value required for '${cheat.message}'`, 'error');
                return;
            }
            finalAction = `${cheat.value} ${inputValue.val.trim()}`;
        }
        store.executeCheat(finalAction, cheat.message);
    };

    return div({ class: 'cheat-item-container' },
        button({ class: 'cheat-button', onclick: handleExecute }, cheat.message),
        () => needsValue.val ? input({
            type: 'text',
            class: 'cheat-input',
            placeholder: 'Val',
            oninput: e => inputValue.val = e.target.value
        }) : null,
    );
};