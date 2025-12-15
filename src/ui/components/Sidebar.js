import van from '../van-1.6.0.js';
import store from '../store.js';
import { VIEWS } from '../constants.js';

// Standard HTML Tags
const { nav, div, button, span } = van.tags;

// SVG Tags
const { svg, path, rect, line, circle, polyline } = van.tags("http://www.w3.org/2000/svg");

const Icons = {
    Logo: () => svg({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", class: "icon-logo" }, path({ d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" })),
    Cheats: () => svg({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }, rect({ x: "2", y: "6", width: "20", height: "12", rx: "2" }), path({ d: "M6 12h4m-2-2v4m7-1h.01m3-2h.01" })),
    Account: () => svg({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "aria-hidden": "true" }, rect({ x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" }), line({ x1: "3", y1: "9", x2: "21", y2: "9" }), line({ x1: "9", y1: "21", x2: "9", y2: "9" })),
    Config: () => svg({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "aria-hidden": "true" }, path({ d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }), circle({ cx: "12", cy: "12", r: "3" })),
    DevTools: () => svg({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2", "aria-hidden": "true" }, polyline({ points: "4 17 10 11 4 5" }), line({ x1: "12", y1: "19", x2: "20", y2: "19" }))
};

export const Sidebar = () => {
    // VanX: Accessing property registers dependency. No .val needed.
    const NavBtn = (viewConfig, Icon) => button({
        class: () => `tab-button ${store.app.activeTab === viewConfig.id ? 'active' : ''}`,
        onclick: () => store.app.activeTab = viewConfig.id
    }, Icon(), span(viewConfig.sidebarLabel));

    return nav({ class: 'sidebar' },
        div({ class: 'brand' },
            div({ class: 'brand-logo' }, Icons.Logo()),
            div({ class: 'brand-text' },
                span("IDLEON"),
                span({ class: 'highlight' }, "INJECTOR")
            )
        ),
        div({ class: 'nav-menu' },
            NavBtn(VIEWS.CHEATS, Icons.Cheats),
            NavBtn(VIEWS.ACCOUNT, Icons.Account),
            NavBtn(VIEWS.CONFIG, Icons.Config),
            NavBtn(VIEWS.DEVTOOLS, Icons.DevTools)
        ),
        div({ class: 'system-status' },
            div({
                class: 'status-dot',
                style: () => {
                    const online = store.app.heartbeat;
                    const color = online ? 'var(--c-success)' : 'var(--c-danger)';
                    return `background:${color}; box-shadow:0 0 6px ${color}; animation:${online ? 'pulse 2s infinite' : 'none'}`;
                }
            }),
            span({
                id: 'system-status-text',
                style: () => `color: ${store.app.heartbeat ? 'var(--c-success)' : 'var(--c-danger)'}`
            }, () => store.app.heartbeat ? "SYSTEM ONLINE" : "CONNECTION LOST")
        )
    );
};