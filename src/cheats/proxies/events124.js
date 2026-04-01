/**
 * ActorEvents_124 Proxies
 *
 * Proxies for ActorEvents_124 functions:
 * - StampCostss (stamp upgrade cost reduction)
 * - AFKgainrates (AFK gain multiplier)
 * - LoadPlayerInfo (perfect obols on load)
 * - CardBonusREAL (all cards passive)
 * - GetTalentNumber (talent modifications)
 * - MonsterKill (plunderous respawn)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { events, gga } from "../core/globals.js";
import { rollAllObols } from "../helpers/obolRolling.js";
import { createMethodProxy } from "../utils/proxy.js";
import { getMultiplyValue } from "../helpers/values.js";

/**
 * Setup all ActorEvents_124 proxies.
 */
export function setupEvents124Proxies() {
    const ActorEvents124 = events(124);

    // Stamp cost reduction
    createMethodProxy(ActorEvents124, "_customBlock_StampCostss", (base) => {
        if (cheatState.w1.stampcost) {
            const [currency, cost] = base;
            return [currency, cheatConfig.w1.stampcost(cost)];
        }
        return base;
    });

    // AFK gain rate multiplier
    createMethodProxy(ActorEvents124, "_customBlock_AFKgainrates", (base) => {
        if (cheatState.multiply.afk) {
            return base * getMultiplyValue("afk");
        }
        return base;
    });

    // Perfect obols on player load
    createMethodProxy(ActorEvents124, "_customBlock_LoadPlayerInfo", (base) => {
        if (cheatState.wide.perfectobols) {
            try {
                rollAllObols();
            } catch (e) {
                console.error("Error rolling obols:", e);
            }
        }
        return base;
    });

    // All cards passive
    const ActorEvents12 = events(12);
    const runCodeOfType = ActorEvents12?._customBlock_RunCodeOfTypeXforThingY;

    createMethodProxy(ActorEvents124, "_customBlock_CardBonusREAL", (base, bonusId) => {
        if (!cheatState.wide.cardpassive || typeof runCodeOfType !== "function") {
            return base;
        }

        const cardSlots = gga?.Cards?.[2];
        const cardInfo = gga?.PixelHelperActor?.[6]?.behaviors?.getBehavior("ActorEvents_312")?._GenINFO?.[45]?.h;
        const equippedOnlyMap = gga?.DNSM?.h?.CardBonusS_old;
        const bonusNamesById = gga?.CustomMaps?.h?.IDforCardBonus?.h;

        if (!cardSlots || !cardInfo || !equippedOnlyMap?.h || !bonusNamesById) {
            return base;
        }

        const targetBonusName = String(bonusNamesById[String(bonusId)] ?? "");
        if (targetBonusName === "") {
            return base;
        }

        const equippedCards = new Set();
        for (let i = 0; i < 10; i++) {
            const cardId = cardSlots[i];
            if (cardId && cardId !== "B") {
                equippedCards.add(cardId);
            }
        }

        let nonEquippedBonusTotal = 0;

        for (const cardId in cardInfo) {
            if (!Object.hasOwn(cardInfo, cardId) || cardId === "Blank" || equippedCards.has(cardId)) {
                continue;
            }

            const cardData = cardInfo[cardId];
            if (!cardData || cardData.length < 5 || String(cardData[3] ?? "") !== targetBonusName) {
                continue;
            }

            const cardLevel = Number(Reflect.apply(runCodeOfType, ActorEvents12, ["CardLv", String(cardId)])) || 0;
            if (cardLevel === 0) {
                continue;
            }

            nonEquippedBonusTotal += cardLevel * (Number(cardData[4]) || 0);
        }

        const equippedOnlyBonus = Number(equippedOnlyMap.h[targetBonusName]) || 0;
        const alreadyIncludedPassiveBonus = (Number(base) || 0) - equippedOnlyBonus;
        const missingPassiveBonus = nonEquippedBonusTotal - alreadyIncludedPassiveBonus;

        if (missingPassiveBonus <= 0) {
            return base;
        }

        return (Number(base) || 0) + missingPassiveBonus;
    });
}
