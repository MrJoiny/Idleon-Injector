import vanX from "../vendor/van-x-0.6.3.js";
import * as API from "../services/api.js";
import { IS_ELECTRON, VIEWS } from "./constants.js";
import { getCheatConfigPath, configPathExists } from "../utils/index.js";
import { initWebSocket, onStateUpdate, getConnectionStatus } from "../services/ws.js";

/**
 * Safely parse JSON from localStorage with fallback
 * @param {string} key - localStorage key
 * @param {*} fallback - Default value if parse fails
 * @returns {*} Parsed value or fallback
 */
const safeParseJSON = (key, fallback = []) => {
    try {
        return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
        return fallback;
    }
};

const appState = vanX.reactive({
    activeTab: "cheats-tab",
    isLoading: false,
    heartbeat: false,
    toast: { message: "", type: "", id: 0 },
    config: null,
    sidebarCollapsed: localStorage.getItem("sidebarCollapsed") === "true",
    configForcedPath: null,
    cheatsViewMode: localStorage.getItem("cheatsViewMode") || "tabs",
});

const dataState = vanX.reactive({
    cheats: [],
    accountOptions: [],
    accountSchema: {},
    activeCheatStates: {},
    favoriteCheats: safeParseJSON("favoriteCheats", []),
    recentCheats: safeParseJSON("recentCheats", []),
});

const Actions = {
    notify: (message, type = "success") => {
        appState.toast = { message, type, id: Date.now() };
    },

    withLoading: async (fn) => {
        try {
            appState.isLoading = true;
            await fn();
        } catch (e) {
            Actions.notify(e.message || "Unknown Error", "error");
        } finally {
            appState.isLoading = false;
        }
    },
};

const SystemService = {
    initHeartbeat: () => {
        initWebSocket();

        onStateUpdate((states) => {
            dataState.activeCheatStates = states || {};
        });

        // Use WebSocket connection status for heartbeat, with HTTP fallback
        const check = async () => {
            // Check WebSocket connection first
            if (getConnectionStatus()) {
                appState.heartbeat = true;
                return;
            }

            // Fall back to HTTP heartbeat check
            const alive = await API.checkHeartbeat();
            appState.heartbeat = !!alive;
        };
        check();
        setInterval(check, 10000);
    },
};

const CheatService = {
    loadCheats: async () => {
        await Actions.withLoading(async () => {
            const hasConfig = appState.config !== null;

            const [cheats, config] = await Promise.all([
                API.fetchCheatsData(),
                hasConfig ? Promise.resolve(null) : API.fetchConfig(),
            ]);

            dataState.cheats = cheats || [];

            if (config) {
                appState.config = config;
            }
        });
    },

    /**
     * Check if a cheat has an associated config entry.
     * @param {string} cheatValue
     * @returns {boolean}
     */
    hasConfigEntry: (cheatValue) => {
        if (!appState.config?.cheatConfig) return false;
        const pathParts = getCheatConfigPath(cheatValue);
        if (!pathParts) return false;
        return configPathExists(pathParts, appState.config.cheatConfig);
    },

    /**
     * Navigate to the Config tab with forced path display.
     * @param {string} cheatValue
     */
    navigateToCheatConfig: (cheatValue) => {
        const pathParts = getCheatConfigPath(cheatValue);
        if (pathParts && configPathExists(pathParts, appState.config?.cheatConfig)) {
            appState.configForcedPath = pathParts;
            appState.activeTab = VIEWS.CONFIG.id;
        }
    },

    /**
     * Clear the forced config path (called when user interacts with Config filters).
     */
    clearForcedConfigPath: () => {
        appState.configForcedPath = null;
    },

    executeCheat: async (action, message) => {
        try {
            const result = await API.executeCheatAction(action);
            Actions.notify(`Cheat ${result.result || "Success"}`);
            FavoritesService.addToRecent(action);
            // Note: Cheat states are now updated via WebSocket push from server
            // No need for manual loadCheatStates() call
        } catch (e) {
            Actions.notify(`Error executing '${message}': ${e.message}`, "error");
        }
    },
};

const getActiveCheats = (states) => {
    const activeCheats = [];

    const normalizeKey = (key) => (key.endsWith("s") ? key.slice(0, -1) : key);

    for (const key in states) {
        const value = states[key];

        if (typeof value === "object" && value !== null) {
            for (const subKey in value) {
                if (value[subKey] === true) {
                    activeCheats.push(`${normalizeKey(key)} ${subKey}`);
                }
            }
        } else if (value === true) {
            activeCheats.push(normalizeKey(key));
        }
    }

    return activeCheats;
};

const CheatStateService = {
    loadCheatStates: async () => {
        try {
            const result = await API.fetchCheatStates();
            dataState.activeCheatStates = result.data || {};
        } catch (e) {
            console.error("Error loading cheat states:", e);
            dataState.activeCheatStates = {};
        }
    },
};

