import van from '../../van-1.6.0.js';
import * as API from '../../api.js';

const { div, iframe } = van.tags;

export const DevTools = () => {
    // Local state for URL loading
    const url = van.state("");
    const error = van.state("");
    const isElectron = /electron/i.test(navigator.userAgent);

    const load = async () => {
        try {
            if (!isElectron) url.val = await API.fetchDevToolsUrl();
        } catch (e) {
            error.val = e.message;
        }
    };
    load();

    return div({ id: 'devtools-tab', class: 'tab-pane' },
        div({ class: 'terminal-wrapper' },
            () => {
                // prevent showing iframe -> crashes the ingame webui
                if (isElectron && window.parent !== window) {
                    return div({ class: 'danger-zone-header' }, [
                        div({ style: 'font-size: 24px; margin-bottom: 20px;' }, "⚠ ELECTRON DETECTED"),
                        div("Nested DevTools is disabled within the game screen to prevent stability issues."),
                        div({ style: 'margin-top: 15px; opacity: 0.8; font-size: 0.9em;' },
                            `Please use the external browser UI ( http://localhost:${window.location.port || '8080'} ) for full DevTools access.`
                        )
                    ]);
                }

                if (error.val) return div({ id: 'devtools-message', style: 'color:var(--c-danger)' }, `Failed to load DevTools: ${error.val}`);
                if (!url.val) return div({ id: 'devtools-message' }, "ESTABLISHING UPLINK...");

                return iframe({
                    id: 'devtools-iframe',
                    src: url.val,
                    style: 'width:100%; height:100%; border:none; background:#fff;'
                });
            }
        )
    );
};