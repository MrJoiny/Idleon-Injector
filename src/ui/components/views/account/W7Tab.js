import { BigFishTab } from "./w7/BigFishTab.js";
import { ButtonTab } from "./w7/ButtonTab.js";
import { ClamTab } from "./w7/ClamTab.js";
import { CoralTab } from "./w7/CoralTab.js";
import { GalleryTab } from "./w7/GalleryTab.js";
import { GlimboTab } from "./w7/GlimboTab.js";
import { LegendTalentTab } from "./w7/LegendTalentTab.js";
import { MineheadTab } from "./w7/MineheadTab.js";
import { ResearchTab } from "./w7/ResearchTab.js";
import { SpelunkingTab } from "./w7/SpelunkingTab.js";
import { SushiTab } from "./w7/SushiTab.js";
import { ZenithTab } from "./w7/ZenithTab.js";
import { createWorldTab } from "./tabShared.js";

const W7_SUBTABS = [
    { id: "spelunking", label: "SPELUNKING", component: SpelunkingTab },
    { id: "research", label: "RESEARCH", component: ResearchTab },
    { id: "gallery", label: "GALLERY", component: GalleryTab },
    { id: "legend-talent", label: "LEGEND TALENT", component: LegendTalentTab },
    { id: "coral", label: "CORAL", component: CoralTab },
    { id: "zenith", label: "ZENITH", component: ZenithTab },
    { id: "clam", label: "CLAM", component: ClamTab },
    { id: "big-fish", label: "BIG FISH", component: BigFishTab },
    { id: "minehead", label: "MINEHEAD", component: MineheadTab },
    { id: "glimbo", label: "GLIMBO", component: GlimboTab },
    { id: "button", label: "BUTTON", component: ButtonTab },
    { id: "sushi", label: "SUSHI", component: SushiTab },
];

export const W7Tab = createWorldTab(W7_SUBTABS, "w7-world-tab");
