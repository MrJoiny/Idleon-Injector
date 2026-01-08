import van from '../../van-1.6.0.js';
import vanX from '../../van-x-0.6.3.js';
import store from '../../store.js';
import { Loader } from '../Loader.js';
import { EmptyState } from '../EmptyState.js';
import { SearchBar } from '../SearchBar.js';
import { Icons } from '../../icons.js';

const { div, input, button, span, details, summary } = van.tags;

// Quick Access section for Favorites and Recent cheats
const QuickAccessSection = () => {
    const getCheatByValue = (val) => {
        const allCheats = store.data.cheats;
        // Try exact match first
        const found = allCheats.find(c => {
            const cheatVal = typeof c === 'object' ? c.value : c;
            return cheatVal === val;
        });
        if (found) return found;

        // For parameterized commands, try matching the base command
        const baseParts = val.split(' ');
        if (baseParts.length > 1) {
            const baseCmd = baseParts.slice(0, -1).join(' ');
            const paramFound = allCheats.find(c => {
                const cheatVal = typeof c === 'object' ? c.value : c;
                return cheatVal === baseCmd;
            });
            if (paramFound) {
                // Return a modified version with the full action
                return {
                    message: `${typeof paramFound === 'object' ? paramFound.message : paramFound} (${baseParts[baseParts.length - 1]})`,
                    value: val
                };
            }
        }
        return null;
    };

    const QuickAccessBtn = (cheatValue, isFavorite = false) => {
        const cheat = getCheatByValue(cheatValue);
        if (!cheat) return null;

        const msg = typeof cheat === 'object' ? cheat.message : cheat;
        const val = typeof cheat === 'object' ? cheat.value : cheat;

        return div({ class: 'quick-access-item' },
            button({
                class: 'quick-access-btn',
                onclick: () => store.executeCheat(val, msg)
            }, val),
            isFavorite ? button({
                class: 'quick-access-remove',
                onclick: () => store.toggleFavorite(cheatValue)
            }, Icons.X()) : null
        );
    };

    return div({ class: 'quick-access-section' },
        // Favorites Group - always show header, content is reactive
        div({ class: 'quick-access-group' },
            div({ class: 'quick-access-header' }, '★ FAVORITES'),
            () => {
                const favorites = [...store.data.favoriteCheats];
                if (favorites.length === 0) {
                    return div({ class: 'quick-access-empty' }, 'No favorites yet');
                }
                return div({ class: 'quick-access-items' },
                    ...favorites.map(val => QuickAccessBtn(val, true))
                );
            }
        ),

        // Recent Group - always show header, content is reactive
        div({ class: 'quick-access-group' },
            div({ class: 'quick-access-header' }, '↻ RECENT'),
            () => {
                const recent = [...store.data.recentCheats];
                if (recent.length === 0) {
                    return div({ class: 'quick-access-empty' }, 'No recent cheats');
                }
                return div({ class: 'quick-access-items' },
                    ...recent.slice(0, 5).map(val => QuickAccessBtn(val, false))
                );
            }
        )
    );
};

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

    // Handle search input
    const handleSearch = (val) => {
        ui.filter = val;
        // Auto-expand if searching, otherwise collapse
        ui.shouldOpen = val.length > 0;
    };

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
            SearchBar({
                placeholder: 'SEARCH_COMMANDS...',
                onInput: handleSearch
            })
        ),

        // Quick Access Section (Favorites & Recent)
        QuickAccessSection(),

        // Content Area
        () => {
            if (store.app.isLoading && store.data.cheats.length === 0) {
                return Loader({ text: "INITIALIZING..." });
            }

            // Accessing derived.grouped triggers dependency tracking
            const groupedData = derived.grouped;
            const categories = Object.keys(groupedData);

            if (categories.length === 0) {
                return EmptyState({
                    icon: Icons.SearchX(),
                    title: 'NO CHEATS FOUND',
                    subtitle: ui.filter ? 'Try a different search term' : 'Cheats list is empty'
                });
            }

            // Grid Layout
            return div({ id: 'cheat-buttons', class: 'grid-layout' },
                categories.map(cat => {
                    return details({
                        class: 'cheat-category',
                        open: ui.shouldOpen  // Only auto-open during search
                    },
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
    const needsValue = van.derive(() => {
        const list = store.data.needsConfirmation;
        const val = cheat.value;
        return list.some(cmd => val === cmd || val.startsWith(cmd + ' '));
    });

    // Local state for the input
    const inputValue = van.state("");

    // Local state for feedback animation
    const feedbackState = van.state(null); // 'success' | 'error' | null

    const handleExecute = async () => {
        let finalAction = cheat.value;
        if (needsValue.val) {
            if (!inputValue.val.trim()) {
                store.notify(`Value required for '${cheat.message}'`, 'error');
                feedbackState.val = 'error';
                setTimeout(() => feedbackState.val = null, 1000);
                return;
            }
            finalAction = `${cheat.value} ${inputValue.val.trim()}`;
        }

        try {
            await store.executeCheat(finalAction, cheat.message);
            feedbackState.val = 'success';
        } catch {
            feedbackState.val = 'error';
        }
        setTimeout(() => feedbackState.val = null, 1000);
    };

    const handleFavorite = () => {
        // For cheats that need a value, include the current input value
        if (needsValue.val) {
            if (!inputValue.val.trim()) {
                store.notify(`Enter a value first to favorite '${cheat.message}'`, 'error');
                return;
            }
            // Store the full command with parameter
            const fullCommand = `${cheat.value} ${inputValue.val.trim()}`;
            store.toggleFavorite(fullCommand);
        } else {
            store.toggleFavorite(cheat.value);
        }
    };

    // Check if this cheat (or any variant with param) is favorited
    const isFavorited = () => {
        if (needsValue.val) {
            // For param cheats, check if the current value combo is favorited
            if (!inputValue.val.trim()) return false;
            const fullCommand = `${cheat.value} ${inputValue.val.trim()}`;
            return store.isFavorite(fullCommand);
        }
        return store.isFavorite(cheat.value);
    };

    return div({ class: 'cheat-item-container' },
        button({
            class: () => `cheat-button ${feedbackState.val === 'success' ? 'feedback-success' : ''} ${feedbackState.val === 'error' ? 'feedback-error' : ''}`,
            onclick: handleExecute
        }, cheat.message),
        () => needsValue.val ? input({
            type: 'text',
            class: 'cheat-input',
            placeholder: 'Val',
            oninput: e => inputValue.val = e.target.value
        }) : null,
        button({
            class: () => `favorite-btn ${isFavorited() ? 'is-favorite' : ''}`,
            onclick: (e) => {
                e.stopPropagation();
                handleFavorite();
            }
        }, Icons.Star())
    );
};
