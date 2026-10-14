import { cheatState } from "../core/state.js";
import { events, gga } from "../core/globals.js";
import { withStorageCapScope } from "./storageCap.js";

const proxiedClasses = new WeakSet();

/** Setup AFK storage deposits while preserving claim cleanup and remaining drops. */
export function setupEvents203Proxies(ActorEvents203 = events(203)) {
    if (proxiedClasses.has(ActorEvents203)) return;
    for (const name of ["_event_Click", "_customEvent_AutoClaimio"]) {
        const Original = ActorEvents203.prototype[name];
        ActorEvents203.prototype[name] = function (...args) {
            if (!cheatState.wide.storagecap) return Reflect.apply(Original, this, args);
            let destination = -1;
            let total = null;
            return withStorageCapScope(() => Reflect.apply(Original, this, args), {
                giveAtoms: () => {
                    const item = this._DummyText;
                    const drop = this._ItemsToDROP.find((entry) => entry[0] === item && Number(entry[1]) > 0);
                    if (!drop) return false;
                    const incoming = Number(drop[1]);
                    if (!Number.isFinite(incoming) || incoming <= 0) return false;
                    const order = gga.ChestOrder;
                    destination = order.indexOf(item);
                    if (destination >= 0) {
                        total = Math.round(Number(gga.ChestQuantity[destination]) + incoming);
                    } else {
                        destination = order.indexOf("Blank");
                        if (destination < 0) return false;
                        total = Math.round(incoming);
                    }
                    return true;
                },
                setQuantity(target, key, value) {
                    if (total !== null && Number(key) === destination && Number(value) === 105e7) {
                        value = total;
                        total = null;
                    }
                    return value;
                },
            });
        };
    }
    proxiedClasses.add(ActorEvents203);
}
