import { fetchCheatsData, executeCheatAction } from './api.js';
import { debounce, showStatus } from './utils.js';

const DOM = {
    list: document.getElementById('cheat-buttons'),
    loading: document.getElementById('loading-cheats'),
    filter: document.getElementById('filter-input')
};

let allCheatButtons = [];
let listenersInitialized = false;

export async function initCheats() {
    if (!DOM.list) return;

    // 1. Setup delegation once
    if (!listenersInitialized) {
        setupEventListeners();
        listenersInitialized = true;
    }

    DOM.list.innerHTML = '';
    if (DOM.loading) DOM.loading.style.display = 'block';

    try {
        const { cheats, needsConfirmation } = await fetchCheatsData();

        if (DOM.loading) DOM.loading.style.display = 'none';

        if (!cheats || cheats.length === 0) {
            DOM.list.innerHTML = '<p>No cheats found.</p>';
            return;
        }

        renderCheats(cheats, needsConfirmation);
        // Filter setup is now strictly for the input event
        setupFilter();

    } catch (error) {
        console.error('Error loading cheats:', error);
        if (DOM.loading) DOM.loading.style.display = 'none';
        DOM.list.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        showStatus(`Failed to load cheats: ${error.message}`, true);
    }
}

/**
 * Sets up the single event listener for the container (Event Delegation)
 */
function setupEventListeners() {
    DOM.list.addEventListener('click', async (e) => {
        // Find the closest button if the user clicked an icon inside or the button itself
        const button = e.target.closest('.cheat-button');
        if (!button) return;

        // Retrieve data from attributes
        const actionBase = button.dataset.action;
        const message = button.dataset.message;
        const container = button.closest('.cheat-item-container');

        // Find sibling input if it exists
        const inputField = container ? container.querySelector('.cheat-input') : null;

        let finalAction = actionBase;

        // Validation Logic
        if (inputField) {
            const val = inputField.value.trim();
            if (!val) {
                showStatus(`Value required for '${message}'`, true);
                inputField.focus(); // Usability improvement
                return;
            }
            finalAction = `${actionBase} ${val}`;
        }

        // Execution
        try {
            const result = await executeCheatAction(finalAction);
            showStatus(`Executed '${message}': ${result.result || 'Success'}`);
        } catch (error) {
            showStatus(`Error executing '${message}': ${error.message}`, true);
        }
    });
}

function renderCheats(cheats, needsConfirmation) {
    const grouped = groupCheatsByCategory(cheats);
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
        if (a === 'General') return 1;
        if (b === 'General') return -1;
        return a.localeCompare(b);
    });

    const fragment = document.createDocumentFragment();

    sortedCategories.forEach(category => {
        if (grouped[category].length === 0) return;

        const details = document.createElement('details');
        details.className = 'cheat-category';

        const summary = document.createElement('summary');
        summary.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        details.appendChild(summary);

        const content = document.createElement('div');
        content.className = 'cheat-category-content';

        grouped[category].forEach(cheat => {
            const needsValue = needsConfirmation.includes(cheat.baseCommand);
            const btn = createCheatButton(cheat, needsValue);
            content.appendChild(btn);
            allCheatButtons.push(btn);
        });

        details.appendChild(content);
        fragment.appendChild(details);
    });

    DOM.list.appendChild(fragment);
}

function groupCheatsByCategory(cheats) {
    const grouped = {};
    const headers = new Set(cheats.map(c => typeof c === 'object' ? c.value : c).filter(v => v && !v.includes(' ')));

    cheats.forEach(cheat => {
        const val = typeof cheat === 'object' ? cheat.value : cheat;
        const msg = typeof cheat === 'object' ? cheat.message : cheat;
        if (!val) return;

        const parts = val.split(' ');
        let category = (parts.length > 1 && headers.has(parts[0])) ? parts[0] : 'General';

        if (!grouped[category]) grouped[category] = [];
        grouped[category].push({ message: msg, value: val, baseCommand: val.split(' ')[0] });
    });
    return grouped;
}

function createCheatButton(cheat, needsValue) {
    const container = document.createElement('div');
    container.className = 'cheat-item-container';

    // 1. Create Input (if needed)
    if (needsValue) {
        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.className = 'cheat-input';
        inputField.placeholder = 'Value';
        container.appendChild(inputField);
    }

    // 2. Create Button
    const button = document.createElement('button');
    button.textContent = cheat.message;
    button.className = 'cheat-button';

    // Store data in DOM attributes for the delegate listener to find
    button.dataset.action = cheat.value;
    button.dataset.message = cheat.message;

    container.appendChild(button);

    // REMOVED: Individual event listener attachment

    return container;
}

function setupFilter() {
    if (!DOM.filter) return;
    // We can verify if handler exists or just overwrite property reference
    if (DOM.filter._handler) DOM.filter.removeEventListener('input', DOM.filter._handler);

    const handler = debounce((e) => {
        const text = e.target.value.toLowerCase();
        const visibleCats = new Set();

        allCheatButtons.forEach(container => {
            const btn = container.querySelector('.cheat-button');
            const btnText = btn.textContent.toLowerCase();
            const parent = container.closest('.cheat-category');

            if (btnText.includes(text)) {
                container.style.display = '';
                if (parent) visibleCats.add(parent);
            } else {
                container.style.display = 'none';
            }
        });

        document.querySelectorAll('.cheat-category').forEach(cat => {
            cat.style.display = visibleCats.has(cat) ? '' : 'none';
        });
    }, 300);

    DOM.filter._handler = handler;
    DOM.filter.addEventListener('input', handler);
}