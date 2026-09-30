import { createNestedTab } from "../tabShared.js";
import { ChipsTab } from "./lab/ChipsTab.js";
import { JewelsTab } from "./lab/JewelsTab.js";

const LAB_SUBTABS = [
    { id: "chips", label: "CHIPS", component: ChipsTab },
    { id: "jewels", label: "JEWELS", component: JewelsTab },
];

export const LabTab = createNestedTab(LAB_SUBTABS, "lab-tab", "data-lab");
