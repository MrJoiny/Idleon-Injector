/**
 * Actor Model Proxies
 */

import { cheatState } from "../core/state.js";
import { ActorModel } from "../core/globals.js";

/**
 * Setup Actor model proxies.
 */
export function setupActorProxies() {
    if (!ActorModel || !ActorModel.prototype) return;
    if (ActorModel.prototype.internalUpdate._isPatched) return;

    const originalInternalUpdate = ActorModel.prototype.internalUpdate;

    ActorModel.prototype.internalUpdate = function (elapsed, isAnimationTime) {
        const animTime = cheatState.wide?.noanim ? false : isAnimationTime;
        return Reflect.apply(originalInternalUpdate, this, [elapsed, animTime]);
    };

    ActorModel.prototype.internalUpdate._isPatched = true;
}
