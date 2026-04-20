import van from "../../../vendor/van-1.6.0.js";
import { Icons } from "../../../assets/icons.js";
import { joinClasses } from "./featureShared.js";

const { div, button, span, h2, p } = van.tags;

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
        { class: joinClasses("feature-sub-nav", navClass) },
        ...tabs.map((tab) =>
            button(
                {
                    ...(typeof getButtonProps === "function" ? getButtonProps(tab) : {}),
                    class: () =>
                        joinClasses(
                            "feature-sub-tab-btn",
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

export const renderWorldHeader = ({ badge, title, subtitle }) =>
    div(
        { class: "world-tab-header" },
        span({ class: "world-tab-badge" }, badge),
        div(
            { class: "world-tab-title-group" },
            h2({ class: "world-tab-title" }, title),
            p({ class: "world-tab-subtitle" }, subtitle)
        )
    );

export const createWorldComingSoonTab =
    ({ worldClass, badge, title, subtitle, worldKey }) =>
    () => {
        const tabs = [{ id: "coming-soon", label: "COMING SOON" }];
        const activeSubTab = van.state(tabs[0].id);

        return div(
            { class: joinClasses("world-tab", worldClass) },
            renderWorldHeader({ badge, title, subtitle }),
            renderTabNav({
                tabs,
                activeId: activeSubTab,
                navClass: "world-sub-nav",
                buttonClass: "world-sub-tab-btn",
                stubClass: "world-sub-tab-btn--stub",
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
