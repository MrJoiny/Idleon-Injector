/**
 * ActorEvents_189 Proxies
 *
 * Proxies for ActorEvents_189 functions:
 * - AnvilProduceStats (anvil cost nullification, production speed)
 * - CauldronStats (alchemy cheats)
 * - chipBonuses (chip bonus modifications)
 * - MealBonus (meal bonus modifications)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { events } from "../core/globals.js";
import { createMethodProxy } from "../utils/methodProxy.js";

/**
 * Setup all ActorEvents_189 proxies.
 */
export function setupEvents189Proxies() {
    const ActorEvents189 = events(189);

    // Anvil production stats (cost nullification, production speed)
    createMethodProxy(ActorEvents189, "_customBlock_AnvilProduceStats", (base, key) => {
        if (cheatState.w1.anvil) {
            if (key === "Costs1" || key === "Costs2") return 0;
            if (key === "ProductionSpeed") return cheatConfig.w1.anvil.productionspeed(base);
        }
        return base;
    });

    // Cauldron stats (alchemy cheats)
    createMethodProxy(ActorEvents189, "_customBlock_CauldronStats", (base, key) => {
        if (cheatState.w2.alchemy && key in cheatConfig.w2.alchemy) {
            return cheatConfig.w2.alchemy[key](base);
        }
        return base;
    });

    // Chip bonuses
    createMethodProxy(ActorEvents189, "_customBlock_chipBonuses", (base, key) => {
        if (cheatState.w4.chipbonuses && cheatConfig.w4.chipbonuses[key]) {
            return cheatConfig.w4.chipbonuses[key](base);
        }
        return base;
    });

    // Meal bonuses
    createMethodProxy(ActorEvents189, "_customBlock_MealBonus", (base, key) => {
        if (cheatState.w4.meals && cheatConfig.w4.meals[key]) {
            return cheatConfig.w4.meals[key](base);
        }
        return base;
    });
}
