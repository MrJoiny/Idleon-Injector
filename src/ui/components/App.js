import van from "../vendor/van-1.6.0.js";
import store from "../state/store.js";
import { VIEWS } from "../state/constants.js";

// Components
import { Sidebar, SidebarBackdrop } from "./Sidebar.js";
import { AtlasHeader } from "./AtlasHeader.js";
import { ActivityDrawer } from "./ActivityDrawer.js";
import { invokeWorkspaceSave } from "./WorkspaceContext.js";
import { Toast } from "./Toast.js";
import { TooltipContainer } from "./Tooltip.js";
import { UpdateModal } from "./UpdateModal.js";
import { AtlasCheats } from "./views/AtlasCheats.js";
import { Config } from "./views/Config.js";
import { Account } from "./views/Account.js";
import { DevTools } from "./views/DevTools.js";
import { Search } from "./views/Search.js";

const { div, main } = van.tags;

const viewFactories = {
    [VIEWS.CHEATS.id]: AtlasCheats,
    [VIEWS.CONFIG.id]: Config,
    [VIEWS.ACCOUNT.id]: Account,
    [VIEWS.DEVTOOLS.id]: DevTools,
    [VIEWS.SEARCH.id]: Search,
};

export const App = () => {
    store.initHeartbeat();
    store.loadAppInfo();
    store.checkForUpdate();

    // Global Keyboard Shortcuts
    document.addEventListener("keydown", (e) => {
        const activeElement = document.activeElement;
        const isInputFocused =
            ["INPUT", "TEXTAREA", "SELECT"].includes(activeElement?.tagName) || activeElement?.isContentEditable;

        if (e.key === "Escape") {
            store.closeMobileSidebar();
            store.closeActivityDrawer();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            invokeWorkspaceSave(store.app.activeTab);
            return;
        }

        if (isInputFocused) return;

        if (e.key === "1") store.setActiveTab(VIEWS.CHEATS.id);
        if (e.key === "2") store.setActiveTab(VIEWS.ACCOUNT.id);
        if (e.key === "3") store.setActiveTab(VIEWS.CONFIG.id);
        if (e.key === "4") store.setActiveTab(VIEWS.SEARCH.id);
        if (e.key === "5") store.setActiveTab(VIEWS.DEVTOOLS.id);

        if (e.key === "/") {
            e.preventDefault();
            const searchInput = document.querySelector(".tab-pane.active .global-search-input");
            searchInput?.focus();
        }
    });

    const viewInstances = {};
    const tabContent = div({ id: "tab-content" });

    van.derive(() => {
        const activeId = store.app.activeTab;
        const isCheatsTab = activeId === VIEWS.CHEATS.id;

        if (!isCheatsTab && store.app.configDrawerOpen) {
            store.closeConfigDrawer();
        }

        const isDrawerVisible = isCheatsTab && store.app.configDrawerOpen;
        const visibleViewIds = new Set([activeId]);
        if (isDrawerVisible) visibleViewIds.add(VIEWS.CONFIG.id);

        visibleViewIds.forEach((viewId) => {
            if (!viewInstances[viewId] && viewFactories[viewId]) {
                const instance = viewFactories[viewId]();
                viewInstances[viewId] = instance;
                van.add(tabContent, instance);
            }
        });

        Object.entries(viewInstances).forEach(([id, domNode]) => {
            const isConfigDrawerNode = id === VIEWS.CONFIG.id && isDrawerVisible;
            const isActiveNode = visibleViewIds.has(id);

            domNode.classList.toggle("active", isActiveNode);
            domNode.classList.toggle("drawer-open", isConfigDrawerNode);

            domNode.classList.toggle("drawer-host-open", id === VIEWS.CHEATS.id && isDrawerVisible);
        });
    });

    return div(
        { class: "app-layout" },
        AtlasHeader(),
        div(
            { class: "atlas-body" },
            Sidebar(),
            main({ class: "viewport atlas-canvas" }, tabContent, ActivityDrawer()),
            SidebarBackdrop()
        ),
        Toast(),
        UpdateModal(),
        TooltipContainer()
    );
};
