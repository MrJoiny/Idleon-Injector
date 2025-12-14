import { fetchDevToolsUrl } from './api.js';

const DOM = {
    iframe: document.getElementById('devtools-iframe'),
    message: document.getElementById('devtools-message')
};

let loaded = false;

export async function initDevTools() {
    if (loaded || !DOM.iframe) return;

    DOM.message.textContent = 'Loading DevTools URL...';
    DOM.message.style.color = '';

    try {
        const url = await fetchDevToolsUrl();
        // Since fetchDevToolsUrl throws if URL is missing, we can assume success here
        DOM.iframe.src = url;
        loaded = true;
        DOM.message.textContent = 'Note: Only use this if you really know what you are doing!';
    } catch (error) {
        console.error('DevTools Load Error:', error);
        DOM.message.textContent = `Failed to load DevTools URL: ${error.message}`;
        DOM.message.style.color = 'var(--error, red)';
    }
}