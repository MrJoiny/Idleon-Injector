/**
 * Events 312 Proxies
 *
 * Proxies for ActorEvents_312 (items menu):
 * - Preset reset anywhere
 */

import { cheatState } from "../core/state.js";
import { events, gga } from "../core/globals.js";

/**
 * Setup items menu proxy (preset reset anywhere).
 *
 * NOTE: Intentionally deviates from "base first" pattern.
 * Preset reset cheat requires temporarily modifying CurrentMap before calling base
 * to bypass the location check, then restoring the original value.
 */
export function setupItemsMenuProxy() {
    const actorEvents312 = events(312);
    const resetTalPresets = actorEvents312.prototype._event_resetTalPresets;
    actorEvents312.prototype._event_resetTalPresets = function (...args) {
        if (cheatState.unlock.presets) {
            const originalMap = gga.CurrentMap;
            gga.CurrentMap = 0;
            Reflect.apply(resetTalPresets, this, args);
            gga.CurrentMap = originalMap;
            return;
        }
        return Reflect.apply(resetTalPresets, this, args);
    };
}
