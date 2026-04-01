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

// Game card calculation treats only the first 10 Cards[2] slots as equipped.
const MAX_EQUIPPED_CARD_SLOTS = 10;
const cardLvReadErrorLogged = new Set();

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
        const ActorEvents12 = events(12);
        const runCodeOfType = ActorEvents12?._customBlock_RunCodeOfTypeXforThingY;

        if (
            !cheatState.wide.cardpassive ||
            mode !== -4 || // -4 is TalentCalc's card-bonus rebuild phase.
            typeof runCodeOfType !== "function"
        ) {
            return base;
        }
        const cardSlots = gga?.Cards?.[2];
        const cardInfo = gga?.PixelHelperActor?.[6]?.behaviors?.getBehavior?.("ActorEvents_312")?._GenINFO?.[45]?.h;
        const bonusMap = gga?.DNSM?.h?.CardBonusS;
        const equippedOnlyMap = gga?.DNSM?.h?.CardBonusS_old;

        if (!Array.isArray(cardSlots) || !cardInfo || !bonusMap?.h || !equippedOnlyMap?.h) {
            return base;
        }

        const equippedCards = new Set();
        const equippedSlotCount = Math.min(cardSlots.length, MAX_EQUIPPED_CARD_SLOTS);

        for (let i = 0; i < equippedSlotCount; i++) {
            const slotCardId = cardSlots[i];
            const slotCardKey = String(slotCardId ?? "");
            if (slotCardKey !== "" && slotCardKey !== "B") {
                equippedCards.add(slotCardKey);
            }
        }

        const nonEquippedTotals = Object.create(null);

        for (const cardId in cardInfo) {
            const cardIdKey = String(cardId);

            if (
                !Object.prototype.hasOwnProperty.call(cardInfo, cardId) ||
                cardIdKey === "Blank" ||
                equippedCards.has(cardIdKey)
            ) {
                continue;
            }

            const cardData = cardInfo[cardIdKey];
            if (!Array.isArray(cardData) || cardData.length < 5) {
                continue;
            }

            const bonusName = String(cardData[3] ?? "");
            const cardValue = Number(cardData[4]) || 0;
            if (bonusName === "" || cardValue === 0) {
                continue;
            }

            let cardLevel = 0;
            try {
                cardLevel = Number(Reflect.apply(runCodeOfType, ActorEvents12, ["CardLv", cardIdKey])) || 0;
            } catch (error) {
                if (!cardLvReadErrorLogged.has(cardIdKey)) {
                    cardLvReadErrorLogged.add(cardIdKey);
                    console.error("[wide cardpassive] CardLv read failed", { cardIdKey, error });
                }
            }
            if (cardLevel === 0) {
                continue;
            }

            nonEquippedTotals[bonusName] = (Number(nonEquippedTotals[bonusName]) || 0) + cardLevel * cardValue;
        }

        for (const bonusName in nonEquippedTotals) {
            const currentBonus = Number(bonusMap.h[bonusName]) || 0;
            const equippedBonus = Number(equippedOnlyMap.h[bonusName]) || 0;
            const alreadyIncludedPassiveBonus = Math.max(currentBonus - equippedBonus, 0);
            const missingPassiveBonus = Number(nonEquippedTotals[bonusName]) - alreadyIncludedPassiveBonus;

            if (missingPassiveBonus > 0) {
                bonusMap.h[bonusName] = currentBonus + missingPassiveBonus;
            }
        }

        return base;
    });
}
