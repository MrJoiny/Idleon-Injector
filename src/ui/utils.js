/**
 * Shared UI Utilities
 * Common functions used across multiple UI files
 */

/**
 * Display a status message to the user
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message (red) or success (green)
 */
function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-message');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.className = isError ? 'status-error' : 'status-success';
    statusDiv.style.display = 'block'; // Show the message

    setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = '';
        statusDiv.style.display = 'none'; // Hide when cleared
    }, 5000);
}

/**
 * Debounce a function call
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
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

// Export for Node.js environment (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { showStatus, debounce };
}
