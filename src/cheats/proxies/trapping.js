/**
 * Trapping Proxies
 *
 * Multiplies online and away-time trap progress without patching trap arrays,
 * which the game replaces when traps or characters change.
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { events, gga } from "../core/globals.js";
import { createMethodProxy } from "../utils/proxy.js";

function addTrapProgress(traps, elapsedTime) {
    for (const trap of traps) {
        if (trap[2] !== -1) {
            trap[2] += cheatConfig.w3.trapping(elapsedTime) - elapsedTime;
        }
    }
}

function addAllTrapProgress(elapsedTime) {
    addTrapProgress(gga.PlacedTraps, elapsedTime);

    for (const name in gga.PlayerDATABASE.h) {
        addTrapProgress(gga.PlayerDATABASE.h[name].h.PldTraps, elapsedTime);
    }
}

/**
 * Setup online and away-time trapping progress proxies.
 */
export function setupTrappingProxies() {
    const ActorEvents189 = events(189);
    createMethodProxy(ActorEvents189, "_customBlock_1second", (base) => {
        if (cheatState.w3.trapping) addAllTrapProgress(1);
        return base;
    });

    const ActorEvents266 = events(266);
    createMethodProxy(ActorEvents266, "_customBlock_AwayTimers", (base, elapsedTime) => {
        if (cheatState.w3.trapping && elapsedTime > 0 && elapsedTime < 1e8) {
            addAllTrapProgress(elapsedTime);
        }
        return base;
    });
}
