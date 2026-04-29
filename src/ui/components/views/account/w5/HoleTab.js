import van from "../../../../vendor/van-1.6.0.js";
import { createComingSoonPlaceholder, renderLazyPanes, renderTabNav } from "../tabShared.js";
import { BellTab } from "./hole/BellTab.js";
import { CosmoTab } from "./hole/CosmoTab.js";
import { DawgDenTab } from "./hole/DawgDenTab.js";
import { EngineerTab } from "./hole/EngineerTab.js";
import { FountainTab } from "./hole/FountainTab.js";
import { GambitTab } from "./hole/GambitTab.js";
import { GrottoTab } from "./hole/GrottoTab.js";
import { HarpTab } from "./hole/HarpTab.js";
import { JarTab } from "./hole/JarTab.js";
import { LampTab } from "./hole/LampTab.js";
import { MeasureTab } from "./hole/MeasureTab.js";
import { MonumentTab } from "./hole/MonumentTab.js";
import { OpalsTab } from "./hole/OpalsTab.js";
import { SkillTab } from "./hole/SkillTab.js";
import { StudiesTab } from "./hole/StudiesTab.js";
import { TempleTab } from "./hole/TempleTab.js";
import { VillagersTab } from "./hole/VillagersTab.js";
import { WellTab } from "./hole/WellTab.js";

const { div } = van.tags;

const HOLE_SUBTABS = [
    { id: "opals", label: "OPALS", component: OpalsTab },
    { id: "villagers", label: "VILLAGERS", component: VillagersTab },
    { id: "engineer", label: "ENGINEER", component: EngineerTab },
    { id: "cosmo", label: "COSMO", component: CosmoTab },
    { id: "measure", label: "MEASURE", component: MeasureTab },
    { id: "studies", label: "STUDIES", component: StudiesTab },
    { id: "well", label: "WELL", component: WellTab },
    { id: "skill", label: "SKILL", component: SkillTab },
    { id: "dawg-den", label: "DAWG DEN", component: DawgDenTab },
    { id: "monument", label: "MONUMENT", component: MonumentTab },
    { id: "bell", label: "BELL", component: BellTab },
    { id: "harp", label: "HARP", component: HarpTab },
    { id: "lamp", label: "LAMP", component: LampTab },
    { id: "grotto", label: "GROTTO", component: GrottoTab },
    { id: "jar", label: "JAR", component: JarTab },
    { id: "gambit", label: "GAMBIT", component: GambitTab },
    { id: "temple", label: "TEMPLE", component: TempleTab },
    { id: "fountain", label: "FOUNTAIN", component: FountainTab },
];

export const HoleTab = () => {
    const activeSubTab = van.state(HOLE_SUBTABS[0].id);

    return div(
        { class: "tab-container hole-tab" },
        renderTabNav({
            tabs: HOLE_SUBTABS,
            activeId: activeSubTab,
            navClass: "account-nested-sub-nav",
            buttonClass: "account-nested-sub-tab-btn",
            stubClass: "account-nested-sub-tab-btn--stub",
            isStub: (tab) => !tab.component,
        }),
        div(
            { class: "account-nested-sub-content" },
            ...renderLazyPanes({
                tabs: HOLE_SUBTABS,
                activeId: activeSubTab,
                paneClass: "account-nested-pane",
                activeClass: "account-nested-pane--active",
                dataAttr: "data-hole",
                renderContent: (tab) => (tab.component ? tab.component() : createComingSoonPlaceholder(tab.label)),
            })
        )
    );
};
