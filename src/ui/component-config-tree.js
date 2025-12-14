/**
 * Renders a recursive configuration tree
 * @param {HTMLElement} container - DOM element to render into
 * @param {Object} data - The configuration object to render
 * @param {string} parentKey - Dot-notation key path (e.g., 'cheatConfig')
 * @param {Object} fullConfig - The entire config object (used for default value lookup)
 */
export function renderConfigTree(container, data, parentKey, fullConfig) {
    for (const key in data) {
        if (!Object.hasOwnProperty.call(data, key)) continue;

        const value = data[key];
        const currentKeyPath = parentKey ? `${parentKey}.${key}` : key;

        // 1. If it's a nested object (category), recurse
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const details = document.createElement('details');
            details.className = 'cheat-category';
            details.dataset.configKey = currentKeyPath;

            const summary = document.createElement('summary');
            summary.textContent = key;
            details.appendChild(summary);

            const content = document.createElement('div');
            content.className = 'cheat-category-content';

            renderConfigTree(content, value, currentKeyPath, fullConfig);

            details.appendChild(content);
            container.appendChild(details);
        }
        // 2. If it's a value, render input
        else {
            renderConfigItem(container, key, value, currentKeyPath, fullConfig);
        }
    }
}

function renderConfigItem(container, key, value, fullKey, fullConfig) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'config-item';
    itemDiv.dataset.configKey = fullKey;

    const label = document.createElement('label');
    label.textContent = key;
    label.htmlFor = `config-${fullKey}`;
    itemDiv.appendChild(label);

    let input;
    if (typeof value === 'boolean') {
        input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = value;
    } else if (typeof value === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        input.value = value;
    } else if (typeof value === 'string') {
        input = document.createElement('input');
        input.type = 'text';
        input.value = value;
    } else {
        input = document.createElement('textarea');
        input.value = JSON.stringify(value, null, 2);
        input.rows = 3;
    }

    input.id = `config-${fullKey}`;
    input.dataset.key = fullKey; // Used by gatherConfig
    itemDiv.appendChild(input);

    // Apply Diff Logic
    setupDiffListener(itemDiv, input, fullKey, fullConfig);

    container.appendChild(itemDiv);
}

function setupDiffListener(itemDiv, input, fullKey, fullConfig) {
    if (!fullConfig || !fullConfig.defaultConfig) return;

    // Resolve default value from dot-notation key
    const keys = fullKey.split('.');
    let defaultValue = fullConfig.defaultConfig;
    let hasDefault = true;

    for (const k of keys) {
        if (defaultValue && Object.prototype.hasOwnProperty.call(defaultValue, k)) {
            defaultValue = defaultValue[k];
        } else {
            hasDefault = false;
            break;
        }
    }

    if (!hasDefault) return;

    const checkModified = () => {
        let currentValue;

        // Parse current value based on input type
        if (input.type === 'checkbox') currentValue = input.checked;
        else if (input.type === 'number') currentValue = parseFloat(input.value);
        else if (input.tagName === 'TEXTAREA') {
            try { currentValue = JSON.parse(input.value); } catch { currentValue = input.value; }
        } else {
            currentValue = input.value;
        }

        // Deep Compare
        const isObject = typeof defaultValue === 'object' && defaultValue !== null;
        const isModified = isObject
            ? JSON.stringify(currentValue) !== JSON.stringify(defaultValue)
            : currentValue !== defaultValue;

        if (isModified) {
            itemDiv.classList.add('modified-config');
            if (!itemDiv.querySelector('.default-value-hint')) {
                const hint = document.createElement('div');
                hint.className = 'default-value-hint';
                hint.textContent = `Default: ${isObject ? JSON.stringify(defaultValue) : defaultValue}`;
                itemDiv.appendChild(hint);
            }
        } else {
            itemDiv.classList.remove('modified-config');
            itemDiv.querySelector('.default-value-hint')?.remove();
        }

        // Update parent category visual state
        updateParentCategoryStatus(itemDiv);
    };

    input.addEventListener('change', checkModified);
    if (input.type !== 'checkbox') input.addEventListener('input', checkModified);

    // Initial check
    checkModified();
}

function updateParentCategoryStatus(element) {
    const parentCategory = element.closest('.cheat-category');
    if (!parentCategory) return;

    const modifiedChildren = parentCategory.querySelectorAll('.config-item.modified-config');
    if (modifiedChildren.length > 0) parentCategory.classList.add('modified-category');
    else parentCategory.classList.remove('modified-category');
}

/**
 * Updates all category statuses globally (useful after a full render)
 */
export function updateAllCategoryStatuses() {
    document.querySelectorAll('.cheat-category').forEach(category => {
        const modifiedChildren = category.querySelectorAll('.config-item.modified-config');
        if (modifiedChildren.length > 0) category.classList.add('modified-category');
        else category.classList.remove('modified-category');
    });
}