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

/**
 * Setup all ActorEvents_189 proxies.
 */
export function setupEvents189Proxies() {
    const ActorEvents189 = events(189);

    // Anvil production stats (cost nullification, production speed)
    const AnvilProduceStats = ActorEvents189._customBlock_AnvilProduceStats;
    ActorEvents189._customBlock_AnvilProduceStats = function (...args) {
        const key = args[0];
        const base = Reflect.apply(AnvilProduceStats, this, args);
        if (cheatState.w1.anvil) {
            if (key === "Costs1" || key === "Costs2") return 0;
            if (key === "ProductionSpeed") return cheatConfig.w1.anvil.productionspeed(base);
        }
        return base;
    };

    // Cauldron stats (alchemy cheats)
    const CauldronStats = ActorEvents189._customBlock_CauldronStats;
    ActorEvents189._customBlock_CauldronStats = function (...args) {
        const key = args[0];
        const base = Reflect.apply(CauldronStats, this, args);
        if (cheatState.w2.alchemy && key in cheatConfig.w2.alchemy) {
            return cheatConfig.w2.alchemy[key](base);
        }
        return base;
    };

    // Chip bonuses
    const ChipBonuses = ActorEvents189._customBlock_chipBonuses;
    ActorEvents189._customBlock_chipBonuses = function (...args) {
        const key = args[0];
        const base = Reflect.apply(ChipBonuses, this, args);
        if (cheatState.w4.chipbonuses && cheatConfig.w4.chipbonuses[key]) {
            return cheatConfig.w4.chipbonuses[key](base);
        }
        return base;
    };

    // Meal bonuses
    const MealBonus = ActorEvents189._customBlock_MealBonus;
    ActorEvents189._customBlock_MealBonus = function (...args) {
        const key = args[0];
        const base = Reflect.apply(MealBonus, this, args);
        if (cheatState.w4.meals && cheatConfig.w4.meals[key]) {
            return cheatConfig.w4.meals[key](base);
        }
        return base;
    };
}

/**
 * Initialize events189 proxies.
 */
export function initEvents189Proxies() {
    setupEvents189Proxies();
}
