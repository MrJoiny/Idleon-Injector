import van from '../van-1.6.0.js';
import store from '../store.js';

const { div } = van.tags;

export const Toast = () => {
    // Local state for visibility and animation classes
    const isVisible = van.state(false);
    const isFading = van.state(false);

    let currentTimeout = null;

    // We subscribe to the global store's toast object
    van.derive(() => {
        const toast = store.app.toast;
        if (!toast.message) return;

        // Reset Logic
        if (currentTimeout) clearTimeout(currentTimeout);
        isVisible.val = true;
        isFading.val = false;

        // Start Timer to Fade Out (5 seconds)
        currentTimeout = setTimeout(() => {
            isFading.val = true;

            // Start Timer to Hide completely
            setTimeout(() => {
                isVisible.val = false;
                isFading.val = false;
            }, 300);
        }, 5000);
    });

    return div(
        {
            id: 'status-message',
            class: () => {
                const typeClass = store.app.toast.type === 'error' ? 'status-error' : 'status-success';
                const fadeClass = isFading.val ? 'fade-out' : '';
                return `${typeClass} ${fadeClass}`;
            },
            style: () => isVisible.val ? 'display: block;' : 'display: none;'
        },
        () => store.app.toast.message
    );
};