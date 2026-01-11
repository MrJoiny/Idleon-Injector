import van from '../../van-1.6.0.js';
import * as API from '../../api.js';

const { div, iframe, button } = van.tags;

export const DevTools = () => {
    // Local state for URL loading
    const url = van.state("");
    const error = van.state("");
    const isEmbedded = window.parent !== window;
    const headlineStyle = 'font-size: 24px; margin-bottom: 20px;';
    const webUiUrl = `http://localhost:${window.location.port || '8080'}`;

    const load = async () => {
        try {
            if (!isEmbedded) {
                url.val = await API.fetchDevToolsUrl();
            }
        } catch (e) {
            error.val = e.message;
        }
    };
    load();

    const openDevTools = async () => {
        try {
            const devtoolsUrl = await API.fetchDevToolsUrl();
            await API.openExternalUrl(devtoolsUrl);
        } catch (e) {
            error.val = `Failed to open ChromeDebug: ${e.message}`;
        }
    };

    const openWebUi = async () => {
        try {
            await API.openExternalUrl(webUiUrl);
        } catch (e) {
            error.val = `Failed to open Web UI: ${e.message}`;
        }
    };

    return div({ id: 'devtools-tab', class: 'tab-pane' },
        div({ class: 'terminal-wrapper' },
            () => {
                // prevent showing iframe -> crashes the ingame webui
                if (isEmbedded) {
                    return div({ class: 'danger-zone-header' }, [
                        div({ style: headlineStyle }, '⚠ DEVTOOLS POP-OUT'),
                        div(
                            'Embedded DevTools is disabled inside the game UI ' +
                            'to prevent crashes.'
                        ),
                        div('Use the pop-out window for full DevTools access.'),
                        div(button({
                            class: 'quick-access-btn',
                            style: 'margin-top: 20px;',
                            onclick: openWebUi
                        }, 'Open Web UI')),
                        div(button({
                            class: 'quick-access-btn',
                            style: 'margin-top: 10px;',
                            onclick: openDevTools
                        }, 'Open ChromeDebug')),
                        error.val
                            ? div(
                                {
                                    style: 'color:var(--c-danger); margin-top: 10px;'
                                },
                                error.val
                            )
                            : null
                    ]);
                }

                if (error.val) {
                    return div(
                        {
                            id: 'devtools-message',
                            style: 'color:var(--c-danger)'
                        },
                        `Failed to load DevTools: ${error.val}`
                    );
                }

                if (!url.val) {
                    return div({ id: 'devtools-message' }, 'ESTABLISHING UPLINK...');
                }

                return iframe({
                    id: 'devtools-iframe',
                    src: url.val,
                    style: 'width:100%; height:100%; border:none; background:#fff;'
                });
            }
        )
    );
};
