document.addEventListener('DOMContentLoaded', () => {
    // Tab Elements
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Cheat Tab Elements
    const cheatListDiv = document.getElementById('cheat-buttons');
    const loadingCheatsP = document.getElementById('loading-cheats');
    const filterInput = document.getElementById('filter-input');

    // Config Tab Elements (Revised)
    const configSubTabButtons = document.querySelectorAll('.config-sub-tab-button');
    const configSubTabPanes = document.querySelectorAll('.config-sub-tab-pane');
    const cheatConfigOptionsDiv = document.getElementById('cheatconfig-options');
    const cheatConfigCategorySelect = document.getElementById('cheatconfig-category-select'); // Added dropdown select
    const startupCheatsOptionsDiv = document.getElementById('startupcheats-options');
    const loadingCheatConfigP = document.getElementById('loading-cheatconfig'); // Specific loading indicators
    const loadingStartupCheatsP = document.getElementById('loading-startupcheats');
    const updateConfigButton = document.getElementById('update-config-button');
    const saveConfigButton = document.getElementById('save-config-button');

    if (updateConfigButton) {
        updateConfigButton.addEventListener('click', async () => {
            const config = await gatherConfigFromUI();
            if (config) {
                await updateSessionConfig(config);
            }
        });
    }

    if (saveConfigButton) {
        saveConfigButton.addEventListener('click', async () => {
            const config = await gatherConfigFromUI();
            if (config) {
                await saveConfigFile(config);
            }
        });
    }
    // Removed: configCategorySelect, configOptionsDiv, topLevelOptionsDiv, categorizedOptionsDiv, loadingConfigP (using specific ones now)

    // DevTools Tab Elements
    const devtoolsIframe = document.getElementById('devtools-iframe');
    const devtoolsMessage = document.getElementById('devtools-message');

    // General Elements
    const statusMessageDiv = document.getElementById('status-message');

    // State Variables
    let allCheatButtons = [];
    let cheatsNeedingConfirmation = [];
    let devtoolsLoaded = false;
    let availableCheatsForSearch = []; // Store all cheats for config search
    let currentFullConfig = null; // Store the fetched config
    let configTabInitialized = false; // Flag to track if config tab has been loaded once

    // Note: showStatus function is imported from utils.js

    // --- Helper Functions for Cheat Loading ---

    /**
     * Fetch cheats and confirmation data from API
     * @returns {Promise<{cheats: Array, needsConfirmation: Array}>}
     */
    async function fetchCheatsData() {
        const [cheatsResponse, confirmationResponse] = await Promise.all([
            fetch('/api/cheats'),
            fetch('/api/needs-confirmation')
        ]);

        if (!cheatsResponse.ok) {
            throw new Error(`HTTP error fetching cheats! status: ${cheatsResponse.status}`);
        }

        const cheats = await cheatsResponse.json();
        const needsConfirmation = confirmationResponse.ok ? await confirmationResponse.json() : [];

        return { cheats, needsConfirmation };
    }

    /**
     * Group cheats by category based on their command structure
     * @param {Array} cheats - Array of cheat objects or strings
     * @returns {Object} Grouped cheats by category
     */
    function groupCheatsByCategory(cheats) {
        const groupedCheats = {};
        const categoryHeaders = new Set();

        // Identify category headers (single-word commands)
        cheats.forEach(cheat => {
            const cheatValue = typeof cheat === 'object' ? cheat.value : cheat;
            if (cheatValue && !cheatValue.includes(' ')) {
                categoryHeaders.add(cheatValue);
            }
        });

        // Group cheats by category
        cheats.forEach(cheat => {
            const cheatValue = typeof cheat === 'object' ? cheat.value : cheat;
            const cheatName = typeof cheat === 'object' ? cheat.message : cheat;

            if (!cheatValue) return;

            const parts = cheatValue.split(' ');
            let category = 'General';

            if (parts.length > 1 && categoryHeaders.has(parts[0])) {
                category = parts[0];
            }

            if (!groupedCheats[category]) {
                groupedCheats[category] = [];
            }

            const baseCommand = cheatValue.split(' ')[0];
            groupedCheats[category].push({
                message: cheatName,
                value: cheatValue,
                baseCommand
            });
        });

        return groupedCheats;
    }

    /**
     * Create a cheat button with optional input field
     * @param {Object} cheat - Cheat object with message and value
     * @param {boolean} needsValue - Whether this cheat requires user input
     * @returns {HTMLElement} Container with button and optional input
     */
    function createCheatButton(cheat, needsValue) {
        const container = document.createElement('div');
        container.className = 'cheat-item-container';

        const button = document.createElement('button');
        button.textContent = cheat.message;
        button.className = 'cheat-button';
        button.dataset.action = cheat.value;

        let inputField = null;
        if (needsValue) {
            inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.className = 'cheat-input';
            inputField.id = `input-${cheat.value.replace(/\s+/g, '-')}`;
            inputField.placeholder = 'Value';
            container.appendChild(inputField);
        }

        container.appendChild(button);

        button.addEventListener('click', () => {
            let actionToSend = cheat.value;
            if (needsValue && inputField) {
                const inputValue = inputField.value.trim();
                if (inputValue) {
                    actionToSend = `${cheat.value} ${inputValue}`;
                } else {
                    showStatus(`Warning: Value required for '${cheat.message}'.`, true);
                    return;
                }
            }
            executeCheatAction(actionToSend);
        });

        return container;
    }

    /**
     * Render cheat categories and their buttons
     * @param {Object} groupedCheats - Cheats grouped by category
     * @param {Array} needsConfirmation - List of cheats requiring confirmation
     */
    function renderCheatCategories(groupedCheats, needsConfirmation) {
        const sortedCategories = Object.keys(groupedCheats).sort();

        sortedCategories.forEach(category => {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'cheat-category';

            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = category;
            categoryHeader.className = 'category-header';
            categoryDiv.appendChild(categoryHeader);

            const categoryContent = document.createElement('div');
            categoryContent.className = 'category-content';

            groupedCheats[category].forEach(cheat => {
                const needsValue = needsConfirmation.includes(cheat.baseCommand);
                const cheatElement = createCheatButton(cheat, needsValue);
                categoryContent.appendChild(cheatElement);
            });

            categoryDiv.appendChild(categoryContent);
            cheatListDiv.appendChild(categoryDiv);
        });
    }

    /**
     * Setup filter functionality for cheats
     */
    function setupCheatFilter() {
        if (!filterInput) return;

        filterInput.addEventListener('input', (e) => {
            const filterText = e.target.value.toLowerCase();
            const allCategories = document.querySelectorAll('.cheat-category');

            allCategories.forEach(categoryDiv => {
                const categoryHeader = categoryDiv.querySelector('.category-header');
                const categoryName = categoryHeader ? categoryHeader.textContent.toLowerCase() : '';
                const buttons = categoryDiv.querySelectorAll('.cheat-button');
                let hasVisibleButtons = false;

                buttons.forEach(button => {
                    const buttonText = button.textContent.toLowerCase();
                    const action = button.dataset.action.toLowerCase();
                    const matches = buttonText.includes(filterText) || action.includes(filterText);

                    button.parentElement.style.display = matches ? '' : 'none';
                    if (matches) hasVisibleButtons = true;
                });

                const categoryMatches = categoryName.includes(filterText);
                categoryDiv.style.display = (hasVisibleButtons || categoryMatches) ? '' : 'none';
            });
        });
    }

    /**
     * Handle errors during cheat loading
     * @param {Error} error - The error that occurred
     */
    function handleCheatLoadError(error) {
        console.error('Error loading cheats:', error);
        if (loadingCheatsP) loadingCheatsP.style.display = 'none';
        if (cheatListDiv) {
            cheatListDiv.innerHTML = `<p style="color: red;">Error loading cheats: ${error.message}</p>`;
        }
        showStatus(`Error loading cheats: ${error.message}`, true);
    }

    // --- API Interaction Functions ---

    async function executeCheatAction(action) {
        try {
            const response = await fetch('/api/toggle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.details || data.error || `HTTP error! status: ${response.status}`);
            showStatus(`Executed '${action}': ${data.result || 'Success'}`);
            console.log(`[Action] Executed '${action}':`, data);
        } catch (error) {
            console.error('Error executing action:', error);
            showStatus(`Error executing '${action}': ${error.message}`, true);
        }
    }

    async function fetchConfig() {
        // Return cached config if available
        if (currentFullConfig) return currentFullConfig;
        try {
            const response = await fetch('/api/config');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || `HTTP error! Status: ${response.status}`);
            }
            currentFullConfig = await response.json(); // Cache the config
            return currentFullConfig;
        } catch (error) {
            console.error('Error fetching config:', error);
            showStatus(`Error fetching configuration: ${error.message}`, true);
            currentFullConfig = null; // Reset cache on error
            return null;
        }
    }

    async function fetchAvailableCheats() {
        if (availableCheatsForSearch.length > 0) return availableCheatsForSearch;
        try {
            const response = await fetch('/api/cheats');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP error fetching cheats! status: ${response.status}`);
            }
            availableCheatsForSearch = await response.json();
            console.log('[Config] Fetched available cheats for search:', availableCheatsForSearch);
            return availableCheatsForSearch;
        } catch (error) {
            console.error('Error fetching available cheats:', error);
            showStatus(`Error fetching cheat list for search: ${error.message}`, true);
            return [];
        }
    }

    async function updateSessionConfig(updatedConfig) {
        try {
            const response = await fetch('/api/config/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedConfig),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.details || data.error || `HTTP error! Status: ${response.status}`);
            showStatus(data.message || 'Configuration updated in session successfully.');
            console.log('[Config] Session Update successful:', data);
            currentFullConfig = updatedConfig; // Update cached config
        } catch (error) {
            console.error('Error updating session config:', error);
            showStatus(`Error updating session configuration: ${error.message}`, true);
        }
    }

    async function saveConfigFile(configToSave) {
        try {
            const response = await fetch('/api/config/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(configToSave),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.details || data.error || `HTTP error! Status: ${response.status}`);
            showStatus(data.message || 'Configuration saved to file successfully.');
            console.log('[Config] Save to file successful:', data);
            currentFullConfig = configToSave; // Update cached config
        } catch (error) {
            console.error('Error saving config file:', error);
            showStatus(`Error saving configuration file: ${error.message}`, true);
        }
    }

    async function fetchDevToolsUrl() {
        try {
            const response = await fetch('/api/devtools-url');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.details || errorData.error || `HTTP error! Status: ${response.status}`);
            }
            const data = await response.json();
            if (data.url) return data.url;
            else throw new Error('No URL received from backend.');
        } catch (error) {
            console.error('Error fetching DevTools URL:', error);
            showStatus(`Error loading DevTools URL: ${error.message}`, true);
            return null;
        }
    }

    // --- UI Rendering Functions ---

    /**
     * Main function to load and render all cheats
     * Refactored to use smaller helper functions for better maintainability
     */
    async function loadAndRenderCheats() {
        if (!cheatListDiv) return;

        cheatListDiv.innerHTML = '';
        if (loadingCheatsP) loadingCheatsP.style.display = 'block';

        try {
            const { cheats, needsConfirmation } = await fetchCheatsData();
            cheatsNeedingConfirmation = needsConfirmation;

            if (loadingCheatsP) loadingCheatsP.style.display = 'none';

            if (!cheats || cheats.length === 0) {
                cheatListDiv.innerHTML = '<p>No cheats found or unable to load.</p>';
                return;
            }

            allCheatButtons = []; // Reset button list for filtering
            const groupedCheats = groupCheatsByCategory(cheats);

            // Render categories
            const sortedCategories = Object.keys(groupedCheats).sort((a, b) => {
                if (a === 'General') return 1; // Put General last
                if (b === 'General') return -1;
                return a.localeCompare(b);
            });

            // Use DocumentFragment for batch DOM insertion
            const fragment = document.createDocumentFragment();

            sortedCategories.forEach(category => {
                if (groupedCheats[category].length === 0) return;

                const details = document.createElement('details');
                details.className = 'cheat-category';

                const summary = document.createElement('summary');
                summary.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                details.appendChild(summary);

                const categoryContent = document.createElement('div');
                categoryContent.className = 'cheat-category-content';

                groupedCheats[category].forEach(cheat => {
                    const needsValue = cheatsNeedingConfirmation.some(confirmCmd =>
                        cheat.value.startsWith(confirmCmd)
                    );
                    const cheatElement = createCheatButton(cheat, needsValue);
                    categoryContent.appendChild(cheatElement);
                    allCheatButtons.push(cheatElement);
                });

                details.appendChild(categoryContent);
                fragment.appendChild(details);
            });

            // Single DOM update
            cheatListDiv.appendChild(fragment);

            // Setup filter after rendering
            setupCheatFilterForCategories();

        } catch (error) {
            handleCheatLoadError(error);
        }
    }

    /**
     * Setup filter for category-based cheat display
     */
    function setupCheatFilterForCategories() {
        if (!filterInput || !cheatListDiv) return;

        // Use debounced filter handler to improve performance
        const debouncedFilter = debounce((e) => {
            const filterText = e.target.value.toLowerCase();
            const visibleCategories = new Set();

            allCheatButtons.forEach(itemContainer => {
                const button = itemContainer.querySelector('.cheat-button');
                const buttonText = button.textContent.toLowerCase();
                const categoryDetails = itemContainer.closest('.cheat-category');

                if (buttonText.includes(filterText)) {
                    itemContainer.style.display = '';
                    if (categoryDetails) {
                        visibleCategories.add(categoryDetails);
                    }
                } else {
                    itemContainer.style.display = 'none';
                }
            });

            const allCategories = cheatListDiv.querySelectorAll('.cheat-category');
            allCategories.forEach(categoryDetails => {
                categoryDetails.style.display = visibleCategories.has(categoryDetails) ? '' : 'none';
            });
        }, 300);

        // Remove existing listener to prevent memory leaks
        filterInput.removeEventListener('input', filterInput._cheatFilterHandler);
        filterInput._cheatFilterHandler = debouncedFilter;
        filterInput.addEventListener('input', debouncedFilter);
    }


    // REVISED: Function to load and render the configuration options into sub-tabs
    async function loadAndRenderConfig() {
        // Only run if the necessary elements exist and the tab hasn't been initialized
        if (!cheatConfigOptionsDiv || !startupCheatsOptionsDiv || !loadingCheatConfigP || !loadingStartupCheatsP || configTabInitialized) {
            // If elements are missing, log an error. If already initialized, just return.
            if (!cheatConfigOptionsDiv || !startupCheatsOptionsDiv) console.error("Config sub-tab elements missing!");
            return;
        }

        console.log("[Config] Initializing Config Tab Content...");
        loadingCheatConfigP.style.display = 'block';
        loadingStartupCheatsP.style.display = 'block';
        cheatConfigOptionsDiv.innerHTML = '';
        startupCheatsOptionsDiv.innerHTML = '';

        const config = await fetchConfig(); // Use cached or fetch anew

        loadingCheatConfigP.style.display = 'none';
        loadingStartupCheatsP.style.display = 'none';

        if (!config) {
            cheatConfigOptionsDiv.innerHTML = '<p class="status-error">Failed to load configuration.</p>';
            startupCheatsOptionsDiv.innerHTML = '<p class="status-error">Failed to load configuration.</p>';
            return;
        }

        // --- Render CheatConfig ---
        if (config.cheatConfig && typeof config.cheatConfig === 'object') {
            // Populate category dropdown
            if (cheatConfigCategorySelect) {
                // Clear existing options except "All"
                while (cheatConfigCategorySelect.options.length > 1) {
                    cheatConfigCategorySelect.remove(1);
                }
                // Add categories from config
                Object.keys(config.cheatConfig).sort().forEach(categoryKey => {
                    const option = document.createElement('option');
                    option.value = categoryKey;
                    option.textContent = categoryKey;
                    cheatConfigCategorySelect.appendChild(option);
                });

                // Remove previous listener to prevent memory leaks
                if (cheatConfigCategorySelect._categoryChangeHandler) {
                    cheatConfigCategorySelect.removeEventListener('change', cheatConfigCategorySelect._categoryChangeHandler);
                }
                // Store reference for cleanup
                cheatConfigCategorySelect._categoryChangeHandler = handleCheatConfigCategoryChange;
                cheatConfigCategorySelect.addEventListener('change', handleCheatConfigCategoryChange);
            }

            // Initial render (show all)
            renderCategorizedOptions(config.cheatConfig, 'cheatConfig', cheatConfigOptionsDiv);
        } else {
            cheatConfigOptionsDiv.innerHTML = '<p>No CheatConfig found or it is not an object.</p>';
            console.warn("[Config] 'cheatconfig' key missing or not an object in fetched config:", config);
        }

        // --- Render StartupCheats ---
        if (config.startupCheats && Array.isArray(config.startupCheats)) {
            // Use renderSingleOption specifically for the startupCheats array structure
            renderSingleOption('startupCheats', config.startupCheats, '', startupCheatsOptionsDiv);
        } else {
            startupCheatsOptionsDiv.innerHTML = '<p>No Startup Cheats found or it is not an array.</p>';
            console.warn("[Config] 'startupCheats' key missing or not an array in fetched config:", config);
            // Optionally render an empty editor if the key exists but is wrong type/null
            // renderSingleOption('startupCheats', [], '', startupCheatsOptionsDiv);
        }

        configTabInitialized = true; // Mark as initialized
        console.log("[Config] Config Tab Content Initialized.");

    } // End of loadAndRenderConfig

    // Event handler for cheat config category dropdown change
    async function handleCheatConfigCategoryChange(event) {
        const selectedCategory = event.target.value;
        console.log(`[Config] Category selected: ${selectedCategory}`);
        const config = await fetchConfig(); // Ensure we have the latest config structure

        if (!config || !config.cheatConfig) {
            cheatConfigOptionsDiv.innerHTML = '<p class="status-error">Error loading config for filtering.</p>';
            return;
        }

        cheatConfigOptionsDiv.innerHTML = ''; // Clear current options

        if (selectedCategory === 'all') {
            // Render all categories
            renderCategorizedOptions(config.cheatConfig, 'cheatConfig', cheatConfigOptionsDiv);
        } else if (config.cheatConfig[selectedCategory]) {
            // Render only the selected category's items directly
            // We pass the sub-object and the full parent key path
            const categoryObj = { [selectedCategory]: config.cheatConfig[selectedCategory] }; // Wrap it to keep structure
            renderCategorizedOptions(categoryObj, 'cheatConfig', cheatConfigOptionsDiv);
        } else {
            cheatConfigOptionsDiv.innerHTML = `<p>Category "${selectedCategory}" not found in config.</p>`;
        }
    }


    // Renders all options within a selected category object (now used for cheatconfig)
    function renderCategorizedOptions(categoryObj, parentKey, container) {
        // DO NOT clear container here if called from event handler, clear it there.
        // container.innerHTML = ''; // Clear container first - Moved clearing logic to caller

        // If the container is being rendered initially (not via dropdown change), clear it.
        // This check is a bit implicit, maybe improve later. For now, assume if parentKey is 'cheatConfig' and container is cheatConfigOptionsDiv, it's the main call.
        if (parentKey === 'cheatConfig' && container === cheatConfigOptionsDiv && cheatConfigCategorySelect && cheatConfigCategorySelect.value === 'all') {
            container.innerHTML = '';
        }


        for (const key in categoryObj) {
            if (!Object.hasOwnProperty.call(categoryObj, key)) continue;
            renderSingleOption(key, categoryObj[key], parentKey, container);
        }
    }


    // Renders a single configuration item (key-value pair) - Now also handles startupCheats rendering
    function renderSingleOption(key, value, parentKey = '', container) {
        const fullKey = parentKey ? `${parentKey}.${key}` : key;

        // Ensure container exists before proceeding
        if (!container) {
            console.error(`[Render] Attempted to render option "${fullKey}" but container is invalid.`);
            return;
        }

        const itemDiv = document.createElement('div');
        itemDiv.className = 'config-item';
        // Add a data attribute for easier gathering, especially for top-level items
        itemDiv.dataset.configKey = fullKey;

        const label = document.createElement('label');
        label.textContent = key;
        // Append label conditionally below

        // --- Special Handling for startupCheats ---
        if (fullKey === 'startupCheats' && Array.isArray(value)) {
            // DO NOT append label for startupCheats main entry
            const cheatsContainer = document.createElement('div');
            cheatsContainer.className = 'startup-cheats-editor';
            cheatsContainer.id = `config-${fullKey}-editor`;
            cheatsContainer.dataset.key = fullKey; // Store key for gathering data

            const listElement = document.createElement('ul');
            listElement.className = 'startup-cheats-list';
            cheatsContainer.appendChild(listElement);

            // Function to render a single cheat item
            function renderCheatItem(cheatCommand, index) {
                const listItem = document.createElement('li');
                listItem.className = 'cheat-item-row';
                listItem.dataset.index = index;

                const inputField = document.createElement('input');
                inputField.type = 'text';
                inputField.value = cheatCommand;
                inputField.className = 'startup-cheat-input';
                // No specific change listener needed here, gather on save/update
                listItem.appendChild(inputField);

                const removeButton = document.createElement('button');
                removeButton.textContent = '✕';
                removeButton.className = 'remove-cheat-button';
                removeButton.type = 'button';
                removeButton.addEventListener('click', () => listItem.remove());
                listItem.appendChild(removeButton);

                return listItem;
            }

            // Render existing cheats
            value.forEach((cheat, index) => {
                listElement.appendChild(renderCheatItem(cheat, index));
            });

            // Add Cheat Button and Search Area
            const addArea = document.createElement('div');
            addArea.className = 'add-cheat-area';
            const addButton = document.createElement('button');
            addButton.textContent = '+ Add Cheat';
            addButton.className = 'add-cheat-button';
            addButton.type = 'button';
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
            cancelButton.type = 'button';
            cancelButton.style.display = 'none';

            addArea.appendChild(addButton);
            addArea.appendChild(searchInput);
            addArea.appendChild(searchResults);
            addArea.appendChild(cancelButton);

            addButton.addEventListener('click', async () => {
                addButton.style.display = 'none';
                searchInput.style.display = 'inline-block';
                cancelButton.style.display = 'inline-block';
                searchInput.value = '';
                searchResults.innerHTML = '';
                searchResults.style.display = 'none';
                searchInput.focus();
                await fetchAvailableCheats(); // Ensure list is loaded
            });

            cancelButton.addEventListener('click', () => {
                addButton.style.display = 'inline-block';
                searchInput.style.display = 'none';
                searchResults.style.display = 'none';
                cancelButton.style.display = 'none';
            });

            searchInput.addEventListener('input', () => {
                const searchTerm = searchInput.value.toLowerCase().trim();
                searchResults.innerHTML = '';
                if (searchTerm.length < 2) {
                    searchResults.style.display = 'none';
                    return;
                }
                const matches = availableCheatsForSearch.filter(cheat =>
                    cheat.message.toLowerCase().includes(searchTerm) ||
                    cheat.value.toLowerCase().includes(searchTerm)
                ).slice(0, 10);

                if (matches.length > 0) {
                    matches.forEach(cheat => {
                        const li = document.createElement('li');
                        li.textContent = `${cheat.message} (${cheat.value})`;
                        li.dataset.cheatValue = cheat.value;
                        li.addEventListener('click', () => {
                            const newIndex = listElement.children.length;
                            listElement.appendChild(renderCheatItem(cheat.value, newIndex));
                            // Reset add area
                            searchInput.value = '';
                            searchResults.innerHTML = '';
                            searchResults.style.display = 'none';
                            searchInput.style.display = 'none';
                            cancelButton.style.display = 'none';
                            addButton.style.display = 'inline-block';
                        });
                        searchResults.appendChild(li);
                    });
                    searchResults.style.display = 'block';
                } else {
                    searchResults.style.display = 'none';
                }
            });

            cheatsContainer.appendChild(addArea);
            itemDiv.appendChild(cheatsContainer); // Append the editor container

        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Render nested object (within cheatconfig)
            itemDiv.appendChild(label); // Append label for nested objects
            label.htmlFor = `config-${fullKey}-nested`;
            const nestedContainer = document.createElement('div');
            nestedContainer.className = 'config-nested';
            nestedContainer.id = `config-${fullKey}-nested`;
            // Call renderCategorizedOptions for nested objects - this should only happen within cheatconfig pane
            renderCategorizedOptions(value, fullKey, nestedContainer);
            itemDiv.appendChild(nestedContainer);
        } else {
            // Render standard input field (boolean, number, string, other non-handled types) - for cheatconfig items
            itemDiv.appendChild(label); // Append label for standard inputs
            label.htmlFor = `config-${fullKey}`;
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
                // Handle null or other unexpected types as a disabled textarea
                input = document.createElement('textarea');
                input.value = JSON.stringify(value, null, 2);
                input.rows = 3;
                // input.disabled = true; // Disable editing for unknown types
            }
            input.id = `config-${fullKey}`;
            input.dataset.key = fullKey; // Store the full key path for gathering
            itemDiv.appendChild(input);
        }
        container.appendChild(itemDiv);
    }


    // Function to load the DevTools iframe URL
    async function loadDevTools() {
        // ... (loadDevTools function remains unchanged) ...
        if (devtoolsLoaded || !devtoolsIframe || !devtoolsMessage) return; // Don't reload or run if elements missing

        devtoolsIframe.src = ''; // Clear previous src
        devtoolsMessage.textContent = 'Loading DevTools URL...';
        devtoolsMessage.style.color = ''; // Reset color

        const url = await fetchDevToolsUrl();

        if (url) {
            devtoolsIframe.src = url;
            devtoolsLoaded = true;
            devtoolsMessage.textContent = 'Note: Only use this if you really know what you are doing!';
            console.log('[DevTools] Set iframe src:', url);
        } else {
            // Error handled within fetchDevToolsUrl, message shown via showStatus
            devtoolsMessage.textContent = 'Failed to load DevTools URL.';
            devtoolsMessage.style.color = 'red';
        }
    }


    // REVISED: Helper function to gather config data from the UI
    async function gatherConfigFromUI() {
        try {
            const latestConfig = await fetchConfig(); // Get the latest structure
            if (!latestConfig) {
                showStatus('Error: Could not fetch current config to gather data.', true);
                return null;
            }

            // IMPORTANT: Create a deep copy to modify
            if (typeof latestConfig !== 'object' || latestConfig === null) {
                console.error('[Config] Cannot gather UI data: Invalid latestConfig structure.', latestConfig);
                showStatus('Error: Could not gather config data due to invalid base config.', true);
                return null;
            }
            const updatedFullConfig = JSON.parse(JSON.stringify(latestConfig));

            // Helper to set nested values
            function setNestedValue(obj, pathArray, value) {
                if (!obj || typeof obj !== 'object') {
                    console.error(`[SetNested] Invalid base object provided for path: ${pathArray.join('.')}`);
                    return;
                }
                let current = obj;
                for (let i = 0; i < pathArray.length - 1; i++) {
                    const key = pathArray[i];
                    if (!current[key] || typeof current[key] !== 'object') {
                        console.warn(`Path ${pathArray.slice(0, i + 1).join('.')} does not exist or is not an object.`);
                        return;
                    }
                    current = current[key];
                }
                current[pathArray[pathArray.length - 1]] = value;
            }

            // --- Gather Startup Cheats ---
            if (startupCheatsOptionsDiv && updatedFullConfig.hasOwnProperty('startupCheats')) {
                const cheatEditor = startupCheatsOptionsDiv.querySelector('.startup-cheats-editor');
                if (cheatEditor) {
                    const cheatInputs = cheatEditor.querySelectorAll('.startup-cheats-list .startup-cheat-input');
                    const newStartupCheats = [];
                    cheatInputs.forEach(input => {
                        if (input.value.trim()) {
                            newStartupCheats.push(input.value.trim());
                        }
                    });
                    updatedFullConfig.startupCheats = newStartupCheats;
                }
            }

            // --- Gather CheatConfig Options ---
            if (cheatConfigOptionsDiv && updatedFullConfig.hasOwnProperty('cheatConfig')) {
                if (typeof updatedFullConfig.cheatConfig !== 'object' || updatedFullConfig.cheatConfig === null) {
                    updatedFullConfig.cheatConfig = {};
                }

                const configInputs = cheatConfigOptionsDiv.querySelectorAll('input[data-key], textarea[data-key]');
                configInputs.forEach(input => {
                    const fullKeyPath = input.dataset.key.split('.');
                    if (fullKeyPath.length < 2 || fullKeyPath[0] !== 'cheatConfig') return;

                    const relativeKeyPath = fullKeyPath.slice(1);
                    let value;
                    if (input.type === 'checkbox') value = input.checked;
                    else if (input.type === 'number') value = parseFloat(input.value) || input.value;
                    else if (input.tagName === 'TEXTAREA') {
                        try { value = JSON.parse(input.value); } catch { value = input.value; }
                    }
                    else value = input.value;

                    setNestedValue(updatedFullConfig.cheatConfig, relativeKeyPath, value);
                });
            }

            console.log('[Config] Gathered data from UI:', updatedFullConfig);
            return updatedFullConfig;
        } catch (error) {
            console.error('[Config] Error gathering config from UI:', error);
            showStatus('Error gathering configuration from UI', true);
            return null;
        }
    }


    // --- Event Listeners ---

    // Tab switching logic
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.dataset.tab;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            button.classList.add('active');
            const targetPane = document.getElementById(targetTabId);
            if (targetPane) {
                targetPane.classList.add('active');

                // Load content for specific tabs only when they become active the first time
                if (targetTabId === 'config-tab' && !configTabInitialized) {
                    loadAndRenderConfig(); // Load config content on first view
                } else if (targetTabId === 'devtools-tab' && !devtoolsLoaded) {
                    loadDevTools(); // Load devtools on first view
                }
            }
        });
    });

    // Config Sub-Tab switching logic
    configSubTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetPaneId = button.dataset.subTab;

            configSubTabButtons.forEach(btn => btn.classList.remove('active'));
            configSubTabPanes.forEach(pane => pane.classList.remove('active'));

            button.classList.add('active');
            const targetPane = document.getElementById(targetPaneId);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });




    // --- Initial Load ---
    loadAndRenderCheats(); // Load cheats immediately (default tab)
    // Config tab content will load when the tab is clicked.
});
