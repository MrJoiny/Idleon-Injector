import van from '../van-1.6.0.js';
import store from '../store.js';
import { VIEWS } from '../constants.js';

// Components
import { Sidebar } from './Sidebar.js';
import { Toast } from './Toast.js';
import { Cheats } from './views/Cheats.js';
import { Config } from './views/Config.js';
import { Account } from './views/Account.js';
import { DevTools } from './views/DevTools.js';

const { div, main, header, h2 } = van.tags;

// Map view IDs to their component factories
const viewFactories = {
    [VIEWS.CHEATS.id]: Cheats,
    [VIEWS.CONFIG.id]: Config,
    [VIEWS.ACCOUNT.id]: Account,
    [VIEWS.DEVTOOLS.id]: DevTools
};

// Map view IDs to their labels for the header
const viewLabels = Object.values(VIEWS).reduce((acc, v) => {
    acc[v.id] = v.label;
    return acc;
}, {});

export const App = () => {
    store.initHeartbeat();

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
                h2({ id: 'active-view-title' }, () => viewLabels[store.activeTab.val] || 'MODULE')
            ),
            // Render the container which holds the views
            tabContent
        ),
        Toast()
    );
};
