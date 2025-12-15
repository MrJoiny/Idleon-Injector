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

const store = {
    // -- NAMESPACES --
    app: appState,
    data: dataState,

    // -- ACTIONS --

    notify: (message, type = 'success') => {
        store.app.toast = { message, type, id: Date.now() };
    },

    initHeartbeat: () => {
        const check = async () => {
            const alive = await API.checkHeartbeat();
            store.app.heartbeat = !!alive;
        };
        check();
        setInterval(check, 10000);
    },

    loadCheats: async () => {
        try {
            store.app.isLoading = true;
            const { cheats, needsConfirmation } = await API.fetchCheatsData();
            store.data.cheats = cheats || [];
            store.data.needsConfirmation = needsConfirmation || [];
        } catch (e) {
            store.notify(e.message, 'error');
        } finally {
            store.app.isLoading = false;
        }
    },

    executeCheat: async (action, message) => {
        try {
            const result = await API.executeCheatAction(action);
            store.notify(`Executed '${message}': ${result.result || 'Success'}`);
        } catch (e) {
            store.notify(`Error executing '${message}': ${e.message}`, 'error');
        }
    },

    loadConfig: async () => {
        try {
            store.app.isLoading = true;
            const data = await API.fetchConfig();
            store.app.config = data;
        } catch (e) {
            store.notify(`Config Load Error: ${e.message}`, 'error');
        } finally {
            store.app.isLoading = false;
        }
    },

    saveConfig: async (newConfig, isPersistent) => {
        try {
            // Strip Proxies via JSON cycle
            const cleanConfig = JSON.parse(JSON.stringify(newConfig));
            const result = isPersistent
                ? await API.saveConfigFile(cleanConfig)
                : await API.updateSessionConfig(cleanConfig);
            store.notify(result.message || (isPersistent ? 'SAVED TO DISK' : 'RAM UPDATED'));
        } catch (e) {
            store.notify(e.message, 'error');
        }
    },

    loadAccountOptions: async () => {
        try {
            store.app.isLoading = true;
            const [schemaRes, dataRes] = await Promise.all([
                fetch('optionsAccountSchema.json').catch(() => ({ ok: false })),
                API.fetchOptionsAccount()
            ]);

            if (schemaRes.ok) store.data.accountSchema = await schemaRes.json();

            // Hard reset to ensure clean reactivity state
            const newData = dataRes.data || [];
            store.data.accountOptions = [];
            store.data.accountOptions = newData;

            store.notify(`ACCOUNT DATA DECRYPTED (${newData.length} ITEMS)`);
        } catch (e) {
            store.notify(`Error loading options: ${e.message}`, 'error');
        } finally {
            store.app.isLoading = false;
        }
    },

    updateAccountOption: async (index, value) => {
        try {
            store.data.accountOptions[index] = value;
            await API.updateOptionAccountIndex(index, value);
            store.notify(`INDEX ${index} WROTE TO MEMORY`);
        } catch (e) {
            store.notify(`Failed to update Index ${index}: ${e.message}`, 'error');
            throw e;
        }
    },
};

export default store;