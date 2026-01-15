/**
 * Events 312 Proxies
 *
 * Proxies for ActorEvents_312 (items menu):
 * - Preset reset anywhere
 */

import { cheatState } from "../core/state.js";
import { bEngine, events } from "../core/globals.js";

/**
 * Setup items menu proxy (preset reset anywhere).
 */
export function setupItemsMenuProxy() {
    const actorEvents312 = events(312);
    const resetTalPresets = actorEvents312.prototype._event_resetTalPresets;
    actorEvents312.prototype._event_resetTalPresets = function (...args) {
        if (cheatState.unlock.presets) {
            const originalMap = bEngine.getGameAttribute("CurrentMap");
            bEngine.setGameAttribute("CurrentMap", 0);
            Reflect.apply(resetTalPresets, this, args);
            bEngine.setGameAttribute("CurrentMap", originalMap);
            return;
        }
        return Reflect.apply(resetTalPresets, this, args);
    };
}
