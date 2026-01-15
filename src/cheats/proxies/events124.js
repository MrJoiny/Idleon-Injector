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

/**
 * Setup all ActorEvents_124 proxies.
 */
export function setupEvents124Proxies() {
    const ActorEvents124 = events(124);
    const ActorEvents12 = events(12);
    const getMultiplyValue = (key) => cheatConfig?.multiply?.[key] ?? 1;

    // Stamp cost reduction
    const StampCostss = ActorEvents124._customBlock_StampCostss;
    ActorEvents124._customBlock_StampCostss = function (...args) {
        const base = Reflect.apply(StampCostss, this, args);
        if (cheatState.w1.stampcost) {
            const [currency, cost] = base;
            return [currency, cheatConfig.w1.stampcost(cost)];
        }
        return base;
    };

    // AFK gain rate multiplier
    const AFKgainrates = ActorEvents124._customBlock_AFKgainrates;
    ActorEvents124._customBlock_AFKgainrates = function (...args) {
        const base = Reflect.apply(AFKgainrates, this, args);
        if (cheatState.multiply.afk) {
            return base * getMultiplyValue("afk");
        }
        return base;
    };

    // Perfect obols on player load
    const LoadPlayerInfo = ActorEvents124._customBlock_LoadPlayerInfo;
    ActorEvents124._customBlock_LoadPlayerInfo = function (...args) {
        const base = Reflect.apply(LoadPlayerInfo, this, args);
        if (cheatState.wide.perfectobols) {
            try {
                rollAllObols();
            } catch (e) {
                console.log(e.toString());
            }
        }
        return base;
    };

    // Talent number modifications
    const GetTalentNumber = ActorEvents124._customBlock_GetTalentNumber;
    ActorEvents124._customBlock_GetTalentNumber = function (...args) {
        const key = args[1];
        const base = Reflect.apply(GetTalentNumber, this, args);
        if (cheatState.talent[key]) {
            return cheatConfig.talent[key](base, args);
        }
        return base;
    };

    // Plunderous respawn on monster kill
    const MonsterKill = ActorEvents124._customBlock_MonsterKill;
    ActorEvents124._customBlock_MonsterKill = function (...args) {
        const monster = args[0];
        Reflect.apply(MonsterKill, this, args);

        if (!cheatState.wide.plunderous) return;

        const hasPlunderBuff = ActorEvents12._customBlock_GetBuffBonuses(318, 1) > 0;
        const allowAllChars = cheatConfig.wide.plunderous.allcharacters;
        if (!hasPlunderBuff && !allowAllChars) return;

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
    };
}

/**
 * Initialize events124 proxies.
 */
export function initEvents124Proxies() {
    setupEvents124Proxies();
}
