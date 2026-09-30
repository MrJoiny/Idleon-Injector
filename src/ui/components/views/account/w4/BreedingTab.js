import { createNestedTab } from "../tabShared.js";
import { GeneralTab } from "./breeding/GeneralTab.js";
import { PetsTab } from "./breeding/PetsTab.js";
import { TerritoryTab } from "./breeding/TerritoryTab.js";

const BREEDING_SUBTABS = [
    { id: "general", label: "GENERAL", component: GeneralTab },
    { id: "pets", label: "PETS", component: PetsTab },
    { id: "territory", label: "TERRITORY", component: TerritoryTab },
];

export const BreedingTab = createNestedTab(BREEDING_SUBTABS, "breeding-tab", "data-breeding");
