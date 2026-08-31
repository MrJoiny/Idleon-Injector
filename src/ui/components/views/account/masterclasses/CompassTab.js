import { MasterclassUpgradeTab } from "./MasterclassUpgradeTab.js";

const DUST_FIELDS = [
    { key: "stardust", optionIndex: 357, name: "STARDUST" },
    { key: "moondust", optionIndex: 358, name: "MOONDUST" },
    { key: "solardust", optionIndex: 359, name: "SOLARDUST" },
    { key: "cooldust", optionIndex: 360, name: "COOLDUST" },
    { key: "novadust", optionIndex: 361, name: "NOVADUST" },
    { key: "totalDust", optionIndex: 362, name: "TOTAL DUST COLLECTED" },
];

export const CompassTab = () =>
    MasterclassUpgradeTab({
        title: "COMPASS",
        description: "Manage Wind Walker Compass upgrades and Dust.",
        levelsPath: "Compass[0]",
        definitionPaths: ["CompassUpg"],
        fallbackPrefix: "Compass Upgrade",
        currencyTitle: "DUST",
        currencyFields: DUST_FIELDS,
    });
