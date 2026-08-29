import { MasterclassUpgradeTab } from "./MasterclassUpgradeTab.js";

const TACHYON_FIELDS = [
    { key: "tachyon1", optionIndex: 388, name: "TACHYON 1" },
    { key: "tachyon2", optionIndex: 389, name: "TACHYON 2" },
    { key: "tachyon3", optionIndex: 390, name: "TACHYON 3" },
    { key: "tachyon4", optionIndex: 391, name: "TACHYON 4" },
    { key: "tachyon5", optionIndex: 392, name: "TACHYON 5" },
    { key: "tachyon6", optionIndex: 393, name: "TACHYON 6" },
    { key: "tachyonTotal", optionIndex: 394, name: "TOTAL TACHYON COLLECTED" },
];

export const TesseractTab = () =>
    MasterclassUpgradeTab({
        title: "TESSERACT",
        description: "Manage Arcane Cultist Tesseract upgrades and Tachyons.",
        levelsPath: "Arcane",
        definitionPaths: ["ArcaneUpg"],
        fallbackPrefix: "Tesseract Upgrade",
        currencyTitle: "TACHYONS",
        currencyFields: TACHYON_FIELDS,
    });
