import van from '../van-1.6.0.js';
import store from '../store.js';

// Components
import { Sidebar } from './Sidebar.js';
import { Toast } from './Toast.js';
import { Cheats } from './views/Cheats.js';
import { Config } from './views/Config.js';
import { Account } from './views/Account.js';
import { DevTools } from './views/DevTools.js';

const { div, main, header, h2 } = van.tags;

export const App = () => {
    store.initHeartbeat();

    // Define view factories
    const viewFactories = {
        'cheats-tab': Cheats,
        'config-tab': Config,
        'options-account-tab': Account,
        'devtools-tab': DevTools
    };

    // Cache for instantiated views
    const viewInstances = {};

    // Container for views
    const tabContent = div({ id: 'tab-content' });

    // Reactively toggle the 'active' class on the DOM nodes and lazy load
    // The CSS rules for .tab-pane (display:none) and .tab-pane.active (display:block) handle visibility
    van.derive(() => {
        const activeId = store.activeTab.val;

        // Lazy load the view if not present
        if (!viewInstances[activeId] && viewFactories[activeId]) {
            const instance = viewFactories[activeId]();
            viewInstances[activeId] = instance;
            van.add(tabContent, instance);
        }

        Object.entries(viewInstances).forEach(([id, domNode]) => {
            if (id === activeId) {
                domNode.classList.add('active');
            } else {
                domNode.classList.remove('active');
            }
        });
    });

    return div({ class: 'app-layout' },
        Sidebar(),
        main({ class: 'viewport' },
            header({ class: 'viewport-header' },
                h2({ id: 'active-view-title' }, () => {
                    const tab = store.activeTab.val;
                    if (tab === 'cheats-tab') return "CHEATS";
                    if (tab === 'config-tab') return "CONFIGURATION";
                    if (tab === 'options-account-tab') return "ACCOUNT OPTIONS LIST";
                    if (tab === 'devtools-tab') return "CHROMEDEBUG";
                    return "MODULE";
                })
            ),
            // Render the container which holds the views
            tabContent
        ),
        Toast()
    );
};