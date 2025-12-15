import van from '../../van-1.6.0.js';
import store from '../../store.js';
import { Loader } from '../Loader.js';
import { ConfigNode } from '../config/ConfigNode.js';
import { StartupCheats } from '../config/StartupCheats.js';

const { div, button, select, option, label } = van.tags;

export const Config = () => {
    const activeSubTab = van.state('cheatconfig');
    const categoryFilter = van.state('all');
    const draftConfig = van.state(null);

    if (!store.config.val) store.loadConfig();

    van.derive(() => {
        if (store.config.val && !draftConfig.val) {
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

    return div({ id: 'config-tab', class: 'tab-pane active' },

        // Sub-Navigation
        div({ class: 'sub-nav' },
            ['Cheat Config', 'Startup', 'Injector'].map(name => {
                // FIXED LOGIC:
                let id = name.toLowerCase().replace(' ', '');
                if (name === 'Startup') id += 'cheats';
                if (name === 'Injector') id += 'config'; // Added this line

                return button({
                    class: () => `config-sub-tab-button ${activeSubTab.val === id ? 'active' : ''}`,
                    onclick: () => activeSubTab.val = id
                }, name.toUpperCase());
            })
        ),

        // Content
        () => {
            if (store.isLoading.val || !draftConfig.val) return Loader({ text: "LOADING CONFIG..." });

            const config = draftConfig.val;
            const tab = activeSubTab.val;

            return div({ id: 'config-sub-tab-content', class: 'scroll-container' },

                // Pane 1: Cheat Config
                div({ class: () => `config-sub-tab-pane ${tab === 'cheatconfig' ? 'active' : ''}` },
                    div({ class: 'panel-section', style: 'margin-bottom: 20px;' },
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
                    StartupCheats(config.startupCheats, handleStartupUpdate)
                ),

                // Pane 3: Injector
                div({ class: () => `config-sub-tab-pane ${tab === 'injectorconfig' ? 'active' : ''}` },
                    div({ class: 'warning-banner', style: 'margin-bottom:20px; color:var(--c-warning); border:1px solid var(--c-warning); padding:10px; background:rgba(255,183,0,0.1); font-size:0.8rem;' },
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

        div({ class: 'action-bar' },
            button({ id: 'update-config-button', class: 'btn-secondary', onclick: () => save(false) }, "APPLY (RAM)"),
            button({ id: 'save-config-button', class: 'btn-primary', onclick: () => save(true) }, "SAVE (DISK)")
        )
    );
};