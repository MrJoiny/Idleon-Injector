/**
 * Centralized view/tab configuration.
 * Provides a single source of truth for tab IDs, labels, and icons.
 */

// Lazy import to avoid circular dependencies: components import this file,
// so we can't import components here directly. Instead, App.js will handle the mapping.
export const VIEWS = {
    CHEATS: {
        id: 'cheats-tab',
        label: 'CHEATS',
        sidebarLabel: 'CHEATS'
    },
    ACCOUNT: {
        id: 'options-account-tab',
        label: 'ACCOUNT OPTIONS LIST',
        sidebarLabel: 'ACCOUNT OPTIONS'
    },
    CONFIG: {
        id: 'config-tab',
        label: 'CONFIGURATION',
        sidebarLabel: 'CONFIG'
    },
    DEVTOOLS: {
        id: 'devtools-tab',
        label: 'CHROMEDEBUG',
        sidebarLabel: 'CHROMEDEBUG'
    }
};

// Order in which tabs appear in the sidebar
export const VIEW_ORDER = [
    VIEWS.CHEATS,
    VIEWS.ACCOUNT,
    VIEWS.CONFIG,
    VIEWS.DEVTOOLS
];

export const IS_ELECTRON = /electron/i.test(navigator.userAgent);