const FavoritesService = {
    toggleFavorite: (cheatValue) => {
        const index = dataState.favoriteCheats.indexOf(cheatValue);
        if (index > -1) {
            dataState.favoriteCheats.splice(index, 1);
        } else {
            dataState.favoriteCheats.push(cheatValue);
        }
        localStorage.setItem("favoriteCheats", JSON.stringify([...dataState.favoriteCheats]));
    },

    isFavorite: (cheatValue) => {
        return dataState.favoriteCheats.includes(cheatValue);
    },

    addToRecent: (cheatValue) => {
        const filtered = dataState.recentCheats.filter((c) => c !== cheatValue);
        filtered.unshift(cheatValue);
        const newRecent = filtered.slice(0, 10);
        dataState.recentCheats.length = 0;
        newRecent.forEach((c) => dataState.recentCheats.push(c));
        localStorage.setItem("recentCheats", JSON.stringify(newRecent));
    },
};

const ConfigService = {
    loadConfig: async () => {
        // Custom error message requirement prevents using generic withLoading wrapper
        try {
            appState.isLoading = true;
            const data = await API.fetchConfig();
            appState.config = data;
        } catch (e) {
            Actions.notify(`Config Load Error: ${e.message}`, "error");
        } finally {
            appState.isLoading = false;
        }
    },

    saveConfig: async (newConfig, isPersistent) => {
        try {
            // Strip Proxies via JSON cycle to prevent reactive leaks
            const cleanConfig = JSON.parse(JSON.stringify(newConfig));

            const result = isPersistent
                ? await API.saveConfigFile(cleanConfig)
                : await API.updateSessionConfig(cleanConfig);

            Actions.notify(result.message || (isPersistent ? "SAVED TO DISK" : "RAM UPDATED"));
        } catch (e) {
            Actions.notify(e.message, "error");
        }
    },
};

const AccountService = {
    loadAccountOptions: async () => {
        await Actions.withLoading(
            async () => {
                const hasSchema = Object.keys(dataState.accountSchema).length > 0;

                const [schemaRes, dataRes] = await Promise.all([
                    hasSchema
                        ? Promise.resolve(null)
                        : fetch("/config/optionsAccountSchema.json").catch(() => ({ ok: false })),
                    API.fetchOptionsAccount(),
                ]);

                if (schemaRes?.ok) {
                    dataState.accountSchema = await schemaRes.json();
                }

                // Hard reset to ensure clean reactivity state (Legacy behavior maintained)
                const newData = dataRes.data || [];
                dataState.accountOptions = [];
                dataState.accountOptions = newData;

                Actions.notify(`ACCOUNT DATA DECRYPTED (${newData.length} ITEMS)`);
            },
            (e) => `Error loading options: ${e.message}`
        );
    },

    updateAccountOption: async (index, value) => {
        try {
            // Optimistic UI Update
            dataState.accountOptions[index] = value;
            await API.updateOptionAccountIndex(index, value);
            Actions.notify(`INDEX ${index} WROTE TO MEMORY`);
        } catch (e) {
            Actions.notify(`Failed to update Index ${index}: ${e.message}`, "error");
            // Re-throw to allow component to handle local error state (e.g., red border)
            throw e;
        }
    },
};

const store = {
    app: appState,
    data: dataState,

    notify: Actions.notify,
    initHeartbeat: SystemService.initHeartbeat,

    loadCheats: CheatService.loadCheats,
    executeCheat: CheatService.executeCheat,
    hasConfigEntry: CheatService.hasConfigEntry,
    navigateToCheatConfig: CheatService.navigateToCheatConfig,
    clearForcedConfigPath: CheatService.clearForcedConfigPath,
    loadCheatStates: CheatStateService.loadCheatStates,
    getActiveCheats: () => getActiveCheats(dataState.activeCheatStates),

    loadConfig: ConfigService.loadConfig,
    saveConfig: ConfigService.saveConfig,

    loadAccountOptions: AccountService.loadAccountOptions,
    updateAccountOption: AccountService.updateAccountOption,

    toggleSidebar: () => {
        appState.sidebarCollapsed = !appState.sidebarCollapsed;
        localStorage.setItem("sidebarCollapsed", appState.sidebarCollapsed);
    },

    toggleCheatsViewMode: () => {
        appState.cheatsViewMode = appState.cheatsViewMode === "list" ? "tabs" : "list";
        localStorage.setItem("cheatsViewMode", appState.cheatsViewMode);
    },

    openExternalUrl: async (url) => {
        try {
            await API.openExternalUrl(url);
        } catch (e) {
            Actions.notify(`Failed to open URL: ${e.message}`, "error");
        }
    },

    toggleFavorite: FavoritesService.toggleFavorite,
    isFavorite: FavoritesService.isFavorite,
    addToRecent: FavoritesService.addToRecent,
};

export default store;
