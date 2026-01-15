/**
 * ActorEvents_481 Proxies
 *
 * Proxies for ActorEvents_481 functions:
 * - WorkbenchStuff2 (better cogs RNG)
 */

import { cheatState } from "../core/state.js";
import { events } from "../core/globals.js";

/**
 * Setup all ActorEvents_481 proxies.
 */
export function setupEvents481Proxies() {
    const ActorEvents481 = events(481);

    // Better cogs (W3 cogs with high RNG)
    const WorkbenchStuff2 = ActorEvents481.prototype._customEvent_WorkbenchStuff2;
    ActorEvents481.prototype._customEvent_WorkbenchStuff2 = function (...args) {
        // Special case: modify RNG state before calling base
        if (cheatState.w3.bettercog && this._TRIGGEREDtext.includes("k")) {
            cheatState.rng = "high";
            const base = Reflect.apply(WorkbenchStuff2, this, args);
            cheatState.rng = false;
            return base;
        }

        return Reflect.apply(WorkbenchStuff2, this, args);
    };
}

/**
 * Initialize events481 proxies.
 */
export function initEvents481Proxies() {
    setupEvents481Proxies();
}
