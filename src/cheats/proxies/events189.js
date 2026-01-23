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
import { createMethodProxy, createConfigLookupProxy } from "../utils/proxy.js";

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
    createConfigLookupProxy(ActorEvents189, "_customBlock_CauldronStats", [{ state: "w2.alchemy" }]);

    // Chip bonuses
    createConfigLookupProxy(ActorEvents189, "_customBlock_chipBonuses", [{ state: "w4.chipbonuses" }]);

    // Meal bonuses
    createConfigLookupProxy(ActorEvents189, "_customBlock_MealBonus", [{ state: "w4.meals" }]);
}
