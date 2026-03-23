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
 * - TotalStats (drop rarity multiplier + card passive reapply)
 * - GenerateMonsterDrops (filter drops)
 * - ExpMulti (class EXP multiplier)
 * - RunCodeOfTypeXforThingY (shop stock multiplier)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { events, gga } from "../core/globals.js";
import { createMethodProxy } from "../utils/proxy.js";
import { getMultiplyValue } from "../helpers/values.js";
import { carryCapKeys } from "../constants.js";
import {
    collectPotentialCardCalcContexts,
    getCardRowsById,
    getNativePassiveBonusKeysFromUnlocks,
    parseCardIdList,
} from "../helpers/cardPassive.js";
import { getCurrentNativePassiveBonusKeys, refreshCardPassiveUiMarkers } from "./events312.js";

const PASSIVE_REAPPLY_INTERVAL_MS = 1000;

let lastPassiveApplyAt = 0;
const lastInjectedBonusByKey = new Map();

function getLegendCardMultiplier(context) {
    if (typeof context?._customBlock_Thingies !== "function") return 1;

    const legendBonus = Number(context._customBlock_Thingies("LegendPTS_bonus", 21, 0));
    if (!Number.isFinite(legendBonus)) return 1;

    return 1 + legendBonus / 100;
}

function getPrimaryCalcContext(preferredContext = null) {
    if (typeof preferredContext?._customBlock_RunCodeOfTypeXforThingY === "function") {
        return preferredContext;
    }

    const contexts = collectPotentialCardCalcContexts();
    return contexts[0] || null;
}

function getNativePassiveBonusKeys(context) {
    const merged = new Set(getCurrentNativePassiveBonusKeys());
    const unlocked = getNativePassiveBonusKeysFromUnlocks(context);

    for (const key of unlocked) {
        merged.add(key);
    }

    return merged;
}

function removePreviouslyInjectedBonuses(cardBonusMap) {
    if (!cardBonusMap || typeof cardBonusMap !== "object") return;

    for (const [bonusKey, injectedAmount] of lastInjectedBonusByKey.entries()) {
        const current = Number(cardBonusMap[bonusKey]);
        if (!Number.isFinite(current)) continue;

        cardBonusMap[bonusKey] = Math.max(0, current - injectedAmount);
    }

    lastInjectedBonusByKey.clear();
}

function applyAllCardPassiveBonuses(context, throttled = false) {
    if (throttled && Date.now() - lastPassiveApplyAt < PASSIVE_REAPPLY_INTERVAL_MS) {
        return false;
    }

    const cardBonusMap = gga?.DNSM?.h?.CardBonusS?.h;
    if (!cardBonusMap) return false;

    removePreviouslyInjectedBonuses(cardBonusMap);

    if (!cheatState.wide.cardpassive) {
        lastPassiveApplyAt = Date.now();
        return true;
    }

    const ownedCards = gga?.Cards?.[0]?.h;
    const calcContext = getPrimaryCalcContext(context);
    if (!ownedCards || !calcContext) return false;

    const rowsById = getCardRowsById();
    const legendMultiplier = getLegendCardMultiplier(calcContext);
    const equippedCards = Array.isArray(gga?.Cards?.[2]) ? gga.Cards[2] : [];
    const equippedSet = new Set(
        equippedCards.filter((cardId) => typeof cardId === "string" && cardId && cardId !== "B")
    );
    const alreadyPassiveSet = parseCardIdList(gga?.OptionsListAccount?.[155]);
    const nativePassiveBonusKeys = getNativePassiveBonusKeys(calcContext);

    const injectedThisPass = new Map();

    for (const [cardId, countRaw] of Object.entries(ownedCards)) {
        const ownedCount = Number(countRaw);
        if (!Number.isFinite(ownedCount) || ownedCount <= 0) continue;
        if (equippedSet.has(cardId) || alreadyPassiveSet.has(cardId)) continue;

        const row = rowsById.get(cardId);
        if (!row) continue;

        const bonusKey = row[3];
        const bonusPerLevel = Number.parseFloat(row[4]);
        if (typeof bonusKey !== "string" || !bonusKey || !Number.isFinite(bonusPerLevel)) continue;
        if (bonusKey.toLowerCase().includes("passive")) continue;
        if (nativePassiveBonusKeys.has(bonusKey)) continue;

        const cardLevel = Number(calcContext._customBlock_RunCodeOfTypeXforThingY("CardLv", cardId));
        if (!Number.isFinite(cardLevel) || cardLevel <= 0) continue;

        const contribution = cardLevel * bonusPerLevel * legendMultiplier;
        const previous = Number(cardBonusMap[bonusKey]);
        const previousValue = Number.isFinite(previous) ? previous : 0;

        cardBonusMap[bonusKey] = previousValue + contribution;

        const accumulated = injectedThisPass.get(bonusKey) || 0;
        injectedThisPass.set(bonusKey, accumulated + contribution);
    }

    for (const [key, value] of injectedThisPass.entries()) {
        lastInjectedBonusByKey.set(key, value);
    }

    lastPassiveApplyAt = Date.now();
    return true;
}

export function recalculateCardBonusesWithPassive() {
    refreshCardPassiveUiMarkers();
    return applyAllCardPassiveBonuses(null, false);
}

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

    // Buff bonuses (plunderous mob spawn rate)
    createMethodProxy(ActorEvents12, "_customBlock_GetBuffBonuses", (base, key) => {
        if (cheatState.wide.plunderous && key === 318) {
            if (cheatConfig.wide.plunderous.allcharacters || base > 0) return 1;
        }
        return base;
    });

    // Shop quantity bonus multiplier
    createMethodProxy(ActorEvents12, "_customBlock_RunCodeOfTypeXforThingY", (base, key) => {
        if (cheatState.multiply.shopstock && key === "ShopQtyBonus") {
            return base * getMultiplyValue("shopstock");
        }
        return base;
    });

    // Total stats (drop rarity multiplier + passive card reapply)
    createMethodProxy(ActorEvents12, "_customBlock_TotalStats", function (base, key) {
        if (cheatState.wide.cardpassive || lastInjectedBonusByKey.size > 0) {
            applyAllCardPassiveBonuses(this, true);

            if (cheatState.wide.cardpassive) {
                refreshCardPassiveUiMarkers();
            }
        }

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

    // Carry capacity multiplier
    createMethodProxy(ActorEvents12, "_customBlock_MaxCapacity", (base, key) => {
        if (cheatState.multiply.carrycap && carryCapKeys.has(key)) {
            return base * getMultiplyValue("carrycap");
        }
        return base;
    });
}
