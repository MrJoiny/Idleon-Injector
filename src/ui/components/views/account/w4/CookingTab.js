import { createNestedTab } from "../tabShared.js";
import { MasteryTab } from "./cooking/MasteryTab.js";
import { MealsTab } from "./cooking/MealsTab.js";
import { SpicesTab } from "./cooking/SpicesTab.js";
import { TablesTab } from "./cooking/TablesTab.js";

const COOKING_SUBTABS = [
    { id: "tables", label: "TABLES", component: TablesTab },
    { id: "meals", label: "MEALS", component: MealsTab },
    { id: "mastery", label: "MASTERY", component: MasteryTab },
    { id: "spices", label: "SPICES", component: SpicesTab },
];

export const CookingTab = createNestedTab(COOKING_SUBTABS, "cooking-tab", "data-cooking");
