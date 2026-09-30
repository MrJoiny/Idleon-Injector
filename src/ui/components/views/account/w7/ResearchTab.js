import { GridTab } from "./GridTab.js";
import { ObservationsTab } from "./ObservationsTab.js";
import { createNestedTab } from "../tabShared.js";

const RESEARCH_SUBTABS = [
    { id: "grid", label: "GRID", component: GridTab },
    { id: "observations", label: "OBSERVATIONS", component: ObservationsTab },
];

export const ResearchTab = createNestedTab(RESEARCH_SUBTABS, "", "data-research");
