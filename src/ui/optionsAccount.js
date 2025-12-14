// Options Account Editor Module
// Handles the Options List Account editor functionality
// Updated for Cyber-Industrial UI compatibility

import { fetchOptionsAccount, updateOptionAccountIndex } from './api.js';
import { showStatus, debounce, setupTabs } from './utils.js';

// State
let optionsListAccountSchema = {};
let currentOptionsData = null;
let optionsAccountWarningAccepted = false;

// DOM Elements
// We wrap this in a getter or init to ensure HTML exists before we grab it
let DOM = {};

function initDOM() {
    DOM = {
        loadBtn: document.getElementById('load-options-button'),
        refreshBtn: document.getElementById('refresh-options-button'),
        filterInput: document.getElementById('options-filter'),
        hideAiCheckbox: document.getElementById('hide-ai-options'),
        // Modal elements
        modal: document.getElementById('options-warning-modal'),
        modalAccept: document.getElementById('modal-accept'),
        modalCancel: document.getElementById('modal-cancel'),
        // Containers
        containers: {
            documented: document.getElementById('documented-options'),
            wrapper: document.getElementById('options-account-content'),
            loading: document.getElementById('loading-options')
        }
    };
}

export function initOptionsAccount() {
    initDOM();

    setupEventListeners();
    loadSchema();
}

function setupEventListeners() {
    // 1. Load Button (Triggers Modal or Load)
    if (DOM.loadBtn) {
        DOM.loadBtn.addEventListener('click', () => {
            if (optionsAccountWarningAccepted) {
                loadOptionsData();
            } else {
                // UI FIX: Remove .hidden class instead of setting style.display
                DOM.modal.classList.remove('hidden');
            }
        });
    }

    // 2. Refresh Button
    if (DOM.refreshBtn) {
        DOM.refreshBtn.addEventListener('click', loadOptionsData);
    }

    // 3. Modal Actions
    if (DOM.modalAccept) {
        DOM.modalAccept.addEventListener('click', () => {
            optionsAccountWarningAccepted = true;
            DOM.modal.classList.add('hidden'); // UI FIX
            loadOptionsData();
        });
    }

    if (DOM.modalCancel) {
        DOM.modalCancel.addEventListener('click', () => {
            DOM.modal.classList.add('hidden'); // UI FIX
        });
    }

    // 4. Filter Logic
    if (DOM.filterInput) {
        DOM.filterInput.addEventListener('input', debounce(handleFilter, 300));
    }

    // 5. Hide AI Logic
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
        console.warn("Schema not found.", e);
    }
}

async function loadOptionsData() {
    // UI FIX: Use classes for visibility
    DOM.containers.loading.classList.remove('hidden');
    DOM.containers.wrapper.classList.add('hidden');

    try {
        const result = await fetchOptionsAccount();
        currentOptionsData = result.data;

        // Swap Visibility
        DOM.containers.loading.classList.add('hidden');
        DOM.containers.wrapper.classList.remove('hidden');

        // Toggle Controls
        if (DOM.loadBtn) DOM.loadBtn.classList.add('hidden');
        if (DOM.refreshBtn) DOM.refreshBtn.classList.remove('hidden');
        if (DOM.filterInput) DOM.filterInput.classList.remove('hidden');

        renderOptions();
        showStatus('ACCOUNT DATA DECRYPTED'); // Thematic update
    } catch (error) {
        DOM.containers.loading.classList.add('hidden');
        showStatus(`Error loading options: ${error.message}`, true);
    }
}

function renderOptions() {
    if (!currentOptionsData) return;

    DOM.containers.documented.innerHTML = '';
    // DOM.containers.raw removed

    const docFrag = document.createDocumentFragment();

    currentOptionsData.forEach((value, index) => {
        const schema = optionsListAccountSchema[index];

        // Only Render Documented List
        if (schema) {
            const docItem = createOptionItem(index, value, schema);
            docFrag.appendChild(docItem);
        }
    });

    DOM.containers.documented.appendChild(docFrag);

    if (DOM.hideAiCheckbox) toggleAiOptions(DOM.hideAiCheckbox.checked);
    if (DOM.filterInput && DOM.filterInput.value) handleFilter();
}

