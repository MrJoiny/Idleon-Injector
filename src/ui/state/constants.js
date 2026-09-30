/**
 * Centralized view/tab configuration.
 * Provides a single source of truth for tab IDs, labels, and icons.
 */

// Lazy import to avoid circular dependencies: components import this file,
// so we can't import components here directly. Instead, App.js will handle the mapping.
export const VIEWS = {
    CHEATS: {
        id: "cheats-tab",
        label: "Cheats",
    },
    ACCOUNT: {
        id: "options-account-tab",
        label: "Account",
    },
    CONFIG: {
        id: "config-tab",
        label: "Config",
    },
    SEARCH: {
        id: "search-tab",
        label: "Search",
    },
    DEVTOOLS: {
        id: "devtools-tab",
        label: "DevTools",
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

export const FAVORITE_KEYS = [
    "OptionsListAccount",
    "OptionsList",
    "PlayerDATABASE",
    "SkillLevels",
    "SkillLevelsMAX",
    "BundlesReceived",
    "ChestQuantity",
    "CurrenciesOwned",
    "CustomLists",
    "Exp0",
    "GemItemsPurchased",
    "ItemQuantity",
    "KillsLeft2Advance",
    "Lv0",
    "Spelunk",
    "Arcane",
    "Bubba",
    "Compass",
    "Grimoire",
];
