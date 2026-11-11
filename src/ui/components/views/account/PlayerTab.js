import van from "../../../vendor/van-1.6.0.js";
import { renderTabNav } from "./tabShared.js";
import { LevelsTab } from "./player/LevelsTab.js";
import { AttireRackTab } from "./AttireRackTab.js";
const { div } = van.tags;
const tabs = [
    { id: "levels", label: "LEVELS & MONEY" },
    { id: "attire-rack", label: "ATTIRE RACK" },
];
export const PlayerTab = () => {
    const active = van.state("levels");
    return div(
        { class: "tab-container" },
        renderTabNav({ tabs, activeId: active, navClass: "world-sub-nav", buttonClass: "account-world-sub-tab-btn" }),
        () => (active.val === "attire-rack" ? AttireRackTab() : LevelsTab())
    );
};
