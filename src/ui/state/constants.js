/**
 * Centralized view/tab configuration.
 * Provides a single source of truth for tab IDs, labels, and icons.
 */

// Lazy import to avoid circular dependencies: components import this file,
// so we can't import components here directly. Instead, App.js will handle the mapping.
export const VIEWS = {
    CHEATS: {
        id: "cheats-tab",
        label: "CHEATS",
        sidebarLabel: "CHEATS",
    },
    ACCOUNT: {
        id: "options-account-tab",
        label: "ACCOUNT OPTIONS LIST",
        sidebarLabel: "ACCOUNT OPTIONS",
    },
    CONFIG: {
        id: "config-tab",
        label: "CONFIGURATION",
        sidebarLabel: "CONFIG",
    },
    SEARCH: {
        id: "search-tab",
        label: "GGA SEARCH",
        sidebarLabel: "SEARCH",
    },
    DEVTOOLS: {
        id: "devtools-tab",
        label: "CHROMEDEBUG",
        sidebarLabel: "CHROMEDEBUG",
    },
};

// Order in which tabs appear in the sidebar
export const VIEW_ORDER = [VIEWS.CHEATS, VIEWS.ACCOUNT, VIEWS.CONFIG, VIEWS.SEARCH, VIEWS.DEVTOOLS];
export const IS_ELECTRON = /electron/i.test(navigator.userAgent);
export const CATEGORY_ORDER = [
    "general",
    "buy",
    "wide",
    "unlock",
    "w1",
    "w2",
    "w3",
    "w4",
    "w5",
    "w6",
    "w7",
    "minigame",
];
