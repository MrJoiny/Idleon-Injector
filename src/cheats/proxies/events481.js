/**
 * ActorEvents_481 Proxies
 *
 * Proxies for ActorEvents_481 functions:
 * - WorkbenchStuff2 (better cogs RNG)
 */

import { cheatState } from "../core/state.js";
import { events } from "../core/globals.js";

/**
 * Setup better cogs proxy (W3 cogs with high RNG).
 */
export function setupWorkbenchStuff2Proxy() {
    const actorEvents481 = events(481);

    const Workbenchstuff = actorEvents481.prototype._customEvent_WorkbenchStuff2;
    actorEvents481.prototype._customEvent_WorkbenchStuff2 = new Proxy(Workbenchstuff, {
        apply: function (originalFn, context, argumentsList) {
            try {
                if (cheatState.w3.bettercog && -1 != context._TRIGGEREDtext.indexOf("k")) {
                    cheatState.rng = "high";
                    const rtn = Reflect.apply(originalFn, context, argumentsList);
                    cheatState.rng = false;
                    return rtn;
                }
            } catch (e) {
                console.error("Error in Better Cogs Proxy:", e);
            }
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });
}

/**
 * Setup all ActorEvents_481 proxies.
 */
export function setupEvents481Proxies() {
    setupWorkbenchStuff2Proxy();
}

/**
 * Initialize events481 proxies.
 */
export function initEvents481Proxies() {
    setupEvents481Proxies();
}
