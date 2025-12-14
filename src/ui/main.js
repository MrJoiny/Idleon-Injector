import { initCheats } from './ui-cheats.js';
import { initConfig } from './ui-config.js';
import { initDevTools } from './ui-devtools.js';
import { setupTabs } from './utils.js';

import { checkHeartbeat } from './api.js';

document.addEventListener('DOMContentLoaded', () => {

    // Heartbeat Logic
    const initHeartbeat = () => {
        const dot = document.querySelector('.status-dot');
        const text = document.getElementById('system-status-text');

        const updateStatus = async () => {
            const alive = await checkHeartbeat();
            if (alive) {
                dot.style.background = 'var(--c-success)';
                dot.style.boxShadow = '0 0 6px var(--c-success)';
                text.textContent = 'SYSTEM ONLINE';
                text.style.color = 'var(--c-success)';
                dot.style.animation = 'pulse 2s infinite';
            } else {
                dot.style.background = 'var(--c-danger)';
                dot.style.boxShadow = '0 0 6px var(--c-danger)';
                text.textContent = 'CONNECTION LOST';
                text.style.color = 'var(--c-danger)';
                dot.style.animation = 'none';
            }
        };

        // Run immediately
        updateStatus();
        // Poll every 10s
        setInterval(updateStatus, 10000);
    };
    initHeartbeat();

    // Helper to update the Header Title
    const updateTitle = (targetId) => {
        const titleEl = document.getElementById('active-view-title');
        if (!titleEl) return;

        let text = "MODULE";
        if (targetId.includes('cheats')) text = "CHEATS";
        else if (targetId.includes('config')) text = "CONFIGURATION";
        else if (targetId.includes('devtools')) text = "CHROMEDEBUG";
        else if (targetId.includes('options')) text = "ACCOUNT OPTIONS LIST";

        titleEl.textContent = text;
    };

    // 1. Main Tabs
    setupTabs({
        triggerSelector: '.tab-button',
        contentSelector: '.tab-pane',
        datasetProperty: 'tab',
        onTabChange: (targetId) => {
            updateTitle(targetId);
            if (targetId === 'config-tab') initConfig();
            if (targetId === 'devtools-tab') initDevTools();
        }
    });

    // 2. Config Sub-Tabs
    setupTabs({
        triggerSelector: '.config-sub-tab-button',
        contentSelector: '.config-sub-tab-pane',
        datasetProperty: 'subTab'
    });

    // Initial Load
    initCheats();
});