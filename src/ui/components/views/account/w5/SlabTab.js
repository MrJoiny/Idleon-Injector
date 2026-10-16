import { ItemRegistrationTab } from "./ItemRegistrationTab.js";

export const SlabTab = () =>
    ItemRegistrationTab({
        label: "Slab",
        historyPath: "Cards[1]",
        description:
            "Edit Slab registration history. Owned items may register again during W5 town sync. The game refreshes bonuses during normal recalculation.",
    });
