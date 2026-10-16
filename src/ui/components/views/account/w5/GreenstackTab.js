import { ItemRegistrationTab } from "./ItemRegistrationTab.js";

export const GreenstackTab = () =>
    ItemRegistrationTab({
        label: "Greenstack",
        historyPath: "GreenStacks",
        description:
            "Edit Greenstack registration history without changing item quantities. The game refreshes bonuses during normal recalculation.",
    });
