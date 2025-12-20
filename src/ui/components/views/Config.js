import van from '../../van-1.6.0.js';
import vanX from '../../van-x-0.6.3.js';
import store from '../../store.js';
import { Loader } from '../Loader.js';
import { ConfigNode } from '../config/ConfigNode.js';
import { StartupCheats, AddCheatSearchBar } from '../config/StartupCheats.js';

const { div, button, select, option, label } = van.tags;

export const Config = () => {
    // Local Reactive UI State (NOT using vanX.reactive for these simple states)
    const activeSubTab = van.state('cheatconfig');
    const categoryFilter = van.state('all');
    const isAddingCheat = van.state(false);
    const draftReady = van.state(false);

    // Draft will be a vanX.reactive object, but we store it in a regular variable
    // to avoid the reactivity cascade issue
    let draft = null;
    let addCheatFn = null;

    // Trigger load if missing
    if (!store.app.config) store.loadConfig();

    // One-time sync: When config loads, create draft and mark ready
    van.derive(() => {
        if (store.app.config && !draft) {
            // Deep clone to create a detached draft, then make it reactive
            draft = vanX.reactive(JSON.parse(JSON.stringify(store.app.config)));
            draftReady.val = true;
        }
    });

    const save = (isPersistent) => {
        if (!draft) return;

        // Unwrap proxy using JSON serialization to be safe
        const toSave = JSON.parse(JSON.stringify(draft));
        delete toSave.defaultConfig; // Don't save defaults back to file

        store.saveConfig(toSave, isPersistent);
    };

    const handleAddCheat = (val) => {
        if (addCheatFn) {
            addCheatFn(val);
            isAddingCheat.val = false;
        }
    };

    // Build the content ONCE after draft is ready, not on every reactive update
    const buildContent = () => {
        const config = draft;

        // StartupCheats now takes the reactive array directly - created ONCE
        const startupCheatsResult = StartupCheats(config.startupCheats);
        addCheatFn = startupCheatsResult.addItem;

        // Build ConfigNode components ONCE for each config section
        const root = config.cheatConfig || {};
        const rootTemplate = store.app.config.cheatConfig || {};

        // Build ConfigNode components ONCE for each config section
        const cheatConfigNode = div({ id: 'cheatconfig-options' },
            // This reactive function only depends on categoryFilter, not on input values
            () => {
                const filter = categoryFilter.val;
                const data = filter === 'all' ? root : { [filter]: root[filter] };
                const template = filter === 'all' ? rootTemplate : { [filter]: rootTemplate[filter] };

                return div(ConfigNode({
                    data,
                    path: "cheatConfig",
                    template
                }));
            }
        );

        const injectorConfigNode = div(ConfigNode({
            data: config.injectorConfig || {},
            path: "injectorConfig",
            template: store.app.config.injectorConfig || {}
        }));

        return div({ id: 'config-sub-tab-content', class: 'scroll-container' },

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

            // Cheat Config sub-tab - use CSS display for toggling, not re-render
            div({
                class: 'config-sub-tab-pane',
                style: () => activeSubTab.val === 'cheatconfig' ? 'display:block' : 'display:none'
            },
                div({ class: 'panel-section mb-20' },
                    label({ style: 'font-size:0.75rem; color:var(--c-text-dim);' }, "CATEGORY FILTER"),
                    select({
                        value: categoryFilter,
                        onchange: e => categoryFilter.val = e.target.value
                    },
                        option({ value: 'all' }, "ALL SECTORS"),
                        Object.keys(config.cheatConfig || {}).sort().map(k =>
                            option({ value: k }, k.toUpperCase())
                        )
                    )
                ),
                cheatConfigNode
            ),

            // Startup Cheats sub-tab
            div({
                class: 'config-sub-tab-pane',
                style: () => activeSubTab.val === 'startupcheats' ? 'display:block' : 'display:none'
            },
                startupCheatsResult.element
            ),

            // Injector Config sub-tab
            div({
                class: 'config-sub-tab-pane',
                style: () => activeSubTab.val === 'injectorconfig' ? 'display:block' : 'display:none'
            },
                div({ class: 'warning-banner mb-20' },
                    "⚠ RESTART REQUIRED FOR CHANGES TO APPLY"
                ),
                injectorConfigNode
            )
        );
    };

    return div({ id: 'config-tab', class: 'tab-pane config-layout' },

        // Main content area - only renders Loader OR content, but content is built ONCE
        () => {
            if (store.app.isLoading || !draftReady.val) {
                return Loader({ text: "LOADING CONFIG..." });
            }
            // Content is built once and returned
            return buildContent();
        },

        div({ class: 'action-bar' },
            button({
                class: 'add-cheat-button',
                style: () => (activeSubTab.val === 'startupcheats' && !isAddingCheat.val) ? '' : 'display:none',
                onclick: () => isAddingCheat.val = true
            }, "+ ADD CHEAT"),

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