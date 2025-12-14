/**
 * Shared UI Utilities
 * Common functions used across multiple UI files
 */

let currentTimeout = null;

/**
 * Display a status message to the user
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message (red) or success (green)
 */
export function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-message');
    if (!statusDiv) return;

    // Clear existing timeout to prevent premature hiding
    if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
    }

    statusDiv.textContent = message;
    statusDiv.className = isError ? 'status-error' : 'status-success';

    // Force a reflow to restart animation (optional but nice)
    void statusDiv.offsetWidth;
    statusDiv.style.display = 'block';

    currentTimeout = setTimeout(() => {
        statusDiv.classList.add('fade-out'); // Use CSS transition for fading
        // Wait for CSS transition to finish before hiding
        setTimeout(() => {
            statusDiv.style.display = 'none';
            statusDiv.classList.remove('fade-out');
            statusDiv.textContent = '';
            statusDiv.className = '';
        }, 300);
    }, 5000);
}

/**
 * Debounce a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


/**
 * Generic Tab Switching Logic
 * @param {Object} options
 * @param {string} options.triggerSelector - CSS selector for tab buttons (e.g. '.tab-button')
 * @param {string} options.contentSelector - CSS selector for content panes (e.g. '.tab-pane')
 * @param {string} options.datasetProperty - The dataset key holding the target ID (e.g. 'tab' for data-tab)
 * @param {string} [options.activeClass='active'] - Class to apply to active elements
 * @param {Function} [options.onTabChange] - Callback receiving the targetId when switched
 */
export function setupTabs({ triggerSelector, contentSelector, datasetProperty, activeClass = 'active', onTabChange = null }) {
    const triggers = document.querySelectorAll(triggerSelector);
    const contents = document.querySelectorAll(contentSelector);

    if (triggers.length === 0) return;

    triggers.forEach(trigger => {
        trigger.addEventListener('click', () => {
            // Get target ID from data attribute (e.g. data-tab="config")
            const targetId = trigger.dataset[datasetProperty];

            // 1. Deactivate all
            triggers.forEach(t => t.classList.remove(activeClass));
            contents.forEach(c => c.classList.remove(activeClass));

            // 2. Activate clicked trigger
            trigger.classList.add(activeClass);

            // 3. Activate target content
            // We handle the case where targetId contains the suffix or is just the prefix
            // The original code passed full IDs (e.g. 'config-tab'), so we stick to that.
            const targetContent = document.getElementById(targetId);
            if (targetContent) {
                targetContent.classList.add(activeClass);
            } else {
                // Fallback: simpler config might pass 'documented' expecting 'documented-options'
                // This covers the logic seen in optionsAccount.js
                const alternateTarget = document.getElementById(`${targetId}-options`);
                if (alternateTarget) alternateTarget.classList.add(activeClass);
            }

            // 4. Optional Callback
            if (onTabChange) onTabChange(targetId);
        });
    });
}