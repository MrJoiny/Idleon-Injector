/**
 * Events 034 Proxies
 *
 * Proxies for ActorEvents_34 (item get notifications):
 * - Hide item pickup notifications for autoloot
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { bEngine, events, behavior } from "../core/globals.js";

/**
 * Setup item get notification proxy (hide notifications for autoloot).
 */
export function setupItemGetNotificationProxy() {
    const hxOverrides = window.HxOverrides;
    const actorEvents34 = events(34);
    const ItemGet = actorEvents34.prototype._event_ItemGet;
    actorEvents34.prototype._event_ItemGet = function (...args) {
        if (
            cheatState.wide.autoloot &&
            cheatConfig.wide.autoloot.hidenotifications &&
            [0, 1].includes(this._Deployment)
        ) {
            hxOverrides.remove(bEngine.getGameAttribute("ItemGetPixelQueue"), this.actor);
            behavior.recycleActor(this.actor);
            return;
        }
        return Reflect.apply(ItemGet, this, args);
    };
}
