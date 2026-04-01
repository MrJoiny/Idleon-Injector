/**
 * Events 020 Proxies
 *
 * Proxies for ActorEvents_20 (player actor init):
 * - Big model scale override for all players
 */

import { cheatState, cheatConfig } from "../core/state.js";
import { events } from "../core/globals.js";

const DEFAULT_SIZE = 300;

/**
 * Setup player model size proxy.
 *
 * NOTE: Intentionally deviates from "base first" pattern.
 * We override actor.growTo during ActorEvents_20.init to force size globally.
 */
export function setupEvents020Proxies() {
    const actorEvents20 = events(20);
    if (!actorEvents20?.prototype?.init) return;

    if (actorEvents20.prototype._bigModelPatched) return;
    Object.defineProperty(actorEvents20.prototype, "_bigModelPatched", { value: true, enumerable: false });

    const originalInit = actorEvents20.prototype.init;
    actorEvents20.prototype.init = function (...args) {
        if (!cheatState.wide?.bigmodel) {
            return Reflect.apply(originalInit, this, args);
        }

        const actor = this.actor;
        const originalGrowTo = actor?.growTo;
        const canPatchGrowTo = typeof originalGrowTo === "function";

        if (!canPatchGrowTo) {
            return Reflect.apply(originalInit, this, args);
        }

        const targetSize = resolveBigModelSize();
        const targetScale = targetSize / 100;
        let growToOverridden = false;
        try {
            actor.growTo = function (...growArgs) {
                const patchedArgs = [targetScale, targetScale, ...growArgs.slice(2)];
                return Reflect.apply(originalGrowTo, this, patchedArgs);
            };
            growToOverridden = true;

            const base = Reflect.apply(originalInit, this, args);
            this._PlayerSize = targetSize;
            return base;
        } finally {
            if (growToOverridden) {
                actor.growTo = originalGrowTo;
            }
        }
    };
}

/**
 * Resolve the configured big model size with a safe fallback.
 *
 * @returns {number} Target player size.
 */
function resolveBigModelSize() {
    const configuredSize = cheatConfig?.wide?.bigmodel;
    if (typeof configuredSize === "number" && Number.isFinite(configuredSize) && configuredSize > 0) {
        return configuredSize;
    }
    return DEFAULT_SIZE;
}
