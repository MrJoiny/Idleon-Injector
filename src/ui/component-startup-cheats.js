import { fetchAvailableCheats } from './api.js';
import { showStatus } from './utils.js';

let availableCheatsCache = [];

/**
 * Renders the Startup Cheats editor
 * @param {HTMLElement} container - The DOM element to render into
 * @param {string[]} cheatsArray - The current list of startup cheats
 */
export function renderStartupCheatsEditor(container, cheatsArray) {
    // Clear container
    container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'config-item';

    const cheatsContainer = document.createElement('div');
    cheatsContainer.className = 'startup-cheats-editor';

    // 1. The List
    const listElement = document.createElement('ul');
    listElement.className = 'startup-cheats-list';
    cheatsContainer.appendChild(listElement);

    // Helper to render one row
    const createRow = (cmd) => {
        const li = document.createElement('li');
        li.className = 'cheat-item-row';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = cmd;
        input.className = 'startup-cheat-input';
        // Mark as data collection point
        input.dataset.collectionType = 'startup-cheat';

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '✕';
        removeBtn.className = 'remove-cheat-button';
        removeBtn.type = 'button';
        removeBtn.addEventListener('click', () => li.remove());

        li.appendChild(input);
        li.appendChild(removeBtn);
        return li;
    };

    // Render existing items
    cheatsArray.forEach(cmd => listElement.appendChild(createRow(cmd)));

    // 2. Add/Search UI
    const addArea = createAddCheatUI((newCheatValue) => {
        listElement.appendChild(createRow(newCheatValue));
    });

    cheatsContainer.appendChild(addArea);
    wrapper.appendChild(cheatsContainer);
    container.appendChild(wrapper);
}

function createAddCheatUI(onAddCallback) {
    const addArea = document.createElement('div');
    addArea.className = 'add-cheat-area';

    const addButton = document.createElement('button');
    addButton.textContent = '+ Add Cheat';
    addButton.className = 'add-cheat-button';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search cheats...';
    searchInput.className = 'cheat-search-input';
    searchInput.style.display = 'none';

    const searchResults = document.createElement('ul');
    searchResults.className = 'cheat-search-results';
    searchResults.style.display = 'none';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'cancel-add-cheat-button';
    cancelButton.style.display = 'none';

    // Event: Click Add
    addButton.addEventListener('click', async () => {
        toggleSearchUI(true);
        searchInput.focus();

        if (availableCheatsCache.length === 0) {
            try {
                availableCheatsCache = await fetchAvailableCheats();
            } catch (error) {
                console.error("Failed to fetch cheats:", error);
                showStatus("Could not load autocomplete list.", true);
            }
        }
    });

    // Event: Cancel
    cancelButton.addEventListener('click', () => toggleSearchUI(false));

    // Event: Search Input
    searchInput.addEventListener('input', () => {
        const term = searchInput.value.toLowerCase().trim();
        searchResults.innerHTML = '';

        if (term.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const matches = availableCheatsCache.filter(cheat =>
            cheat.message.toLowerCase().includes(term) ||
            cheat.value.toLowerCase().includes(term)
        ).slice(0, 10);

        if (matches.length > 0) {
            matches.forEach(cheat => {
                const li = document.createElement('li');
                li.textContent = `${cheat.message} (${cheat.value})`;
                li.addEventListener('click', () => {
                    onAddCallback(cheat.value);
                    toggleSearchUI(false);
                });
                searchResults.appendChild(li);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.style.display = 'none';
        }
    });

    function toggleSearchUI(show) {
        addButton.style.display = show ? 'none' : 'inline-block';
        searchInput.style.display = show ? 'inline-block' : 'none';
        cancelButton.style.display = show ? 'inline-block' : 'none';
        searchResults.style.display = 'none'; // Always hide results on toggle
        searchInput.value = '';
    }

    addArea.append(addButton, searchInput, searchResults, cancelButton);
    return addArea;
}