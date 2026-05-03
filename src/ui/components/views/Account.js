/**
 * Account View
 * Top-level container for Account tabs.
 * Tab 1: Account Options (raw OptionsListAccount editor)
 * Tabs 2–8: World-specific data editors (W1–W7)
 *
 * Follows the same sub-tab pattern as Config.js.
 * Each tab lives in src/ui/components/views/account/ for easy scalability.
 */

import van from "../../vendor/van-1.6.0.js";
import { AccountOptionsTab } from "./account/AccountOptionsTab.js";
import { TasksTab } from "./account/TasksTab.js";
import { UpgradeVaultTab } from "./account/UpgradeVaultTab.js";
import { W1Tab } from "./account/W1Tab.js";
import { W2Tab } from "./account/W2Tab.js";
import { W3Tab } from "./account/W3Tab.js";
import { W4Tab } from "./account/W4Tab.js";
import { W5Tab } from "./account/W5Tab.js";
import { W6Tab } from "./account/W6Tab.js";
import { W7Tab } from "./account/W7Tab.js";
import { renderLazyPanes, renderTabNav } from "./account/tabShared.js";

const { div, span } = van.tags;

/**
 * Tab definitions.
 * To add a new tab: push an entry here and create its component in ./account/.
 */
const ACCOUNT_TABS = [
    { id: "account-options", label: "ACCOUNT OPTIONS", isWorld: false, component: AccountOptionsTab },
    { id: "upgrade-vault", label: "UPGRADE VAULT", isWorld: false, component: UpgradeVaultTab },
    { id: "tasks", label: "TASKS", isWorld: false, component: TasksTab },
    { id: "w1", label: "BLUNDER HILLS", isWorld: true, worldNum: 1, component: W1Tab },
    { id: "w2", label: "YUM-YUM DESERT", isWorld: true, worldNum: 2, component: W2Tab },
    { id: "w3", label: "FROSTBITE TUNDRA", isWorld: true, worldNum: 3, component: W3Tab },
    { id: "w4", label: "HYPERION NEBULA", isWorld: true, worldNum: 4, component: W4Tab },
    { id: "w5", label: "SMOLDERIN' PLAT.", isWorld: true, worldNum: 5, component: W5Tab },
    { id: "w6", label: "SPIRITED VALLEY", isWorld: true, worldNum: 6, component: W6Tab },
    { id: "w7", label: "EQUINOX VALLEY", isWorld: true, worldNum: 7, component: W7Tab },
];

export const Account = () => {
    const activeTab = van.state(ACCOUNT_TABS[0].id);

    return div(
        { id: "options-account-tab", class: "tab-pane account-tab-layout" },

        // Sub-navigation
        renderTabNav({
            tabs: ACCOUNT_TABS,
            activeId: activeTab,
            navClass: "account-sub-nav",
            buttonClass: (tab) =>
                `account-top-tab-btn ${tab.isWorld ? `world-tab-btn w${tab.worldNum}-world-tab` : "account-options-btn"}`,
            renderLabel: (tab) => (tab.isWorld ? span({ class: "world-tab-btn-num" }, `W${tab.worldNum}`) : tab.label),
            getButtonProps: (tab) => ({ title: tab.label }),
        }),

        // Tab panes — lazy-mount: component is created (and its data fetched)
        // only when the user first activates that tab. The div stays in the DOM
        // so CSS visibility toggling keeps state alive after mount.
        div(
            { class: "account-sub-tab-content" },
            ...renderLazyPanes({
                tabs: ACCOUNT_TABS,
                activeId: activeTab,
                paneClass: "account-sub-tab-pane",
                dataAttr: "data-tab",
                renderContent: (tab) => tab.component(),
            })
        )
    );
};
