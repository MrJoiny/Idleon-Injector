/**
 * Player Name Rendering Proxies
 *
 * Hides player names under characters when enabled.
 * - ActorEvents_91: in-world nametag images
 */

import { cheatState } from "../core/state.js";
import { events } from "../core/globals.js";
import { createMethodProxy } from "../utils/proxy.js";

const hideNameImages = (instance) => {
    if (!instance?._NameImgInst) return;

    for (const group of instance._NameImgInst) {
        if (!Array.isArray(group)) continue;
        for (const img of group) {
            if (img?.set_alpha) img.set_alpha(0);
        }
    }
};

/**
 * Setup player name rendering proxies.
 */
export function setupEvents091Proxies() {
    const actorEvents91 = events(91);

    createMethodProxy(actorEvents91.prototype, "_event_Updating", function (base) {
        if (cheatState.wide.hidenames) hideNameImages(this);
        return base;
    });

    createMethodProxy(actorEvents91.prototype, "init", function (base) {
        if (cheatState.wide.hidenames) hideNameImages(this);
        return base;
    });
}
