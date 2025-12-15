import van from '../../van-1.6.0.js';
import store from '../../store.js';
import { Loader } from '../Loader.js';
import { ConfigNode } from '../config/ConfigNode.js';
import { StartupCheats, AddCheatSearchBar } from '../config/StartupCheats.js';

const { div, button, select, option, label } = van.tags;

export const Config = () => {
    const activeSubTab = van.state('cheatconfig');
    const categoryFilter = van.state('all');
    const draftConfig = van.state(null);
    const isAddingCheat = van.state(false);

    // Track if we've already initialized
    let initialized = false;

    // Reference to the addItem function from StartupCheats
    let addCheatFn = null;

    if (!store.config.val) store.loadConfig();

    // Only initialize draftConfig ONCE when config first loads
    van.derive(() => {
        if (store.config.val && !initialized) {
            initialized = true;
            draftConfig.val = JSON.parse(JSON.stringify(store.config.val));
        }
    });

    const handleStartupUpdate = (newList) => {
        draftConfig.val.startupCheats = newList;
    };

    const save = (isPersistent) => {
        const toSave = { ...draftConfig.val };
        delete toSave.defaultConfig;
        store.saveConfig(toSave, isPersistent);
    };

    const handleAddCheat = (val) => {
        if (addCheatFn) {
            addCheatFn(val);
            isAddingCheat.val = false;
        }
    };

    return div({ id: 'config-tab', class: 'tab-pane config-layout' },

        // Scrollable content area
        () => {
            if (store.isLoading.val || !draftConfig.val) return Loader({ text: "LOADING CONFIG..." });

            const config = draftConfig.val;
            const tab = activeSubTab.val;

            // Get StartupCheats component and capture addItem function
            const startupCheatsResult = StartupCheats(config.startupCheats, handleStartupUpdate);
            addCheatFn = startupCheatsResult.addItem;

            return div({ id: 'config-sub-tab-content', class: 'scroll-container' },

                // Sub-Navigation (sticky within scroll container)
                div({ class: 'sub-nav' },
                    ['Cheat Config', 'Startup', 'Injector'].map(name => {
                        let id = name.toLowerCase().replace(' ', '');
                        if (name === 'Startup') id += 'cheats';
                        if (name === 'Injector') id += 'config';

                        return button({
                            class: () => `config-sub-tab-button ${activeSubTab.val === id ? 'active' : ''}`,
                            onclick: () => { activeSubTab.val = id; isAddingCheat.val = false; }
                        }, name.toUpperCase());
                    })
                ),

                // Pane 1: Cheat Config
                div({ class: () => `config-sub-tab-pane ${tab === 'cheatconfig' ? 'active' : ''}` },
                    div({ class: 'panel-section mb-20' },
                        label({ style: 'font-size:0.75rem; color:var(--c-text-dim);' }, "CATEGORY FILTER"),
                        select({ onchange: e => categoryFilter.val = e.target.value },
                            option({ value: 'all' }, "ALL SECTORS"),
                            Object.keys(config.cheatConfig || {}).sort().map(k =>
                                option({ value: k }, k.toUpperCase())
                            )
                        )
                    ),
                    div({ id: 'cheatconfig-options' },
                        () => {
                            const root = config.cheatConfig || {};
                            const filter = categoryFilter.val;
                            const data = filter === 'all' ? root : { [filter]: root[filter] };

                            return div(ConfigNode({
                                data,
                                path: "cheatConfig",
                                fullDraft: config
                            }));
                        }
                    )
                ),

                // Pane 2: Startup
                div({ class: () => `config-sub-tab-pane ${tab === 'startupcheats' ? 'active' : ''}` },
                    startupCheatsResult.element
                ),

                // Pane 3: Injector
                div({ class: () => `config-sub-tab-pane ${tab === 'injectorconfig' ? 'active' : ''}` },
                    div({ class: 'warning-banner mb-20' },
                        "⚠ RESTART REQUIRED FOR CHANGES TO APPLY"
                    ),
                    div(ConfigNode({
                        data: config.injectorConfig || {},
                        path: "injectorConfig",
                        fullDraft: config
                    }))
                )
            );
        },

        // Action Bar
        div({ class: 'action-bar' },
            // + ADD CHEAT button (visible only on Startup tab when not adding)
            button({
                class: 'add-cheat-button',
                style: () => (activeSubTab.val === 'startupcheats' && !isAddingCheat.val) ? '' : 'display:none',
                onclick: () => isAddingCheat.val = true
            }, "+ ADD CHEAT"),

            // Search bar container (visible only on Startup tab when adding)
            div({
                class: 'add-cheat-search-container',
                style: () => (activeSubTab.val === 'startupcheats' && isAddingCheat.val) ? 'display:flex; flex:1; position:relative;' : 'display:none'
            },
                () => isAddingCheat.val ? AddCheatSearchBar(handleAddCheat, () => isAddingCheat.val = false) : div()
            ),

            div({ class: 'spacer', style: () => (activeSubTab.val === 'startupcheats' && isAddingCheat.val) ? 'display:none' : 'flex:1' }),
            button({ id: 'update-config-button', class: 'btn-secondary', onclick: () => save(false) }, "APPLY (RAM)"),
            button({ id: 'save-config-button', class: 'btn-primary', onclick: () => save(true) }, "SAVE (DISK)")
        )
    );
};
