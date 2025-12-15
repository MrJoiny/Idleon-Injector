import van from '../../van-1.6.0.js';
import store from '../../store.js';

const { div, ul, li, input, button } = van.tags;

export const StartupCheats = (draftConfig, onUpdate) => {
    if (store.cheats.val.length === 0) store.loadCheats();

    const list = van.state([...(draftConfig || [])]);

    const removeItem = (index) => {
        const newList = [...list.val];
        newList.splice(index, 1);
        list.val = newList;
        onUpdate(newList);
    };

    const addItem = (val) => {
        if (!val) return;
        const newList = [...list.val, val];
        list.val = newList;
        onUpdate(newList);
    };

    return div({ class: 'startup-cheats-editor' },
        () => ul({ class: 'startup-cheats-list' },
            list.val.map((cmd, index) =>
                li({ class: 'cheat-item-row' },
                    input({
                        type: 'text',
                        class: 'startup-cheat-input',
                        value: cmd,
                        onchange: e => {
                            const l = [...list.val];
                            l[index] = e.target.value;
                            list.val = l;
                            onUpdate(l);
                        }
                    }),
                    button({
                        class: 'remove-cheat-button',
                        onclick: () => removeItem(index)
                    }, "✕")
                )
            )
        ),
        AddCheatUI(addItem)
    );
};

const AddCheatUI = (onAdd) => {
    const isSearching = van.state(false);
    const searchTerm = van.state("");

    const handleAdd = (val) => {
        onAdd(val);
        isSearching.val = false;
        searchTerm.val = "";
    };

    return div({ class: 'add-cheat-area', style: 'position: relative;' },
        () => !isSearching.val
            ? button({ class: 'add-cheat-button', onclick: () => isSearching.val = true }, "+ Add Cheat")
            : div({ style: 'display:flex; gap:5px; width:100%; align-items: center;' },
                input({
                    type: 'text',
                    class: 'cheat-search-input',
                    placeholder: 'Search cheats...',
                    autoFocus: true,
                    value: searchTerm,
                    oninput: e => searchTerm.val = e.target.value,
                    onkeydown: e => {
                        if (e.key === 'Enter' && searchTerm.val) handleAdd(searchTerm.val);
                    }
                }),
                button({ class: 'cancel-add-cheat-button', onclick: () => isSearching.val = false }, "Cancel"),

                // Final Styling: Matches theme variables
                () => {
                    const term = searchTerm.val.toLowerCase().trim();
                    const allCheats = store.cheats.val;

                    const matches = (term.length >= 2)
                        ? allCheats.filter(c => {
                            const val = typeof c === 'object' ? c.value : c;
                            const msg = typeof c === 'object' ? c.message : c;
                            return (val.toLowerCase().includes(term) || msg.toLowerCase().includes(term));
                        }).slice(0, 10)
                        : [];

                    const show = matches.length > 0;

                    return ul({
                        class: 'cheat-search-results',
                        style: () => `
                            display: ${show ? 'block' : 'none'}; 
                            position: absolute; 
                            bottom: 100%; 
                            left: 0; 
                            width: 100%; 
                            z-index: 1000; 
                            background: var(--c-panel); 
                            border: 1px solid var(--c-accent); 
                            box-shadow: 0 -5px 20px rgba(0,0,0,0.5); 
                            max-height: 200px; 
                            overflow-y: auto; 
                            list-style: none; 
                            padding: 0; 
                            margin-bottom: 5px;
                        `
                    },
                        matches.map(c => {
                            const val = typeof c === 'object' ? c.value : c;
                            const msg = typeof c === 'object' ? c.message : c;
                            return li({
                                onmousedown: (e) => {
                                    e.preventDefault();
                                    handleAdd(val);
                                },
                                // Using class from style.css might not work if not defined for li inside search-results, 
                                // so we keep safe inline styles + the click hover effect logic if CSS covers it
                                style: 'cursor:pointer; padding:10px; border-bottom:1px solid var(--c-border); color: var(--c-text-main);'
                            }, `${msg} (${val})`);
                        })
                    );
                }
            )
    );
};