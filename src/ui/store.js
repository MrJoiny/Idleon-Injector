import van from './van-1.6.0.js';
import * as API from './api.js';

// Reactive State Container
const store = {
    // -- UI STATE --
    activeTab: van.state('cheats-tab'),
    isLoading: van.state(false),

    // Toast Notification State ({ message, type: 'success'|'error', id })
    toast: van.state({ message: '', type: '', id: 0 }),

    // -- SYSTEM STATE --
    heartbeat: van.state(false),

    // -- DATA STORES --
    // We keep raw data here. Components will derive views from this.
    cheats: van.state([]),
    needsConfirmation: van.state([]), // List of cheats needing input

    config: van.state(null), // The full config object

    accountOptions: van.state(null), // The large array of account options
    accountSchema: van.state({}),   // The schema for account options

    // -- ACTIONS --

    // Toast Helper
    notify: (message, type = 'success') => {
        // We increment ID to force listeners to react even if message is same
        store.toast.val = { message, type, id: Date.now() };
    },

    // System Actions
    initHeartbeat: () => {
        const check = async () => {
            const alive = await API.checkHeartbeat();
            store.heartbeat.val = !!alive;
        };
        check();
        setInterval(check, 10000);
    },

    // Cheat Actions
    loadCheats: async () => {
        try {
            store.isLoading.val = true;
            const { cheats, needsConfirmation } = await API.fetchCheatsData();
            store.cheats.val = cheats || [];
            store.needsConfirmation.val = needsConfirmation || [];
        } catch (e) {
            store.notify(e.message, 'error');
        } finally {
            store.isLoading.val = false;
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

    // Config Actions
    loadConfig: async () => {
        try {
            store.isLoading.val = true;
            const data = await API.fetchConfig();
            store.config.val = data;
        } catch (e) {
            store.notify(`Config Load Error: ${e.message}`, 'error');
        } finally {
            store.isLoading.val = false;
        }
    },

    saveConfig: async (newConfig, isPersistent) => {
        try {
            const result = isPersistent
                ? await API.saveConfigFile(newConfig)
                : await API.updateSessionConfig(newConfig);

            store.notify(result.message || (isPersistent ? 'SAVED TO DISK' : 'RAM UPDATED'));
            // Refresh local state to match backend
            store.config.val = newConfig;
        } catch (e) {
            store.notify(e.message, 'error');
        }
    },

    // Account Actions
    loadAccountOptions: async () => {
        try {
            store.isLoading.val = true;

            // Parallel load schema and data
            const [schemaRes, dataRes] = await Promise.all([
                fetch('optionsAccountSchema.json').catch(() => ({ ok: false })),
                API.fetchOptionsAccount()
            ]);

            if (schemaRes.ok) {
                store.accountSchema.val = await schemaRes.json();
            }

            store.accountOptions.val = dataRes.data;
            store.notify('ACCOUNT DATA DECRYPTED');
        } catch (e) {
            store.notify(`Error loading options: ${e.message}`, 'error');
        } finally {
            store.isLoading.val = false;
        }
    },

    updateAccountOption: async (index, value) => {
        try {
            // Optimistic Update: Update local state immediately
            const currentData = [...store.accountOptions.val];
            currentData[index] = value;
            store.accountOptions.val = currentData;

            // API Call
            await API.updateOptionAccountIndex(index, value);
            store.notify(`INDEX ${index} WROTE TO MEMORY`);
        } catch (e) {
            store.notify(`Failed to update Index ${index}: ${e.message}`, 'error');
            // Rollback on error (optional, requires deep clone of original, skipping for simplicity)
            throw e; // Re-throw so UI can show error state
        }
    },
};

export default store;