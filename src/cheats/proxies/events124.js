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
}
