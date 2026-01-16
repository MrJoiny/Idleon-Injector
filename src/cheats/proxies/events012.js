/**
 * ActorEvents_12 Proxies
 *
 * Proxies for combat and stat-related functions in ActorEvents_12:
 * - CritChance (100% crit)
 * - PlayerReach (extended attack reach)
 * - ForgeStats (forge capacity and speed)
 * - DamageDealed (damage multiplier)
 * - SkillStats (skill EXP, efficiency, worship speed)
 * - ArbitraryCode (coins, crystals, giant mobs, food, hit chance)
 * - TotalStats (drop rarity multiplier)
 * - GenerateMonsterDrops (filter drops)
 * - ExpMulti (class EXP multiplier)
 * - RunCodeOfTypeXforThingY (shop stock multiplier)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { events } from "../core/globals.js";
import { createMethodProxy } from "../utils/proxy.js";
import { getMultiplyValue } from "../helpers/values.js";

/**
 * Setup all ActorEvents_12 proxies (combat stats, damage, multipliers).
 */
export function setupEvents012Proxies() {
    const ActorEvents12 = events(12);

    // 100% crit chance
    createMethodProxy(ActorEvents12, "_customBlock_CritChance", (base) => {
        return cheatState.godlike.crit ? 100 : base;
    });

    // Extended attack reach
    createMethodProxy(ActorEvents12, "_customBlock_PlayerReach", (base) => {
        return cheatState.godlike.reach ? 666 : base;
    });

    // Forge stat multipliers (speed & capacity)
    createMethodProxy(ActorEvents12, "_customBlock_ForgeStats", (base, key) => {
        if (cheatState.w1.forge) {
            if (key === 1) return cheatConfig.w1.forge.capacity(base);
            if (key === 2) return cheatConfig.w1.forge.speed(base);
        }
        return base;
    });

    // Damage multiplier
    createMethodProxy(ActorEvents12, "_customBlock_DamageDealed", (base, key) => {
        if (cheatState.multiply.damage && key === "Max") {
            return base * getMultiplyValue("damage");
        }
        return base;
    });

    // Skill stats (EXP, efficiency, worship speed)
    createMethodProxy(ActorEvents12, "_customBlock_SkillStats", (base, key) => {
        if (cheatState.multiply.skillexp && key === "AllSkillxpMULTI") {
            return base * getMultiplyValue("skillexp");
        }
        if (cheatState.w3.worshipspeed && key in cheatConfig.w3) {
            return cheatConfig.w3[key](base);
        }
        if (cheatState.multiply.efficiency && key.includes("Efficiency")) {
            return base * getMultiplyValue("efficiency");
        }
        return base;
    });

    // Arbitrary code (coins, crystals, giant mobs, food, hit chance)
    createMethodProxy(ActorEvents12, "_customBlock_ArbitraryCode", (base, key) => {
        if (cheatState.multiply.money && key === "MonsterCash") {
            return base * getMultiplyValue("money");
        }
        if (cheatState.multiply.crystal && key === "CrystalSpawn") {
            return base * getMultiplyValue("crystal");
        }
        if (cheatState.wide.giant && key === "GiantMob") return 1;
        if (cheatState.godlike.food && key === "FoodNOTconsume") return 100;
        if (cheatState.godlike.hitchance && key === "HitChancePCT") return 100;
        return base;
    });

    // Shop quantity bonus multiplier
    createMethodProxy(ActorEvents12, "_customBlock_RunCodeOfTypeXforThingY", (base, key) => {
        if (cheatState.multiply.shopstock && key === "ShopQtyBonus") {
            return base * getMultiplyValue("shopstock");
        }
        return base;
    });

    // Total stats (drop rarity multiplier)
    createMethodProxy(ActorEvents12, "_customBlock_TotalStats", (base, key) => {
        if (cheatState.multiply.drop && key === "Drop_Rarity") {
            return base * getMultiplyValue("drop");
        }
        return base;
    });

    // Generate monster drops (filter unwanted drops)
    createMethodProxy(ActorEvents12, "_customBlock_GenerateMonsterDrops", (drops) => {
        if (!cheatConfig.nomore) return drops;
        return drops.filter((drop) => !cheatConfig.nomore.items.some((regex) => regex.test(drop[0])));
    });

    // Class EXP multiplier
    createMethodProxy(ActorEvents12, "_customBlock_ExpMulti", (base, key) => {
        if (cheatState.multiply.classexp && key === 0) {
            return base * getMultiplyValue("classexp");
        }
        return base;
    });
}
