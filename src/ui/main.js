import { initCheats } from './ui-cheats.js';
import { initConfig } from './ui-config.js';
import { initDevTools } from './ui-devtools.js';
import { setupTabs } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {

    // 1. Main Tabs
    setupTabs({
        triggerSelector: '.tab-button',
        contentSelector: '.tab-pane',
        datasetProperty: 'tab', // reads data-tab="..."
        onTabChange: (targetId) => {
            // Lazy Load Logic
            if (targetId === 'config-tab') initConfig();
            if (targetId === 'devtools-tab') initDevTools();
        }
    });

    // 2. Config Sub-Tabs
    setupTabs({
        triggerSelector: '.config-sub-tab-button',
        contentSelector: '.config-sub-tab-pane',
        datasetProperty: 'subTab' // reads data-sub-tab="..."
    });

    // Initial Load
    initCheats();
});