import van from '../van-1.6.0.js';
import store from '../store.js';
import { VIEWS, IS_ELECTRON } from '../constants.js';
import { Icons } from '../icons.js';
import { withTooltip } from './Tooltip.js';

// Standard HTML Tags
const { nav, div, button, span, a } = van.tags;

const ActiveCheatList = () => {
    return div({ class: 'active-cheats' },
        div({ class: 'active-cheats-header' }, 'ACTIVE CHEATS'),
        () => {
            const activeCheats = store.getActiveCheats();

            if (activeCheats.length === 0) {
                return div({ class: 'active-cheats-list' },
                    span({ class: 'no-active-cheats' }, 'None')
                );
            }

            return div({ class: 'active-cheats-list' },
                ...activeCheats.map(cheat =>
                    span({
                        class: 'active-cheat-item',
                        onclick: () => store.executeCheat(cheat, cheat)
                    },
                        span({ class: 'active-cheat-text' }, cheat)
                    )
                )
            );
        }
    );
};

export const Sidebar = () => {
    // Load cheat states on initial mount
    store.loadCheatStates();

    // VanX: Accessing property registers dependency. No .val needed.
    const NavBtn = (viewConfig, Icon) => withTooltip(
        button({
            class: () => `tab-button ${store.app.activeTab === viewConfig.id ? 'active' : ''}`,
            onclick: () => store.app.activeTab = viewConfig.id
        },
            Icon(),
            span({
                class: 'tab-label'
            }, viewConfig.sidebarLabel)
        ),
        viewConfig.sidebarLabel,
        'right',
        () => store.app.sidebarCollapsed
    );

    return nav({
        class: () => `sidebar ${store.app.sidebarCollapsed ? 'sidebar-collapsed' : ''}`
    },
        div({ class: 'brand' },
            div({ class: 'brand-logo' }, Icons.Logo()),
            div({
                class: 'brand-text'
            },
                span("IDLEON"),
                span({ class: 'highlight' }, "INJECTOR")
            )
        ),
        div({ class: 'nav-menu' },
            NavBtn(VIEWS.CHEATS, Icons.Cheats),
            NavBtn(VIEWS.ACCOUNT, Icons.Account),
            NavBtn(VIEWS.CONFIG, Icons.Config),
            NavBtn(VIEWS.DEVTOOLS, Icons.DevTools),
            withTooltip(
                a({
                    class: 'tab-button github-link',
                    href: 'https://github.com/MrJoiny/Idleon-Injector',
                    target: '_blank',
                    onclick: (e) => {
                        if (IS_ELECTRON) {
                            e.preventDefault();
                            store.openExternalUrl('https://github.com/MrJoiny/Idleon-Injector');
                        }
                    }
                },
                    Icons.GitHub(),
                    span({
                        class: 'tab-label'
                    }, 'GitHub')
                ),
                'Official GitHub Repository',
                'right',
                () => store.app.sidebarCollapsed
            )
        ),
        // ActiveCheatList with proper flex container - transitioned via CSS
        ActiveCheatList(),
        div({ class: 'system-status' },
            div({
                class: 'status-dot',
                style: () => {
                    const online = IS_ELECTRON || store.app.heartbeat;
                    const color = online ? 'var(--c-success)' : 'var(--c-danger)';
                    return `background:${color}; box-shadow:0 0 6px ${color}; animation:${online ? 'pulse 2s infinite' : 'none'}`;
                }
            }),
            span({
                id: 'system-status-text',
                style: () => {
                    const online = IS_ELECTRON || store.app.heartbeat;
                    return `color: ${online ? 'var(--c-success)' : 'var(--c-danger)'};`;
                }
            }, () => (IS_ELECTRON || store.app.heartbeat) ? "SYSTEM ONLINE" : "CONNECTION LOST")
        ),
        withTooltip(
            button({
                class: 'sidebar-toggle',
                onclick: () => store.toggleSidebar()
            }, () => store.app.sidebarCollapsed ? Icons.ChevronRight() : Icons.ChevronLeft()),
            () => store.app.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar',
            'right'
        )
    );
};
