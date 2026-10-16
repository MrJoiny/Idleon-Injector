import van from "../../../vendor/van-1.6.0.js";
import { OrionTab } from "./w1/OrionTab.js";
import { PoppyTab } from "./w2/PoppyTab.js";
import { BubbaTab } from "./BubbaTab.js";
import { renderLazyPanes, renderTabNav } from "./tabShared.js";

const { div } = van.tags;
const TABS = [
    { id: "orion", label: "ORION", component: OrionTab },
    { id: "poppy", label: "POPPY", component: PoppyTab },
    { id: "bubba", label: "BUBBA", component: BubbaTab },
];

export const ClickerTab = () => {
    const active = van.state(TABS[0].id);
    return div(
        { class: "world-tab" },
        renderTabNav({
            tabs: TABS,
            activeId: active,
            navClass: "world-sub-nav",
            buttonClass: "account-world-sub-tab-btn",
        }),
        div(
            { class: "world-sub-content" },
            ...renderLazyPanes({
                tabs: TABS,
                activeId: active,
                paneClass: "world-sub-pane",
                dataAttr: "data-subtab",
                renderContent: (tab) => tab.component(),
            })
        )
    );
};
