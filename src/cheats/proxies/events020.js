/**
 * Events 020 Proxies
 *
 * Proxies for ActorEvents_20 (player actor init):
 * - Big model scale override for all players
 */

import { cheatState, cheatConfig } from "../core/state.js";
import { events } from "../core/globals.js";

/**
 * Setup player model size proxy.
 *
 * Override actor.growTo during ActorEvents_20.init to force size globally.
 */
export function setupEvents020Proxies() {
    const actorEvents20 = events(20);

    const originalInit = actorEvents20.prototype.init;
    actorEvents20.prototype.init = function (...args) {
        if (!cheatState.wide.bigmodel) {
            return Reflect.apply(originalInit, this, args);
        }

        const actor = this.actor;
        const originalGrowTo = actor.growTo;

        const targetSize = cheatConfig.wide.bigmodel;
        const targetScale = targetSize / 100;

        // Intercept `growTo` before calling the base init instead of modifying scale after.
        // This prevents characters from being normal size when swapping maps and then growing to the bigger size.
        actor.growTo = function (...growArgs) {
            return Reflect.apply(originalGrowTo, this, [targetScale, targetScale, ...growArgs.slice(2)]);
        };

        const base = Reflect.apply(originalInit, this, args);

        this._PlayerSize = targetSize;
        actor.growTo = originalGrowTo;

        return base;
    };
}
