import { BeanstackTab } from "./w6/BeanstackTab.js";
import { FarmingTab } from "./w6/FarmingTab.js";
import { SneakingTab } from "./w6/SneakingTab.js";
import { SummoningTab } from "./w6/SummoningTab.js";
import { createWorldTab } from "./tabShared.js";

const W6_SUBTABS = [
    { id: "farming", label: "FARMING", component: FarmingTab },
    { id: "sneaking", label: "SNEAKING", component: SneakingTab },
    { id: "summoning", label: "SUMMONING", component: SummoningTab },
    { id: "beanstack", label: "BEANSTACK", component: BeanstackTab },
];

export const W6Tab = createWorldTab(W6_SUBTABS, "w6-world-tab");
