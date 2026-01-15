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

/**
 * Setup all ActorEvents_12 proxies (combat stats, damage, multipliers).
 */
export function setupEvents012Proxies() {
    const ActorEvents12 = events(12);
    const getMultiplyValue = (key) => cheatConfig?.multiply?.[key] ?? 1;

    // 100% crit chance
    const CritChance = ActorEvents12._customBlock_CritChance;
    ActorEvents12._customBlock_CritChance = function (...args) {
        const base = Reflect.apply(CritChance, this, args);
        if (cheatState.godlike.crit) return 100;
        return base;
    };

    // Extended attack reach
    const PlayerReach = ActorEvents12._customBlock_PlayerReach;
    ActorEvents12._customBlock_PlayerReach = function (...args) {
        const base = Reflect.apply(PlayerReach, this, args);
        if (cheatState.godlike.reach) return 666;
        return base;
    };

    // Forge stat multipliers (speed & capacity)
    const ForgeStats = ActorEvents12._customBlock_ForgeStats;
    ActorEvents12._customBlock_ForgeStats = function (...args) {
        const key = args[0];
        const base = Reflect.apply(ForgeStats, this, args);
        if (cheatState.w1.forge) {
            if (key === 1) return cheatConfig.w1.forge.capacity(base);
            if (key === 2) return cheatConfig.w1.forge.speed(base);
        }
        return base;
    };

    // Damage multiplier
    const DamageDealt = ActorEvents12._customBlock_DamageDealed;
    ActorEvents12._customBlock_DamageDealed = function (...args) {
        const key = args[0];
        const base = Reflect.apply(DamageDealt, this, args);
        if (cheatState.multiply.damage && key === "Max") {
            return base * getMultiplyValue("damage");
        }
        return base;
    };

    // Skill stats (EXP, efficiency, worship speed)
    const SkillStats = ActorEvents12._customBlock_SkillStats;
    ActorEvents12._customBlock_SkillStats = function (...args) {
        const key = args[0];
        const base = Reflect.apply(SkillStats, this, args);
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
    };

    // Arbitrary code (coins, crystals, giant mobs, food, hit chance)
    const ArbitraryCode = ActorEvents12._customBlock_ArbitraryCode;
    ActorEvents12._customBlock_ArbitraryCode = function (...args) {
        const key = args[0];
        const base = Reflect.apply(ArbitraryCode, this, args);
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
    };

    // Shop quantity bonus multiplier
    const RunCodeOfTypeXforThingY = ActorEvents12._customBlock_RunCodeOfTypeXforThingY;
    ActorEvents12._customBlock_RunCodeOfTypeXforThingY = function (...args) {
        const key = args[0];
        const base = Reflect.apply(RunCodeOfTypeXforThingY, this, args);
        if (cheatState.multiply.shopstock && key === "ShopQtyBonus") {
            return base * getMultiplyValue("shopstock");
        }
        return base;
    };

    // Total stats (drop rarity multiplier)
    const TotalStats = ActorEvents12._customBlock_TotalStats;
    ActorEvents12._customBlock_TotalStats = function (...args) {
        const key = args[0];
        const base = Reflect.apply(TotalStats, this, args);
        if (cheatState.multiply.drop && key === "Drop_Rarity") {
            return base * getMultiplyValue("drop");
        }
        return base;
    };

    // Generate monster drops (filter unwanted drops)
    const GenerateMonsterDrops = ActorEvents12._customBlock_GenerateMonsterDrops;
    ActorEvents12._customBlock_GenerateMonsterDrops = function (...args) {
        const drops = Reflect.apply(GenerateMonsterDrops, this, args);
        if (!cheatConfig.nomore) return drops;
        return drops.filter((drop) => !cheatConfig.nomore.items.some((regex) => regex.test(drop[0])));
    };

    // Class EXP multiplier
    const ExpMulti = ActorEvents12._customBlock_ExpMulti;
    ActorEvents12._customBlock_ExpMulti = function (...args) {
        const key = args[0];
        const base = Reflect.apply(ExpMulti, this, args);
        if (cheatState.multiply.classexp && key === 0) {
            return base * getMultiplyValue("classexp");
        }
        return base;
    };
}

/**
 * Initialize events012 proxies.
 */
export function initEvents012Proxies() {
    setupEvents012Proxies();
}
