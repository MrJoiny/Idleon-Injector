import { createNestedTab } from "../tabShared.js";
import { GeneralTab } from "./gaming/GeneralTab.js";
import { ImportsTab } from "./gaming/ImportsTab.js";
import { PaletteHexTab } from "./gaming/PaletteHexTab.js";
import { PaletteTab } from "./gaming/PaletteTab.js";
import { SuperbitsTab } from "./gaming/SuperbitsTab.js";

const GAMING_SUBTABS = [
    { id: "general", label: "GENERAL", component: GeneralTab },
    { id: "imports", label: "IMPORTS", component: ImportsTab },
    { id: "superbits", label: "SUPERBITS", component: SuperbitsTab },
    { id: "palette", label: "PALETTE", component: PaletteTab },
    { id: "palette-hex", label: "PALETTE HEX", component: PaletteHexTab },
];

export const GamingTab = createNestedTab(GAMING_SUBTABS, "gaming-tab", "data-gaming");
