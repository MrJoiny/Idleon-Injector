/**
 * ActorEvents_713 Proxies (W7 Spelunking)
 */

import { events, gga } from "../core/globals.js";
import { cheatConfig } from "../core/state.js";
import { createMethodProxy } from "../utils/proxy.js";

/**
 * Setup ActorEvents_713 proxies.
 */
export function setupEvents713Proxies() {
    const actorEvents713 = events(713);

    createMethodProxy(actorEvents713.prototype, "_customEvent_SpelunkStuff", function (base) {
        // Only apply when spelunking menu is active (MenuType2 === 82)
        if (gga.MenuType2 !== 82) return base;

        const targetDepth = cheatConfig.w7.spelunkdepth;
        if (targetDepth && targetDepth > 0 && this._GenINFO) {
            this._GenINFO[70] = targetDepth - 1;
            cheatConfig.w7.spelunkdepth = 0;
        }
        return base;
    });
}
