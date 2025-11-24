// Options Account Editor Module
// Handles the Options List Account editor functionality
// Special thanks to sciomachist for his great work in finding out a lot off stuff in the OLA

// Import schema (will be loaded via script tag in HTML)
let optionsListAccountSchema = null;

// State
let currentOptionsData = null;
let optionsAccountWarningAccepted = false;

function initOptionsAccount() {
    const loadButton = document.getElementById('load-options-button');
    const refreshButton = document.getElementById('refresh-options-button');
    const filterInput = document.getElementById('options-filter');
    const modal = document.getElementById('options-warning-modal');
    const modalAccept = document.getElementById('modal-accept');
    const modalCancel = document.getElementById('modal-cancel');
    const optionsTabButtons = document.querySelectorAll('.options-tab-button');

    // Show warning modal when load button is clicked
    if (loadButton) {
        loadButton.addEventListener('click', () => {
            if (!optionsAccountWarningAccepted) {
                modal.style.display = 'flex';
            } else {
                loadOptionsAccount();
            }
        });
    }

    // Refresh button - reloads options without warning
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            loadOptionsAccount();
        });
    }

    // Modal accept button
    if (modalAccept) {
        modalAccept.addEventListener('click', () => {
            optionsAccountWarningAccepted = true;
            modal.style.display = 'none';
            loadOptionsAccount();
        });
    }

    // Modal cancel button
    if (modalCancel) {
        modalCancel.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Filter input with debouncing
    if (filterInput) {
        const debouncedFilter = debounce(filterOptions, 300);
        filterInput.addEventListener('input', debouncedFilter);
    }

    // Hide AI Options Checkbox
    const hideAiCheckbox = document.getElementById('hide-ai-options');
    if (hideAiCheckbox) {
        hideAiCheckbox.addEventListener('change', () => {
            renderOptionsAccount();
        });
    }

    // Options tab switching
    optionsTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.optionsTab;
            optionsTabButtons.forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.options-tab-pane').forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`${targetTab}-options`).classList.add('active');
        });
    });
}

async function loadOptionsAccount() {
    const loadingEl = document.getElementById('loading-options');
    const contentEl = document.getElementById('options-account-content');
    const loadButton = document.getElementById('load-options-button');
    const refreshButton = document.getElementById('refresh-options-button');
    const filterInput = document.getElementById('options-filter');

    if (loadingEl) loadingEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';

    try {
        // Load Schema if not already loaded
        if (!optionsListAccountSchema) {
            try {
                const schemaResponse = await fetch('optionsAccountSchema.json');
                if (schemaResponse.ok) {
                    optionsListAccountSchema = await schemaResponse.json();
                } else {
                    console.error("Failed to load schema:", schemaResponse.status);
                    // Fallback to empty object if schema fails to load, so we can still see raw data
                    optionsListAccountSchema = {};
                }
            } catch (schemaError) {
                console.error("Error fetching schema:", schemaError);
                optionsListAccountSchema = {};
            }
        }

        const response = await fetch('/api/options-account');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        currentOptionsData = result.data;

        if (loadingEl) loadingEl.style.display = 'none';
        if (contentEl) contentEl.style.display = 'block';
        if (loadButton) loadButton.style.display = 'none';
        if (refreshButton) refreshButton.style.display = 'inline-block';
        if (filterInput) filterInput.style.display = 'inline-block';

        renderOptionsAccount();
        showStatus('Options loaded successfully');
    } catch (error) {
        console.error('Error loading options:', error);
        if (loadingEl) {
            loadingEl.textContent = `Error: ${error.message}`;
            loadingEl.style.color = 'var(--error)';
        }
        showStatus(`Error loading options: ${error.message}`, true);
    }
}

function renderOptionsAccount() {
    const documentedContainer = document.getElementById('documented-options');
    const rawContainer = document.getElementById('raw-options');
    const hideAiCheckbox = document.getElementById('hide-ai-options');
    const shouldHideAi = hideAiCheckbox ? hideAiCheckbox.checked : false;

    if (!documentedContainer || !rawContainer || !currentOptionsData) return;

    try {
        // Use DocumentFragment for batch DOM insertion
        const documentedFragment = document.createDocumentFragment();
        const rawFragment = document.createDocumentFragment();

        // Render documented options
        currentOptionsData.forEach((value, index) => {
            const schema = optionsListAccountSchema[index];

            if (schema) {
                // Skip if hiding AI and this is an AI option
                if (shouldHideAi && schema.AI) {
                    return;
                }

                // Render in documented tab
                const item = createOptionItem(index, value, schema, false);
                documentedFragment.appendChild(item);
            }

            // Render in raw tab (all indices)
            const rawItem = createOptionItem(index, value, schema, true);
            rawFragment.appendChild(rawItem);
        });

        // Single DOM update per container
        documentedContainer.innerHTML = '';
        documentedContainer.appendChild(documentedFragment);
        rawContainer.innerHTML = '';
        rawContainer.appendChild(rawFragment);
    } catch (error) {
        console.error('Error rendering options:', error);
        showStatus('Error rendering options', true);
    }
}

