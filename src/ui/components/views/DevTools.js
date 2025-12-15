import van from '../../van-1.6.0.js';
import * as API from '../../api.js';

const { div, iframe } = van.tags;

export const DevTools = () => {
    const url = van.state("");
    const error = van.state("");

    // Load on mount
    const load = async () => {
        try {
            url.val = await API.fetchDevToolsUrl();
        } catch (e) {
            error.val = e.message;
        }
    };
    load();

    return div({ id: 'devtools-tab', class: 'tab-pane active' },
        div({ class: 'terminal-wrapper' },
            () => {
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