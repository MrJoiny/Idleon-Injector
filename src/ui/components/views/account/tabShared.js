import van from "../../../vendor/van-1.6.0.js";
import { joinClasses, toNodes } from "./accountShared.js";

const { div, button } = van.tags;

/**
 * Render a shared account-workspace tab navigation row.
 * @param {object} props - Navigation options
 * @param {object[]} props.tabs - Tabs to render
 * @param {object} props.activeId - VanJS state containing the active tab ID
 * @param {string} props.navClass - Additional navigation class
 * @param {string|Function} props.buttonClass - Additional button class or class resolver
 * @param {string} [props.activeClass] - Class applied to the active tab
 * @param {Function} [props.renderLabel] - Tab-label renderer
 * @param {Function|null} [props.getButtonProps] - Additional button-props resolver
 * @param {Function|null} [props.onSelect] - Callback invoked after a tab is selected
 * @returns {Element} Account tab navigation element
 */
export const renderTabNav = ({
    tabs,
    activeId,
    navClass,
    buttonClass,
    activeClass = "active",
    renderLabel = (tab) => tab.label,
    getButtonProps = null,
    onSelect = null,
}) =>
    div(
        { class: joinClasses("account-sub-nav", navClass) },
        ...tabs.map((tab) =>
            button(
                {
                    ...(typeof getButtonProps === "function" ? getButtonProps(tab) : {}),
                    // class and onclick are owned by renderTabNav so active-state wiring stays consistent.
                    class: () =>
                        joinClasses(
                            "account-sub-tab-btn",
                            typeof buttonClass === "function" ? buttonClass(tab) : buttonClass,
                            activeId.val === tab.id && activeClass
                        ),
                    "aria-current": () => (activeId.val === tab.id ? "page" : "false"),
                    onclick: () => {
                        activeId.val = tab.id;
                        if (typeof onSelect === "function") onSelect(tab);
                    },
                },
                renderLabel(tab)
            )
        )
    );

export const renderLazyPanes = ({
    tabs,
    activeId,
    paneClass,
    activeClass = "active",
    dataAttr = "data-tab",
    renderContent,
}) =>
    tabs.map((tab) => {
        const pane = div({
            class: () => joinClasses(paneClass, activeId.val === tab.id && activeClass),
            [dataAttr]: tab.id,
        });

        let mounted = false;
        van.derive(() => {
            if (activeId.val !== tab.id || mounted) return;
            mounted = true;
            const content = renderContent(tab);
            if (content) van.add(pane, content);
        });

        return pane;
    });

const createTabbedPage =
    ({ tabs, rootClass, navClass, buttonClass, contentClass, paneClass, activeClass = "active", dataAttr }) =>
    () => {
        const activeId = van.state(tabs[0].id);

        return div(
            { class: rootClass },
            renderTabNav({ tabs, activeId, navClass, buttonClass }),
            div(
                { class: contentClass },
                ...renderLazyPanes({
                    tabs,
                    activeId,
                    paneClass,
                    activeClass,
                    dataAttr,
                    renderContent: (tab) => tab.component(),
                })
            )
        );
    };

/**
 * Create a lazily mounted world-level tab component.
 * @param {object[]} tabs - Tab definitions with component functions
 * @param {string} worldClass - World-specific root class
 * @returns {Function} VanJS component function
 */
export const createWorldTab = (tabs, worldClass) =>
    createTabbedPage({
        tabs,
        rootClass: joinClasses("world-tab", worldClass),
        navClass: "world-sub-nav",
        buttonClass: "account-world-sub-tab-btn",
        contentClass: "world-sub-content",
        paneClass: "world-sub-pane",
        dataAttr: "data-subtab",
    });

/**
 * Create a lazily mounted nested account tab component.
 * @param {object[]} tabs - Tab definitions with component functions
 * @param {string} rootClass - Feature-specific root class
 * @param {string} dataAttr - Pane data attribute
 * @returns {Function} VanJS component function
 */
export const createNestedTab = (tabs, rootClass, dataAttr) =>
    createTabbedPage({
        tabs,
        rootClass: joinClasses("tab-container", rootClass),
        navClass: "account-nested-sub-nav",
        buttonClass: "account-nested-sub-tab-btn",
        contentClass: "account-nested-sub-content",
        paneClass: "account-nested-pane",
        activeClass: "account-nested-pane--active",
        dataAttr,
    });

/**
 * Render all pane bodies immediately and keep them mounted.
 * `renderContent` is called eagerly for every tab when the parent mounts.
 */
export const renderPersistentPagePanes = ({
    tabs,
    activeId,
    paneClass = "account-page-pane",
    hiddenClass = "account-page-pane--hidden",
    dataAttr = "data-tab",
    renderContent = null,
}) =>
    tabs.map((tab, index) =>
        div(
            {
                class: () => joinClasses(paneClass, activeId.val !== tab.id && hiddenClass),
                [dataAttr]: tab.id,
            },
            ...toNodes(typeof renderContent === "function" ? renderContent(tab, index) : null)
        )
    );
