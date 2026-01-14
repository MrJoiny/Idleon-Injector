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
 * Setup all ActorEvents_12 proxies (combat stats, damage, multipliers).
 */
export function setupEvents012Proxies() {
    const ActorEvents12 = events(12);
    const cheatConfig = getConfig();

    // 100% crit chance
    const CritChance = ActorEvents12._customBlock_CritChance;
    ActorEvents12._customBlock_CritChance = function (...argumentsList) {
        if (cheatState.godlike.crit) return 100;
        return Reflect.apply(CritChance, this, argumentsList);
    };

    // Extended attack reach
    const atkReach = ActorEvents12._customBlock_PlayerReach;
    ActorEvents12._customBlock_PlayerReach = function (...argumentsList) {
        if (cheatState.godlike.reach) return 666;
        return Reflect.apply(atkReach, this, argumentsList);
    };

    // Forge stat multipliers (speed & capacity)
    const ForgeStats = ActorEvents12._customBlock_ForgeStats;
    ActorEvents12._customBlock_ForgeStats = function (...argumentsList) {
        const key = argumentsList[0];
        const base = Reflect.apply(ForgeStats, this, argumentsList);

        if (cheatState.w1.forge) {
            // 1 = forge capacity (branch with ForgeCap stamp / furnace levels)
            if (key === 1) return cheatConfig.w1.forge.capacity(base);
            // 2 = forge speed (used by ForgeSpeeed)
            if (key === 2) return cheatConfig.w1.forge.speed(base);
        }

        return base;
    };

    // Damage cap on too-OP broken players with overflowing damage
    const DamageDealt = ActorEvents12._customBlock_DamageDealed;
    ActorEvents12._customBlock_DamageDealed = function (...argumentsList) {
        return cheatState.multiply.damage && argumentsList[0] === "Max"
            ? DamageDealt(...argumentsList) * cheatConfig.multiply.damage
            : DamageDealt(...argumentsList);
    };

    // Skill stats (EXP, efficiency, worship speed)
    const SkillStats = ActorEvents12._customBlock_SkillStats;
    ActorEvents12._customBlock_SkillStats = function (...argumentsList) {
        const t = argumentsList[0];

        // Global skill EXP multiplier
        if (cheatState.multiply.skillexp && t === "AllSkillxpMULTI") {
            return Reflect.apply(SkillStats, this, argumentsList) * cheatConfig.multiply.skillexp;
        }

        // Worship speed (config-driven)
        if (cheatState.w3.worshipspeed && cheatConfig.w3.hasOwnProperty(t)) {
            return cheatConfig.w3[t](Reflect.apply(SkillStats, this, argumentsList));
        }

        // Skill efficiency multiplier
        if (cheatState.multiply.efficiency && t.includes("Efficiency")) {
            return Reflect.apply(SkillStats, this, argumentsList) * cheatConfig.multiply.efficiency;
        }

        return Reflect.apply(SkillStats, this, argumentsList);
    };

    // Arbitrary code (coins, crystals, giant mobs, food, hit chance)
    const Arbitrary = ActorEvents12._customBlock_ArbitraryCode;
    ActorEvents12._customBlock_ArbitraryCode = function (...argumentsList) {
        const t = argumentsList[0];

        // Coin drop multiplier (MonsterCash)
        if (cheatState.multiply.money && t === "MonsterCash") {
            return Reflect.apply(Arbitrary, this, argumentsList) * cheatConfig.multiply.money;
        }

        // Crystal spawn multiplier
        if (t === "CrystalSpawn") {
            const base = Reflect.apply(Arbitrary, this, argumentsList);
            if (cheatState.multiply.crystal) return base * cheatConfig.multiply.crystal;
            return base;
        }

        // Existing cheats
        if (t === "GiantMob" && cheatState.wide.giant) return 1;
        if (t === "FoodNOTconsume" && cheatState.godlike.food) return 100;
        if (t === "HitChancePCT" && cheatState.godlike.hitchance) return 100;

        return Reflect.apply(Arbitrary, this, argumentsList);
    };

    // Shop quantity bonus multiplier
    const RunCodeOfTypeXforThingY = ActorEvents12._customBlock_RunCodeOfTypeXforThingY;
    ActorEvents12._customBlock_RunCodeOfTypeXforThingY = function (...argumentsList) {
        const codeType = argumentsList[0];

        if (cheatState.multiply.shopstock && codeType === "ShopQtyBonus") {
            const base = Reflect.apply(RunCodeOfTypeXforThingY, this, argumentsList);
            return base * cheatConfig.multiply.shopstock;
        }

        return Reflect.apply(RunCodeOfTypeXforThingY, this, argumentsList);
    };

    // Total stats (drop rarity multiplier)
    const TotalStats = ActorEvents12._customBlock_TotalStats;
    ActorEvents12._customBlock_TotalStats = (...argumentsList) => {
        return (
            Reflect.apply(TotalStats, this, argumentsList) *
            (cheatState.multiply.drop && argumentsList[0] === "Drop_Rarity" ? cheatConfig.multiply.drop : 1)
        );
    };

    // Generate monster drops (filter unwanted drops)
    const generateMonsterDrops = ActorEvents12._customBlock_GenerateMonsterDrops;
    ActorEvents12._customBlock_GenerateMonsterDrops = function (...argumentsList) {
        let drops = Reflect.apply(generateMonsterDrops, this, argumentsList);
        // if cheatConfig.nomore not defined, return all drops
        if (!cheatConfig.nomore) return drops;
        // filter out drops where drop[0] matches any regex in itemsNotToDrop
        drops = drops.filter((drop) => !cheatConfig.nomore.items.some((regex) => regex.test(drop[0])));

        return drops;
    };

    // Class EXP multiplier
    const ExpMulti = ActorEvents12._customBlock_ExpMulti;
    ActorEvents12._customBlock_ExpMulti = function (...argumentsList) {
        const mode = argumentsList[0];
        const base = Reflect.apply(ExpMulti, this, argumentsList);

        // e == 0 is the main class EXP path
        return cheatState.multiply.classexp && mode === 0 ? base * cheatConfig.multiply.classexp : base;
    };
}

/**
 * Initialize events012 proxies with config.
 * @param {object} config - The cheat config object
 */
export function initEvents012Proxies(config) {
    setCheatConfig(config);
    setupEvents012Proxies();
}
