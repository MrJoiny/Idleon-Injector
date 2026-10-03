import { cheatState } from "../core/state.js";
import { events, gga } from "../core/globals.js";
import { withStorageCapScope } from "./storageCap.js";

/** Setup AFK storage deposits while preserving claim cleanup and remaining drops. */
export function setupEvents203Proxies() {
    const ActorEvents203 = events(203);
    for (const name of ["_event_Click", "_customEvent_AutoClaimio"]) {
        const Original = ActorEvents203.prototype[name];
        ActorEvents203.prototype[name] = function (...args) {
            if (!cheatState.wide.storagecap) return Reflect.apply(Original, this, args);
            let destination = -1;
            let total = null;
            return withStorageCapScope(() => Reflect.apply(Original, this, args), {
                giveAtoms: () => {
                    const item = this._DummyText;
                    const incoming = Number(
                        this._ItemsToDROP.find((entry) => entry[0] === item && Number(entry[1]) > 0)[1]
                    );
                    destination = gga.ChestOrder.indexOf(item);
                    if (destination >= 0) total = Number(gga.ChestQuantity[destination]) + incoming;
                    else {
                        destination = gga.ChestOrder.indexOf("Blank");
                        total = incoming;
                    }
                    return true;
                },
                setQuantity(target, key, value) {
                    if (total !== null && Number(key) === destination && value === 105e7) {
                        value = total;
                        total = null;
                    }
                    return value;
                },
            });
        };
    }
}
