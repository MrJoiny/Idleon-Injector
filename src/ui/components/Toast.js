import van from '../van-1.6.0.js';
import store from '../store.js';

const { div } = van.tags;

export const Toast = () => {
    const isVisible = van.state(false);
    const isFading = van.state(false);

    let currentTimeout = null;

    van.derive(() => {
        const toast = store.app.toast;
        if (!toast.message) return;

        if (currentTimeout) clearTimeout(currentTimeout);
        isVisible.val = true;
        isFading.val = false;

        currentTimeout = setTimeout(() => {
            isFading.val = true;

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