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
 * Setup stamp cost reduction proxy.
 */
export function setupStampCostProxy() {
    events(124)._customBlock_StampCostss = new Proxy(events(124)._customBlock_StampCostss, {
        apply: function (originalFn, context, argumentsList) {
            if (!cheatState.w1.stampcost) return Reflect.apply(originalFn, context, argumentsList);

            const result = Reflect.apply(originalFn, context, argumentsList);
            const currency = result[0];
            const cost = result[1];

            return [currency, cheatConfig.w1.stampcost(cost)];
        },
    });
}

/**
 * Setup AFK gain rate multiplier proxy.
 */
export function setupAFKRateProxy() {
    const getMultiplyValue = (key) => cheatConfig?.multiply?.[key] ?? 1;
    events(124)._customBlock_AFKgainrates = new Proxy(events(124)._customBlock_AFKgainrates, {
        apply: (originalFn, context, argumentsList) => {
            if (cheatState.multiply.afk)
                return Reflect.apply(originalFn, context, argumentsList) * getMultiplyValue("afk");
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });
}

/**
 * Setup player load proxy for perfect obols.
 */
export function setupPlayerLoadProxy() {
    const loadPlayerInfo = events(124)._customBlock_LoadPlayerInfo;
    events(124)._customBlock_LoadPlayerInfo = function (...argumentsList) {
        const rtn = Reflect.apply(loadPlayerInfo, this, argumentsList);
        try {
            if (cheatState.wide.perfectobols && rollAllObols) rollAllObols();
        } catch (e) {
            console.log(e.toString());
        }
        return rtn;
    };
}

/**
 * Setup talent number modification proxy.
 */
export function setupTalentProxy() {
    const getTalentNumber = events(124)._customBlock_GetTalentNumber;
    events(124)._customBlock_GetTalentNumber = (...argumentsList) => {
        return cheatState.talent[argumentsList[1]]
            ? cheatConfig.talent[argumentsList[1]](Reflect.apply(getTalentNumber, this, argumentsList), argumentsList)
            : Reflect.apply(getTalentNumber, this, argumentsList);
    };
}

/**
 * Setup monster kill proxy for plunderous respawn.
 */
export function setupMonsterKillProxy() {
    const monsterKill = events(124)._customBlock_MonsterKill;
    events(124)._customBlock_MonsterKill = (...argumentsList) => {
        const e = argumentsList[0];
        Reflect.apply(monsterKill, this, argumentsList);
        if (
            cheatState.wide.plunderous &&
            (0 < events(12)._customBlock_GetBuffBonuses(318, 1) || cheatConfig.wide.plunderous.allcharacters) &&
            bEngine.gameAttributes.h.DummyText3 !== "nah" &&
            !bEngine
                .getGameAttribute("CustomLists")
                .h.NonAFKmonsters.includes(e.getValue("ActorEvents_1", "_MonsterType")) &&
            e.getValue("ActorEvents_1", "_TempMonster") === 0
        ) {
            (bEngine.gameAttributes.h.DummyText3 = "PiratePlunderMonster"),
                events(124)._customBlock_CreateMonster(
                    `${e.getValue("ActorEvents_1", "_MonsterType")}`,
                    behavior.asNumber(e.getValue("ActorEvents_1", "_MonsterNODE")),
                    e.getXCenter()
                ),
                events(124)._customBlock_AddStatusToMonster("StatusPlunder", behavior.getLastCreatedActor(), 36e5),
                (bEngine.gameAttributes.h.DummyText3 = "nah");
        }
    };
}

/**
 * Setup all ActorEvents_124 proxies.
 */
export function setupEvents124Proxies() {
    setupStampCostProxy();
    setupAFKRateProxy();
    setupPlayerLoadProxy();
    setupTalentProxy();
    setupMonsterKillProxy();
}

/**
 * Initialize events124 proxies.
 */
export function initEvents124Proxies() {
    setupEvents124Proxies();
}
