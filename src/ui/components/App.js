import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { VIEWS } from "../state/constants.js";

// Components
import { Sidebar } from "./Sidebar.js";
import { Toast } from "./Toast.js";
import { TooltipContainer } from "./Tooltip.js";
import { Cheats } from "./views/Cheats.js";
import { Config } from "./views/Config.js";
import { Account } from "./views/Account.js";
import { DevTools } from "./views/DevTools.js";

const { div, main, header, h2 } = van.tags;

const viewFactories = {
    [VIEWS.CHEATS.id]: Cheats,
    [VIEWS.CONFIG.id]: Config,
    [VIEWS.ACCOUNT.id]: Account,
    [VIEWS.DEVTOOLS.id]: DevTools,
};

const viewLabels = Object.values(VIEWS).reduce((acc, v) => {
    acc[v.id] = v.label;
    return acc;
}, {});

export const App = () => {
    store.initHeartbeat();

    // Global Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
        const isInputFocused = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);

        if (isInputFocused) return;

        if (e.key === "1") store.app.activeTab = VIEWS.CHEATS.id;
        if (e.key === "2") store.app.activeTab = VIEWS.ACCOUNT.id;
        if (e.key === "3") store.app.activeTab = VIEWS.CONFIG.id;
        if (e.key === "4") store.app.activeTab = VIEWS.DEVTOOLS.id;

        if (e.key === "/") {
            e.preventDefault();
            const searchInput = document.querySelector(".tab-pane.active .global-search-input");
            searchInput?.focus();
        }

        if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            if (store.app.activeTab === VIEWS.CONFIG.id) {
                document.getElementById("save-config-button")?.click();
            }
        }
    });

    const viewInstances = {};
    const tabContent = div({ id: "tab-content" });

    van.derive(() => {
        const activeId = store.app.activeTab;

        if (!viewInstances[activeId] && viewFactories[activeId]) {
            const instance = viewFactories[activeId]();
            viewInstances[activeId] = instance;
            van.add(tabContent, instance);
        }

        Object.entries(viewInstances).forEach(([id, domNode]) => {
            if (id === activeId) {
                domNode.classList.add("active");
            } else {
                domNode.classList.remove("active");
            }
        });
    });

    return div(
        { class: "app-layout" },
        Sidebar(),
        main(
            { class: "viewport" },
            header(
                { class: "viewport-header" },
                h2({ id: "active-view-title" }, () => viewLabels[store.app.activeTab] || "MODULE")
            ),
            tabContent
        ),
        Toast(),
        TooltipContainer()
    );
};
