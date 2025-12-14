// Options Account Editor Module
// Handles the Options List Account editor functionality
// Special thanks to sciomachist for his great work in finding out a lot off stuff in the OLA

import { fetchOptionsAccount, updateOptionAccountIndex } from './api.js';
import { showStatus, debounce, setupTabs } from './utils.js';

// Import schema (loaded via script tag in HTML index.html as global var, or fetch if dynamic)
// Assuming it acts as a global lookup or fetched. Ideally, fetch it.
let optionsListAccountSchema = {};

// State
let currentOptionsData = null;
let optionsAccountWarningAccepted = false;

const DOM = {
    loadBtn: document.getElementById('load-options-button'),
    refreshBtn: document.getElementById('refresh-options-button'),
    filterInput: document.getElementById('options-filter'),
    hideAiCheckbox: document.getElementById('hide-ai-options'),
    modal: document.getElementById('options-warning-modal'),
    modalAccept: document.getElementById('modal-accept'),
    modalCancel: document.getElementById('modal-cancel'),
    containers: {
        documented: document.getElementById('documented-options'),
        raw: document.getElementById('raw-options'),
        wrapper: document.getElementById('options-account-content'),
        loading: document.getElementById('loading-options')
    }
};

export function initOptionsAccount() {
    setupTabs({
        triggerSelector: '.options-tab-button',
        contentSelector: '.options-tab-pane',
        datasetProperty: 'optionsTab'
    });

    setupEventListeners();
    loadSchema(); // Start loading schema immediately in background
}

function setupEventListeners() {
    // 1. Modal / Load Logic
    if (DOM.loadBtn) {
        DOM.loadBtn.addEventListener('click', () => {
            if (optionsAccountWarningAccepted) loadOptionsData();
            else DOM.modal.style.display = 'flex';
        });
    }

    if (DOM.refreshBtn) {
        DOM.refreshBtn.addEventListener('click', loadOptionsData);
    }

    if (DOM.modalAccept) {
        DOM.modalAccept.addEventListener('click', () => {
            optionsAccountWarningAccepted = true;
            DOM.modal.style.display = 'none';
            loadOptionsData();
        });
    }

    if (DOM.modalCancel) {
        DOM.modalCancel.addEventListener('click', () => DOM.modal.style.display = 'none');
    }

    // 2. Filter Logic (Debounced)
    if (DOM.filterInput) {
        DOM.filterInput.addEventListener('input', debounce(handleFilter, 300));
    }

    // 3. Hide AI Logic (CSS Based - Performance Fix)
    if (DOM.hideAiCheckbox) {
        DOM.hideAiCheckbox.addEventListener('change', (e) => {
            toggleAiOptions(e.target.checked);
        });
    }
}

async function loadSchema() {
    try {
        const res = await fetch('optionsAccountSchema.json');
        if (res.ok) {
            optionsListAccountSchema = await res.json();
        }
    } catch (e) {
        console.warn("Schema not found, defaulting to raw view.", e);
    }
}

async function loadOptionsData() {
    DOM.containers.loading.style.display = 'block';
    DOM.containers.wrapper.style.display = 'none';

    try {
        const result = await fetchOptionsAccount();
        currentOptionsData = result.data; // Assuming API returns { data: [...] }

        DOM.containers.loading.style.display = 'none';
        DOM.containers.wrapper.style.display = 'block';

        if (DOM.loadBtn) DOM.loadBtn.style.display = 'none';
        if (DOM.refreshBtn) DOM.refreshBtn.style.display = 'inline-block';
        if (DOM.filterInput) DOM.filterInput.style.display = 'inline-block';

        renderOptions();
        showStatus('Options loaded successfully');
    } catch (error) {
        DOM.containers.loading.style.display = 'none';
        showStatus(`Error loading options: ${error.message}`, true);
    }
}

function renderOptions() {
    if (!currentOptionsData) return;

    // Clear previous
    DOM.containers.documented.innerHTML = '';
    DOM.containers.raw.innerHTML = '';

    const docFrag = document.createDocumentFragment();
    const rawFrag = document.createDocumentFragment();

    currentOptionsData.forEach((value, index) => {
        const schema = optionsListAccountSchema[index];

        // 1. Render to Documented List (if schema exists)
        if (schema) {
            const docItem = createOptionItem(index, value, schema);
            docFrag.appendChild(docItem);
        }

        // 2. Render to Raw List (always)
        const rawItem = createOptionItem(index, value, null);
        rawFrag.appendChild(rawItem);
    });

    DOM.containers.documented.appendChild(docFrag);
    DOM.containers.raw.appendChild(rawFrag);

    // Apply initial state of checkboxes/filters
    if (DOM.hideAiCheckbox) toggleAiOptions(DOM.hideAiCheckbox.checked);
    if (DOM.filterInput && DOM.filterInput.value) handleFilter();
}

