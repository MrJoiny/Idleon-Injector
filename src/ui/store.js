import vanX from './van-x-0.6.3.js';
import * as API from './api.js';

// Reactive State Container: UI & System
const appState = vanX.reactive({
    activeTab: 'cheats-tab',
    isLoading: false,
    heartbeat: false,
    toast: { message: '', type: '', id: 0 },
    config: null
});

// Reactive State Container: Domain Data
const dataState = vanX.reactive({
    cheats: [],
    needsConfirmation: [],
    accountOptions: [],
    accountSchema: {}
});


const Actions = {
    notify: (message, type = 'success') => {
        appState.toast = { message, type, id: Date.now() };
    },

    // Helper to safely handle loading wrappers
    withLoading: async (fn) => {
        try {
            appState.isLoading = true;
            await fn();
        } catch (e) {
            Actions.notify(e.message || 'Unknown Error', 'error');
        } finally {
            appState.isLoading = false;
        }
    }
};

const SystemService = {
    initHeartbeat: () => {
        const check = async () => {
            const alive = await API.checkHeartbeat();
            appState.heartbeat = !!alive;
        };
        check();
        setInterval(check, 10000);
    }
};

const CheatService = {
    loadCheats: async () => {
        await Actions.withLoading(async () => {
            const { cheats, needsConfirmation } = await API.fetchCheatsData();
            dataState.cheats = cheats || [];
            dataState.needsConfirmation = needsConfirmation || [];
        });
    },

    executeCheat: async (action, message) => {
        try {
            const result = await API.executeCheatAction(action);
            Actions.notify(`Executed '${message}': ${result.result || 'Success'}`);
        } catch (e) {
            Actions.notify(`Error executing '${message}': ${e.message}`, 'error');
        }
    }
};

const ConfigService = {
    loadConfig: async () => {
        // Custom error message requirement prevents using generic withLoading wrapper
        try {
            appState.isLoading = true;
            const data = await API.fetchConfig();
            appState.config = data;
        } catch (e) {
            Actions.notify(`Config Load Error: ${e.message}`, 'error');
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

            Actions.notify(result.message || (isPersistent ? 'SAVED TO DISK' : 'RAM UPDATED'));
        } catch (e) {
            Actions.notify(e.message, 'error');
        }
    }
};

const AccountService = {
    loadAccountOptions: async () => {
        await Actions.withLoading(async () => {
            const [schemaRes, dataRes] = await Promise.all([
                fetch('optionsAccountSchema.json').catch(() => ({ ok: false })),
                API.fetchOptionsAccount()
            ]);

            if (schemaRes.ok) {
                dataState.accountSchema = await schemaRes.json();
            }

            // Hard reset to ensure clean reactivity state (Legacy behavior maintained)
            const newData = dataRes.data || [];
            dataState.accountOptions = []; // Clear reference
            dataState.accountOptions = newData;

            Actions.notify(`ACCOUNT DATA DECRYPTED (${newData.length} ITEMS)`);
        }, (e) => `Error loading options: ${e.message}`);
    },

    updateAccountOption: async (index, value) => {
        try {
            // Optimistic UI Update
            dataState.accountOptions[index] = value;
            await API.updateOptionAccountIndex(index, value);
            Actions.notify(`INDEX ${index} WROTE TO MEMORY`);
        } catch (e) {
            Actions.notify(`Failed to update Index ${index}: ${e.message}`, 'error');
            // Re-throw to allow component to handle local error state (e.g., red border)
            throw e;
        }
    }
};

const store = {
    // Namespaces
    app: appState,
    data: dataState,

    // Public API Actions
    notify: Actions.notify,
    initHeartbeat: SystemService.initHeartbeat,

    // Cheats
    loadCheats: CheatService.loadCheats,
    executeCheat: CheatService.executeCheat,

    // Config
    loadConfig: ConfigService.loadConfig,
    saveConfig: ConfigService.saveConfig,

    // Account
    loadAccountOptions: AccountService.loadAccountOptions,
    updateAccountOption: AccountService.updateAccountOption,
};

export default store;