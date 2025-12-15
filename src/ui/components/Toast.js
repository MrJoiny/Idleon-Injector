import van from '../van-1.6.0.js';
import store from '../store.js';

const { div } = van.tags;

export const Toast = () => {
    // Local state for visibility and animation classes
    // We default to 'display: none' via style or class
    const isVisible = van.state(false);
    const isFading = van.state(false);

    let currentTimeout = null;

    // We subscribe to the global store's toast object
    // When the 'id' changes, it means a new message was sent
    van.derive(() => {
        const toast = store.toast.val;
        if (!toast.message) return; // Ignore initial empty state

        // Reset Logic
        if (currentTimeout) clearTimeout(currentTimeout);
        isVisible.val = true;
        isFading.val = false;

        // Start Timer to Fade Out (5 seconds)
        currentTimeout = setTimeout(() => {
            isFading.val = true;

            // Start Timer to Hide completely (matches CSS transition time ~300ms)
            setTimeout(() => {
                isVisible.val = false;
                isFading.val = false;
            }, 300);
        }, 5000);
    });

    return div(
        {
            id: 'status-message', // Keeping ID to match style.css rules exactly
            class: () => {
                const typeClass = store.toast.val.type === 'error' ? 'status-error' : 'status-success';
                const fadeClass = isFading.val ? 'fade-out' : '';
                return `${typeClass} ${fadeClass}`;
            },
            style: () => isVisible.val ? 'display: block;' : 'display: none;'
        },
        () => store.toast.val.message
    );
};