function createOptionItem(index, value, schema) {
    const item = document.createElement('div');
    item.className = 'option-item';
    item.dataset.index = index;

    // --- Performance: Add Classes for Filtering/Hiding ---
    if (schema?.AI) {
        item.classList.add('is-ai-option');
    }
    if (schema?.warning) {
        item.classList.add('has-warning');
    }

    // --- Header ---
    const header = document.createElement('div');
    header.className = 'option-header';

    const label = document.createElement('div');
    label.className = 'option-label';

    if (schema?.AI) {
        const aiSpan = document.createElement('span');
        aiSpan.textContent = '[AI] ';
        aiSpan.style.color = 'var(--accent)';
        label.appendChild(aiSpan);
    }
    label.appendChild(document.createTextNode(schema ? schema.name : 'Unknown Setting'));

    const indexLabel = document.createElement('div');
    indexLabel.className = 'option-index';
    indexLabel.textContent = `Idx: ${index}`;

    header.append(label, indexLabel);
    item.appendChild(header);

    // --- Description/Warning ---
    if (schema?.description) {
        const desc = document.createElement('div');
        desc.className = 'option-description';
        desc.textContent = schema.description;
        item.appendChild(desc);
    }

    if (schema?.warning) {
        const warn = document.createElement('div');
        warn.className = 'option-warning';
        warn.textContent = schema.warning;
        item.appendChild(warn);
    }

    // --- Input Area ---
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'option-input-wrapper';

    const input = document.createElement('input');
    input.className = 'option-input';
    input.dataset.index = index;
    input.dataset.originalType = typeof value; // Crucial for Safety

    // Set Input Attributes based on type
    if (typeof value === 'boolean') {
        input.type = 'checkbox';
        input.checked = value;
    } else if (typeof value === 'number') {
        input.type = 'number'; // Allow native number controls
        input.step = 'any';
        input.value = value;
    } else if (typeof value === 'string') {
        input.type = 'text';
        input.value = value;
    } else {
        input.type = 'text';
        input.value = JSON.stringify(value);
        input.dataset.isComplex = 'true';
    }

    const applyBtn = document.createElement('button');
    applyBtn.className = 'option-apply-button';
    applyBtn.textContent = 'Apply';
    applyBtn.addEventListener('click', () => applySingleOption(index, input));

    inputWrapper.append(input, applyBtn);
    item.appendChild(inputWrapper);

    return item;
}

// --- Safety: Strict Type Checking ---
async function applySingleOption(index, inputElement) {
    const originalType = inputElement.dataset.originalType;
    const isComplex = inputElement.dataset.isComplex === 'true';
    let newValue;
    let rawValue;

    try {
        if (inputElement.type === 'checkbox') {
            rawValue = inputElement.checked;
            newValue = rawValue;
        } else {
            rawValue = inputElement.value; // Don't trim immediately, strings might need spaces

            if (originalType === 'number') {
                newValue = Number(rawValue);
                if (isNaN(newValue)) throw new Error(`Value must be a valid number.`);
            }
            else if (originalType === 'boolean') {
                // Should be covered by checkbox, but fallback handling
                newValue = String(rawValue).toLowerCase() === 'true';
            }
            else if (originalType === 'string') {
                // SECURITY FIX: Do NOT JSON.parse strings. Keep them as strings.
                newValue = String(rawValue);
            }
            else if (originalType === 'object' || isComplex) {
                // Only parse if it was originally an object/array
                try {
                    newValue = JSON.parse(rawValue);
                } catch (e) {
                    throw new Error(`Invalid JSON format for object/array.`);
                }
            }
            else {
                // Fallback for undefined/null
                newValue = rawValue;
            }
        }

        // Send to API
        await updateOptionAccountIndex(index, newValue);

        // Update Local State
        currentOptionsData[index] = newValue;

        // Visual Feedback
        const item = inputElement.closest('.option-item');
        item.classList.add('save-success');
        setTimeout(() => item.classList.remove('save-success'), 1000);
        showStatus(`Index ${index} updated.`);

    } catch (error) {
        console.error(`Error saving index ${index}:`, error);
        showStatus(error.message, true);

        const item = inputElement.closest('.option-item');
        item.classList.add('save-error');
        setTimeout(() => item.classList.remove('save-error'), 1000);
    }
}

// --- Performance: CSS Toggling ---
function toggleAiOptions(shouldHide) {
    const container = document.getElementById('options-account-content');
    if (!container) return;

    // We toggle a class on the parent container
    if (shouldHide) {
        container.classList.add('hide-ai-mode');
    } else {
        container.classList.remove('hide-ai-mode');
    }
}

function handleFilter() {
    const filterText = DOM.filterInput.value.toLowerCase().trim();
    const allItems = document.querySelectorAll('.option-item');

    allItems.forEach(item => {
        // If empty filter, clear filter class (display: flex/block)
        if (!filterText) {
            item.classList.remove('filtered-out');
            return;
        }

        const label = item.querySelector('.option-label')?.textContent.toLowerCase() || '';
        const index = item.dataset.index;
        const desc = item.querySelector('.option-description')?.textContent.toLowerCase() || '';

        // If match
        if (label.includes(filterText) || index.includes(filterText) || desc.includes(filterText)) {
            item.classList.remove('filtered-out');
        } else {
            item.classList.add('filtered-out');
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptionsAccount);
} else {
    initOptionsAccount();
}