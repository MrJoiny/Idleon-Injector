/**
 * ActorEvents_124 Proxies
 *
 * Proxies for ActorEvents_124 functions:
 * - StampCostss (stamp upgrade cost reduction)
 * - AFKgainrates (AFK gain multiplier)
 * - LoadPlayerInfo (perfect obols on load)
 * - TalentCalc (all cards passive)
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
    createMethodProxy(ActorEvents124, "_customBlock_TalentCalc", (base, mode) => {
        if (!cheatState.wide.cardpassive || mode !== -4) {
            // -4 is the TalentCalc card-bonus rebuild phase.
            return base;
        }

        const ActorEvents12 = events(12);
        const runCodeOfType = ActorEvents12._customBlock_RunCodeOfTypeXforThingY;

        const cardSlots = gga.Cards[2];
        const cardInfo = gga.PixelHelperActor[6].behaviors.getBehavior("ActorEvents_312")._GenINFO[45].h;
        const bonusH = gga.DNSM.h.CardBonusS.h;
        const equippedH = gga.DNSM.h.CardBonusS_old.h;

        const equippedCards = new Set();
        for (let i = 0; i < 10; i++) {
            const slotCardId = cardSlots[i];
            if (slotCardId && slotCardId !== "B") {
                equippedCards.add(slotCardId);
            }
        }

        // Sum bonus values from owned cards that are not currently equipped.
        const nonEquippedTotals = Object.create(null);

        for (const cardId of Object.keys(cardInfo)) {
            if (cardId === "Blank" || equippedCards.has(cardId)) {
                continue;
            }

            const cardData = cardInfo[cardId];
            const bonusName = cardData[3];
            const cardValue = Number(cardData[4]) || 0;
            if (!bonusName || cardValue === 0) {
                continue;
            }

            const cardLevel = Number(runCodeOfType("CardLv", cardId)) || 0;
            if (cardLevel === 0) {
                continue;
            }

            nonEquippedTotals[bonusName] = (nonEquippedTotals[bonusName] || 0) + cardLevel * cardValue;
        }

        // Add only the missing passive delta so existing passive sources are not double-counted.
        for (const bonusName in nonEquippedTotals) {
            const currentBonus = Number(bonusH[bonusName]) || 0;
            const equippedBonus = Number(equippedH[bonusName]) || 0;
            const alreadyPassive = Math.max(currentBonus - equippedBonus, 0);
            const missingPassive = nonEquippedTotals[bonusName] - alreadyPassive;

            if (missingPassive > 0) {
                bonusH[bonusName] = currentBonus + missingPassive;
            }
        }

        return base;
    });
}
