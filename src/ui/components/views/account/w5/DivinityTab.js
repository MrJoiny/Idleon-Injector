import { createNestedTab } from "../tabShared.js";
import { CoralKidTab } from "./divinity/CoralKidTab.js";
import { GodTab } from "./divinity/GodTab.js";

const DIVINITY_SUBTABS = [
    { id: "god", label: "GOD", component: GodTab },
    { id: "coral-kid", label: "CORAL KID", component: CoralKidTab },
];

export const DivinityTab = createNestedTab(DIVINITY_SUBTABS, "divinity-tab", "data-divinity");
