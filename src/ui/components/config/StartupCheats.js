import van from '../../van-1.6.0.js';
import vanX from '../../van-x-0.6.3.js';
import store from '../../store.js';

const { div, ul, li, input, button } = van.tags;

export const StartupCheats = (list) => {
    if (store.data.cheats.length === 0) store.loadCheats();

    const addItem = (val) => {
        if (!val) return;
        list.push(val);
    };

    const element = div({ class: 'startup-cheats-editor' },
        vanX.list(ul({ class: 'startup-cheats-list' }), list, (v, deleter, index) => {
            return li({ class: 'cheat-item-row' },
                input({
                    type: 'text',
                    class: 'startup-cheat-input',
                    value: () => v.val,
                    onchange: e => v.val = e.target.value
                }),
                button({
                    class: 'remove-cheat-button',
                    onclick: () => list.splice(index, 1)
                }, "✕")
            );
        })
    );

    return { element, addItem };
};

export const AddCheatSearchBar = (onAdd, onCancel) => {
    const searchTerm = van.state("");

    const handleAdd = (val) => {
        onAdd(val);
        searchTerm.val = "";
    };

    const searchInput = input({
        type: 'text',
        class: 'cheat-search-input',
        placeholder: 'Search cheats...',
        style: 'flex:1;',
        value: searchTerm,
        oninput: e => searchTerm.val = e.target.value,
        onkeydown: e => {
            if (e.key === 'Enter' && searchTerm.val) handleAdd(searchTerm.val);
            if (e.key === 'Escape') onCancel();
        }
    });

    setTimeout(() => searchInput.focus(), 0);

    return div({ class: 'add-cheat-search-bar', style: 'position:relative; display:flex; gap:10px; flex:1; align-items:center;' },
        searchInput,
        button({ class: 'btn-secondary', onclick: onCancel }, "CANCEL"),
        (() => {
            const resultsContainer = ul({
                class: 'cheat-search-results',
                style: 'display:none; position:absolute; bottom:100%; left:0; width:100%; z-index:1000; background:var(--c-panel); border:1px solid var(--c-accent); box-shadow:0 -5px 20px rgba(0,0,0,0.5); max-height:200px; overflow-y:auto; list-style:none; padding:0; margin-bottom:5px;'
            });

            van.derive(() => {
                const term = searchTerm.val.toLowerCase().trim();
                const allCheats = store.data.cheats;
                resultsContainer.innerHTML = '';

                if (term.length < 2) {
                    resultsContainer.style.display = 'none';
                    return;
                }

                const matches = allCheats.filter(c => {
                    const val = typeof c === 'object' ? c.value : c;
                    const msg = typeof c === 'object' ? c.message : c;
                    return (val.toLowerCase().includes(term) || msg.toLowerCase().includes(term));
                }).slice(0, 10);

                if (matches.length === 0) {
                    resultsContainer.style.display = 'none';
                    return;
                }

                resultsContainer.style.display = 'block';

                matches.forEach(c => {
                    const val = typeof c === 'object' ? c.value : c;
                    const msg = typeof c === 'object' ? c.message : c;
                    const item = li({
                        onmousedown: (e) => {
                            e.preventDefault();
                            handleAdd(val);
                        },
                        style: 'cursor:pointer; padding:10px; border-bottom:1px solid var(--c-border); color:var(--c-text-main);'
                    }, `${msg} (${val})`);
                    resultsContainer.appendChild(item);
                });
            });
            return resultsContainer;
        })()
    );
};