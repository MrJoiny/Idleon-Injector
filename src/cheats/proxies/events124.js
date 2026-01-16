/**
 * ActorEvents_124 Proxies
 *
 * Proxies for ActorEvents_124 functions:
 * - StampCostss (stamp upgrade cost reduction)
 * - AFKgainrates (AFK gain multiplier)
 * - LoadPlayerInfo (perfect obols on load)
 * - GetTalentNumber (talent modifications)
 * - MonsterKill (plunderous respawn)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { bEngine, events, behavior } from "../core/globals.js";
import { rollAllObols } from "../helpers/obolRolling.js";
import { createMethodProxy } from "../utils/proxy.js";
import { getMultiplyValue } from "../helpers/values.js";

/**
 * Setup all ActorEvents_124 proxies.
 */
export function setupEvents124Proxies() {
    const ActorEvents124 = events(124);
    const ActorEvents12 = events(12);

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

    // Talent number modifications
    createMethodProxy(ActorEvents124, "_customBlock_GetTalentNumber", (base, ...args) => {
        const key = args[1];
        if (cheatState.talent[key]) {
            return cheatConfig.talent[key](base, args);
        }
        return base;
    });

    // Plunderous respawn on monster kill
    createMethodProxy(ActorEvents124, "_customBlock_MonsterKill", (base, ...args) => {
        if (!cheatState.wide.plunderous) return base;

        const hasPlunderBuff = ActorEvents12._customBlock_GetBuffBonuses(318, 1) > 0;
        const allowAllChars = cheatConfig.wide.plunderous.allcharacters;
        if (!hasPlunderBuff && !allowAllChars) return base;

        const monster = args[0];
        const monsterType = monster.getValue("ActorEvents_1", "_MonsterType");
        const monsterNode = monster.getValue("ActorEvents_1", "_MonsterNODE");
        const isTemp = monster.getValue("ActorEvents_1", "_TempMonster") !== 0;
        const isNonAFK = bEngine.getGameAttribute("CustomLists").h.NonAFKmonsters.includes(monsterType);

        if (bEngine.gameAttributes.h.DummyText3 === "nah" && !isNonAFK && !isTemp) {
            bEngine.gameAttributes.h.DummyText3 = "PiratePlunderMonster";
            ActorEvents124._customBlock_CreateMonster(
                `${monsterType}`,
                behavior.asNumber(monsterNode),
                monster.getXCenter()
            );
            ActorEvents124._customBlock_AddStatusToMonster("StatusPlunder", behavior.getLastCreatedActor(), 36e5);
            bEngine.gameAttributes.h.DummyText3 = "nah";
        }
        
        return base;
    });
}