function createOptionItem(index, value, schema, isRaw) {
    const item = document.createElement('div');
    item.className = 'option-item';
    item.dataset.index = index;

    if (schema && schema.warning) {
        item.classList.add('has-warning');
    }

    if (!schema) {
        item.classList.add('unknown');
    }

    const header = document.createElement('div');
    header.className = 'option-header';

    const label = document.createElement('div');
    label.className = 'option-label';

    let nameText = schema ? schema.name : `Unknown Setting`;

    // Add AI indicator to the front if applicable
    if (schema && schema.AI) {
        // Using a span for styling if needed, or just text
        const aiPrefix = document.createElement('span');
        aiPrefix.textContent = '[AI] ';
        aiPrefix.style.color = 'var(--accent)';
        aiPrefix.style.fontWeight = 'bold';
        label.appendChild(aiPrefix);
        label.appendChild(document.createTextNode(nameText));
    } else {
        label.textContent = nameText;
    }

    const indexLabel = document.createElement('div');
    indexLabel.className = 'option-index';
    indexLabel.textContent = `Index: ${index}`;

    header.appendChild(label);
    header.appendChild(indexLabel);
    item.appendChild(header);

    if (schema && schema.description) {
        const desc = document.createElement('div');
        desc.className = 'option-description';
        desc.textContent = schema.description;
        item.appendChild(desc);
    }

    if (schema && schema.warning) {
        const warning = document.createElement('div');
        warning.className = 'option-warning';
        warning.textContent = schema.warning;
        item.appendChild(warning);
    }

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'option-input-wrapper';

    const input = document.createElement('input');
    input.className = 'option-input';
    input.dataset.index = index;
    input.dataset.originalType = typeof value;

    // Determine input type and value
    if (typeof value === 'boolean') {
        input.type = 'checkbox';
        input.checked = value;
    } else if (typeof value === 'number') {
        input.type = 'text';
        input.value = value;
    } else if (typeof value === 'string') {
        input.type = 'text';
        input.value = value;
    } else {
        input.type = 'text';
        input.value = JSON.stringify(value);
    }

    inputWrapper.appendChild(input);

    const typeBadge = document.createElement('span');
    typeBadge.className = 'option-type-badge';
    typeBadge.textContent = typeof value;
    inputWrapper.appendChild(typeBadge);

    // Add Apply button for this specific index
    const applyButton = document.createElement('button');
    applyButton.className = 'option-apply-button';
    applyButton.textContent = 'Apply';
    applyButton.addEventListener('click', () => applySingleOption(index, input));
    inputWrapper.appendChild(applyButton);

    item.appendChild(inputWrapper);

    if (schema && schema.hint) {
        const hint = document.createElement('div');
        hint.className = 'option-hint';
        hint.textContent = `Hint: ${schema.hint}`;
        item.appendChild(hint);
    }

    if (!schema && isRaw) {
        const unknownNote = document.createElement('div');
        unknownNote.className = 'option-description';
        unknownNote.textContent = 'Unknown - edit at your own risk';
        unknownNote.style.color = 'var(--warning)';
        item.appendChild(unknownNote);
    }

    return item;
}

async function applySingleOption(index, inputElement) {
    if (!currentOptionsData) {
        showStatus('No options data loaded', true);
        return;
    }

    const originalType = inputElement.dataset.originalType;
    let newValue;

    try {
        // Get the value from input
        if (inputElement.type === 'checkbox') {
            newValue = inputElement.checked;
        } else {
            const inputValue = inputElement.value.trim();

            // Preserve original type
            if (originalType === 'number') {
                newValue = parseFloat(inputValue);
                if (isNaN(newValue)) {
                    showStatus(`Invalid number at index ${index}`, true);
                    return;
                }
            } else if (originalType === 'boolean') {
                newValue = inputValue.toLowerCase() === 'true';
            } else if (originalType === 'string') {
                newValue = inputValue;
            } else {
                // Try to parse as JSON for complex types
                try {
                    newValue = JSON.parse(inputValue);
                } catch {
                    newValue = inputValue;
                }
            }
        }

        // Send to server
        const response = await fetch('/api/options-account/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: index, value: newValue })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        // Update local cache
        currentOptionsData[index] = newValue;

        // Visual feedback - briefly highlight the item
        const optionItem = inputElement.closest('.option-item');
        if (optionItem) {
            optionItem.style.borderColor = 'var(--success)';
            optionItem.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
            setTimeout(() => {
                optionItem.style.borderColor = '';
                optionItem.style.backgroundColor = '';
            }, 1000);
        }

        showStatus(`Index ${index} updated successfully`);
    } catch (error) {
        console.error(`Error applying option at index ${index}:`, error);
        showStatus(`Error updating index ${index}: ${error.message}`, true);
    }
}

function filterOptions() {
    try {
        const filterInput = document.getElementById('options-filter');
        if (!filterInput) return;

        const filterText = filterInput.value.toLowerCase().trim();
        const allItems = document.querySelectorAll('.option-item');

        allItems.forEach(item => {
            if (!filterText) {
                item.style.display = '';
                return;
            }

            const index = item.dataset.index;
            const label = item.querySelector('.option-label')?.textContent.toLowerCase() || '';
            const description = item.querySelector('.option-description')?.textContent.toLowerCase() || '';

            if (index.includes(filterText) || label.includes(filterText) || description.includes(filterText)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Error filtering options:', error);
        showStatus('Error filtering options', true);
    }
}


// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptionsAccount);
} else {
    initOptionsAccount();
}
