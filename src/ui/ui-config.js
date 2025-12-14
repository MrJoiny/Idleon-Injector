import { fetchConfig, updateSessionConfig, saveConfigFile } from './api.js';
import { showStatus } from './utils.js';
import { renderConfigTree, updateAllCategoryStatuses } from './component-config-tree.js';
import { renderStartupCheatsEditor } from './component-startup-cheats.js';

const DOM = {
    cheatOptions: document.getElementById('cheatconfig-options'),
    categorySelect: document.getElementById('cheatconfig-category-select'),
    startupOptions: document.getElementById('startupcheats-options'),
    injectorOptions: document.getElementById('injectorconfig-options'),
    loaders: {
        cheat: document.getElementById('loading-cheatconfig'),
        startup: document.getElementById('loading-startupcheats'),
        injector: document.getElementById('loading-injectorconfig')
    },
    btnUpdate: document.getElementById('update-config-button'),
    btnSave: document.getElementById('save-config-button')
};

// Global state for config
let currentFullConfig = null;

export async function initConfig() {
    setupEventListeners();
    await loadAndRenderConfig();
}

function setupEventListeners() {
    if (DOM.btnUpdate) DOM.btnUpdate.addEventListener('click', () => handleSave(false));
    if (DOM.btnSave) DOM.btnSave.addEventListener('click', () => handleSave(true));

    if (DOM.categorySelect) {
        DOM.categorySelect.addEventListener('change', handleCategoryChange);
    }
}

async function loadAndRenderConfig() {
    toggleLoaders(true);
    clearUI();

    try {
        currentFullConfig = await fetchConfig();

        if (!currentFullConfig) throw new Error('Config data is empty');

        // 1. Render Cheat Config
        if (currentFullConfig.cheatConfig) {
            populateCategorySelect(currentFullConfig.cheatConfig);
            renderConfigTree(DOM.cheatOptions, currentFullConfig.cheatConfig, 'cheatConfig', currentFullConfig);
        }

        // 2. Render Startup Cheats
        if (Array.isArray(currentFullConfig.startupCheats)) {
            renderStartupCheatsEditor(DOM.startupOptions, currentFullConfig.startupCheats);
        }

        // 3. Render Injector Config
        if (currentFullConfig.injectorConfig) {
            renderConfigTree(DOM.injectorOptions, currentFullConfig.injectorConfig, 'injectorConfig', currentFullConfig);
        }

        updateAllCategoryStatuses();

    } catch (error) {
        console.error('Config Load Error:', error);
        DOM.cheatOptions.innerHTML = `<p class="status-error">Failed: ${error.message}</p>`;
        showStatus(`Failed to load configuration: ${error.message}`, true);
    } finally {
        toggleLoaders(false);
    }
}

async function handleSave(isPersistentSave) {
    try {
        const config = gatherConfigFromUI();
        if (!config) return;

        const result = isPersistentSave
            ? await saveConfigFile(config)
            : await updateSessionConfig(config);

        showStatus(result.message || (isPersistentSave ? 'Saved to file.' : 'Session updated.'));
    } catch (error) {
        showStatus(error.message, true);
    }
}

async function handleCategoryChange(event) {
    const selectedCategory = event.target.value;
    DOM.cheatOptions.innerHTML = '';

    // If we have state, use it. Otherwise, strictly we should re-fetch to ensure sync,
    // but for UI responsiveness we use cached state here.
    if (!currentFullConfig) return;

    const configToRender = selectedCategory === 'all'
        ? currentFullConfig.cheatConfig
        : { [selectedCategory]: currentFullConfig.cheatConfig[selectedCategory] };

    if (configToRender) {
        renderConfigTree(DOM.cheatOptions, configToRender, 'cheatConfig', currentFullConfig);
        updateAllCategoryStatuses();
    }
}

function populateCategorySelect(cheatConfig) {
    if (!DOM.categorySelect) return;
    // Keep the "All" option (index 0), remove others
    while (DOM.categorySelect.options.length > 1) {
        DOM.categorySelect.remove(1);
    }
    Object.keys(cheatConfig).sort().forEach(categoryKey => {
        const option = document.createElement('option');
        option.value = categoryKey;
        option.textContent = categoryKey;
        DOM.categorySelect.appendChild(option);
    });
}

function toggleLoaders(show) {
    Object.values(DOM.loaders).forEach(el => el.style.display = show ? 'block' : 'none');
}

function clearUI() {
    DOM.cheatOptions.innerHTML = '';
    DOM.startupOptions.innerHTML = '';
    DOM.injectorOptions.innerHTML = '';
}

/**
 * Scrapes the DOM to rebuild the config object
 */
function gatherConfigFromUI() {
    if (!currentFullConfig) return null;

    // Deep copy to avoid mutating original state directly
    const config = JSON.parse(JSON.stringify(currentFullConfig));
    if (config.defaultConfig) delete config.defaultConfig;

    // 1. Gather Startup Cheats
    const startupInputs = document.querySelectorAll('.startup-cheat-input');
    config.startupCheats = Array.from(startupInputs).map(i => i.value.trim()).filter(Boolean);

    // 2. Gather Tree Options
    const genericInputs = document.querySelectorAll('input[data-key], textarea[data-key]');

    genericInputs.forEach(input => {
        const path = input.dataset.key.split('.'); // e.g., ['cheatConfig', 'Cat', 'Key']
        if (path.length < 2) return;

        const relativePath = path.slice(1);
        let value;

        // Type conversion logic
        if (input.type === 'checkbox') value = input.checked;
        else if (input.type === 'number') value = parseFloat(input.value);
        else if (input.tagName === 'TEXTAREA') {
            try { value = JSON.parse(input.value); } catch { value = input.value; }
        } else {
            value = input.value;
            // Attempt to preserve array/object structures entered as text
            const trimmed = value.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try { value = JSON.parse(trimmed); } catch (e) { console.warn('JSON parse warning', e); }
            }
        }

        // Set value in object
        let current = config;
        let root = path[0];
        if (!current[root]) current[root] = {};
        current = current[root];

        for (let i = 0; i < relativePath.length - 1; i++) {
            if (!current[relativePath[i]]) current[relativePath[i]] = {};
            current = current[relativePath[i]];
        }
        current[relativePath[relativePath.length - 1]] = value;
    });

    return config;
}