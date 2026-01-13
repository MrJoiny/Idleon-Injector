/**
 * ActorEvents_189 Proxies
 *
 * Proxies for ActorEvents_189 functions:
 * - AnvilProduceStats (anvil cost nullification, production speed)
 * - CauldronStats (alchemy cheats)
 * - chipBonuses (chip bonus modifications)
 * - MealBonus (meal bonus modifications)
 */

import { cheatState } from "../core/state.js";
import { events } from "../core/globals.js";
import { getConfig, setConfig } from "./proxyContext.js";

/**
 * Set the cheat config reference.
 * @param {object} config
 */
export function setCheatConfig(config) {
    setConfig(config);
}

/**
 * Setup anvil production stats proxy.
 */
export function setupAnvilProduceStatsProxy() {
    const cheatConfig = getConfig();
    const anvilProduceStats = events(189)._customBlock_AnvilProduceStats;
    events(189)._customBlock_AnvilProduceStats = function (...argumentsList) {
        if (cheatState.w1.anvil) {
            const t = argumentsList[0];
            if (t == "Costs1") return 0;
            if (t == "Costs2") return 0;
            if (t == "ProductionSpeed")
                return cheatConfig.w1.anvil.productionspeed(Reflect.apply(anvilProduceStats, this, argumentsList));
        }
        return Reflect.apply(anvilProduceStats, this, argumentsList);
    };
}

/**
 * Setup cauldron stats proxy for alchemy cheats.
 */
export function setupCauldronStatsProxy() {
    const cheatConfig = getConfig();
    const Alchemy = events(189)._customBlock_CauldronStats;
    events(189)._customBlock_CauldronStats = function (...argumentList) {
        return cheatState.w2.alchemy && cheatConfig.w2.alchemy.hasOwnProperty(argumentList[0])
            ? cheatConfig.w2.alchemy[argumentList[0]](Reflect.apply(Alchemy, this, argumentList))
            : Reflect.apply(Alchemy, this, argumentList);
    };
}

/**
 * Setup chip bonuses proxy.
 */
export function setupChipBonusesProxy() {
    const cheatConfig = getConfig();
    const chipBonuses = events(189)._customBlock_chipBonuses;
    events(189)._customBlock_chipBonuses = function (...argumentsList) {
        if (cheatState.w4.chipbonuses && cheatConfig.w4.chipbonuses[argumentsList[0]]) {
            return cheatConfig.w4.chipbonuses[argumentsList[0]](Reflect.apply(chipBonuses, this, argumentsList));
        }
        return Reflect.apply(chipBonuses, this, argumentsList);
    };
}

/**
 * Setup meal bonus proxy.
 */
export function setupMealBonusProxy() {
    const cheatConfig = getConfig();
    const MealBonus = events(189)._customBlock_MealBonus;
    events(189)._customBlock_MealBonus = function (...argumentsList) {
        if (cheatState.w4.meals && cheatConfig.w4.meals[argumentsList[0]]) {
            return cheatConfig.w4.meals[argumentsList[0]](Reflect.apply(MealBonus, this, argumentsList));
        }
        return Reflect.apply(MealBonus, this, argumentsList);
    };
}

/**
 * Setup all ActorEvents_189 proxies.
 */
export function setupEvents189Proxies() {
    setupAnvilProduceStatsProxy();
    setupCauldronStatsProxy();
    setupChipBonusesProxy();
    setupMealBonusProxy();
}

/**
 * Initialize events189 proxies with config.
 * @param {object} config - The cheat config object
 */
export function initEvents189Proxies(config) {
    setCheatConfig(config);
    setupEvents189Proxies();
}
