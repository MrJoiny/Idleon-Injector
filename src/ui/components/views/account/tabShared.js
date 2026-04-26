import van from "../../../vendor/van-1.6.0.js";
import { Icons } from "../../../assets/icons.js";
import { joinClasses, toNodes } from "./accountShared.js";

const { div, button, span, p } = van.tags;

export const createComingSoonPlaceholder = (label) =>
    div(
        { class: "world-sub-placeholder" },
        span({ class: "world-sub-placeholder__icon" }, Icons.Wrench()),
        p({ class: "world-sub-placeholder__label" }, `${label} — COMING SOON`)
    );

export const renderTabNav = ({
    tabs,
    activeId,
    navClass,
    buttonClass,
    activeClass = "active",
    stubClass = null,
    isStub = () => false,
    renderLabel = (tab) => tab.label,
    getButtonProps = null,
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
                            activeId.val === tab.id && activeClass,
                            stubClass && isStub(tab) && stubClass
                        ),
                    onclick: () => (activeId.val = tab.id),
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

export const createWorldComingSoonTab =
    ({ worldClass, worldKey }) =>
    () => {
        const tabs = [{ id: "coming-soon", label: "COMING SOON" }];
        const activeSubTab = van.state(tabs[0].id);

        return div(
            { class: joinClasses("world-tab", worldClass) },
            renderTabNav({
                tabs,
                activeId: activeSubTab,
                navClass: "world-sub-nav",
                buttonClass: "account-world-sub-tab-btn",
                stubClass: "account-world-sub-tab-btn--stub",
                isStub: () => true,
            }),
            div(
                { class: "world-sub-content" },
                div(
                    { class: "world-sub-pane active world-sub-pane--empty" },
                    span({ class: "world-empty-icon" }, Icons.Wrench()),
                    p({ class: "world-empty-label" }, `${worldKey} SYSTEMS COMING SOON`),
                    p(
                        { class: "world-empty-desc" },
                        `Follow the W1Tab pattern to add sub-tabs for each ${worldKey} system.`
                    )
                )
            )
        );
    };