function createOptionItem(index, value, schema) {
    const item = document.createElement('div');
    item.className = 'option-item';
    item.dataset.index = index;

    if (schema?.AI) item.classList.add('is-ai-option');
    if (schema?.warning) item.classList.add('has-warning');

    // Header
    const header = document.createElement('div');
    header.className = 'option-header';

    const label = document.createElement('div');
    label.className = 'option-label';

    if (schema?.AI) {
        const aiSpan = document.createElement('span');
        aiSpan.textContent = 'AI_GEN // ';
        aiSpan.style.color = 'var(--c-accent)'; // Updated to Var
        aiSpan.style.fontSize = '0.75rem';
        label.appendChild(aiSpan);
    }
    label.appendChild(document.createTextNode(schema ? schema.name : 'UNKNOWN_INDEX'));

    const indexLabel = document.createElement('div');
    indexLabel.className = 'option-index';
    indexLabel.textContent = `IDX::${index}`;

    header.append(label, indexLabel);
    item.appendChild(header);

    // Warning
    if (schema?.warning) {
        const warn = document.createElement('div');
        warn.style.color = 'var(--c-warning)';
        warn.style.fontSize = '0.8rem';
        warn.style.marginBottom = '8px';
        warn.textContent = `⚠ ${schema.warning}`;
        item.appendChild(warn);
    }

    // Description
    if (schema?.description) {
        const desc = document.createElement('div');
        desc.className = 'option-description';
        desc.textContent = schema.description;
        item.appendChild(desc);
    }

    // Input Area
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'option-input-wrapper';

    const input = document.createElement('input');
    input.className = 'option-input';
    input.dataset.index = index;
    input.dataset.originalType = typeof value;

    if (typeof value === 'boolean') {
        // We could do a toggle switch here, but for a massive list, standard checkbox is faster performance-wise
        input.type = 'checkbox';
        input.checked = value;
    } else if (typeof value === 'number') {
        input.type = 'number';
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
    applyBtn.textContent = 'SET';
    applyBtn.addEventListener('click', () => applySingleOption(index, input));

    inputWrapper.append(input, applyBtn);
    item.appendChild(inputWrapper);

    return item;
}

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
            rawValue = inputElement.value;
            if (originalType === 'number') {
                newValue = Number(rawValue);
                if (isNaN(newValue)) throw new Error(`Value must be a valid number.`);
            } else if (originalType === 'boolean') {
                newValue = String(rawValue).toLowerCase() === 'true';
            } else if (originalType === 'string') {
                newValue = String(rawValue);
            } else if (originalType === 'object' || isComplex) {
                try {
                    newValue = JSON.parse(rawValue);
                } catch (e) {
                    throw new Error(`Invalid JSON format.`);
                }
            } else {
                newValue = rawValue;
            }
        }

        await updateOptionAccountIndex(index, newValue);
        currentOptionsData[index] = newValue;

        const item = inputElement.closest('.option-item');
        item.classList.add('save-success');
        setTimeout(() => item.classList.remove('save-success'), 1000);
        showStatus(`INDEX ${index} WROTE TO MEMORY`);

    } catch (error) {
        showStatus(error.message, true);
        const item = inputElement.closest('.option-item');
        item.classList.add('save-error');
        setTimeout(() => item.classList.remove('save-error'), 1000);
    }
}

function toggleAiOptions(shouldHide) {
    const container = document.getElementById('options-account-content');
    if (!container) return;
    if (shouldHide) container.classList.add('hide-ai-mode');
    else container.classList.remove('hide-ai-mode');
}

function handleFilter() {
    const filterText = DOM.filterInput.value.toLowerCase().trim();
    const allItems = document.querySelectorAll('.option-item');

    allItems.forEach(item => {
        if (!filterText) {
            item.classList.remove('filtered-out');
            return;
        }
        const label = item.querySelector('.option-label')?.textContent.toLowerCase() || '';
        const index = item.dataset.index;

        if (label.includes(filterText) || index.includes(filterText)) {
            item.classList.remove('filtered-out');
        } else {
            item.classList.add('filtered-out');
        }
    });
}

// Auto-init on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptionsAccount);
} else {
    initOptionsAccount();
}