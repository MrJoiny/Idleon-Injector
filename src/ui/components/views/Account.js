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
import { UpgradeVaultTab } from "./account/UpgradeVaultTab.js";
import { W1Tab } from "./account/W1Tab.js";
import { W2Tab } from "./account/W2Tab.js";
import { W3Tab } from "./account/W3Tab.js";
import { W4Tab } from "./account/W4Tab.js";
import { W5Tab } from "./account/W5Tab.js";
import { W6Tab } from "./account/W6Tab.js";
import { W7Tab } from "./account/W7Tab.js";

const { div, button, span } = van.tags;

/**
 * Tab definitions.
 * To add a new tab: push an entry here and create its component in ./account/.
 */
const ACCOUNT_TABS = [
    { id: "account-options", label: "ACCOUNT OPTIONS", isWorld: false, component: AccountOptionsTab },
    { id: "upgrade-vault",   label: "UPGRADE VAULT",   isWorld: false, component: UpgradeVaultTab },
    { id: "w1",              label: "BLUNDER HILLS",   isWorld: true,  worldNum: 1, component: W1Tab },
    { id: "w2",              label: "YUM-YUM DESERT",  isWorld: true,  worldNum: 2, component: W2Tab },
    { id: "w3",              label: "FROSTBITE TUNDRA",isWorld: true,  worldNum: 3, component: W3Tab },
    { id: "w4",              label: "HYPERION NEBULA", isWorld: true,  worldNum: 4, component: W4Tab },
    { id: "w5",              label: "SMOLDERIN' PLAT.", isWorld: true, worldNum: 5, component: W5Tab },
    { id: "w6",              label: "SPIRITED VALLEY", isWorld: true,  worldNum: 6, component: W6Tab },
    { id: "w7",              label: "EQUINOX VALLEY",  isWorld: true,  worldNum: 7, component: W7Tab },
];

/** Cache lazily-instantiated tab components so they aren't re-mounted on every switch. */
const tabCache = new Map();

const getTabComponent = (tab) => {
    if (!tabCache.has(tab.id)) {
        tabCache.set(tab.id, tab.component());
    }
    return tabCache.get(tab.id);
};

export const Account = () => {
    const activeTab = van.state(ACCOUNT_TABS[0].id);

    return div(
        { id: "options-account-tab", class: "tab-pane account-tab-layout" },

        // Sub-navigation
        div(
            { class: "account-sub-nav" },
            ...ACCOUNT_TABS.map((tab) =>
                button(
                    {
                        class: () =>
                            `account-sub-tab-button ${activeTab.val === tab.id ? "active" : ""} ${
                                tab.isWorld ? `world-tab-btn world-${tab.worldNum}` : "account-options-btn"
                            }`,
                        onclick: () => (activeTab.val = tab.id),
                        title: tab.label,
                    },
                    tab.isWorld
                        ? [span({ class: "world-tab-btn-num" }, `W${tab.worldNum}`), span({ class: "world-tab-btn-label" }, tab.label)]
                        : tab.label
                )
            )
        ),

        // Tab panes - all rendered but only active is visible (keeps state alive)
        div(
            { class: "account-sub-tab-content" },
            ...ACCOUNT_TABS.map((tab) =>
                div(
                    {
                        class: () =>
                            `account-sub-tab-pane ${activeTab.val === tab.id ? "active" : ""}`,
                        "data-tab": tab.id,
                    },
                    getTabComponent(tab)
                )
            )
        )
    );
};
