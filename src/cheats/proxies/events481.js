/**
 * ActorEvents_481 Proxies
 *
 * Proxies for ActorEvents_481 functions:
 * - init (storage and Collider timers)
 * - anotherThing (printer storage deposits)
 * - WorkbenchStuff2 (better cogs RNG)
 */

import { cheatState } from "../core/state.js";
import { behavior, events, gga } from "../core/globals.js";
import { withStorageCapScope } from "./storageCap.js";

/**
 * Setup all ActorEvents_481 proxies.
 *
 * NOTE: WorkbenchStuff2 intentionally deviates from "base first" pattern.
 * Better cogs cheat requires setting RNG state before calling base
 * to influence the cog quality roll.
 */
export function setupEvents481Proxies() {
    const ActorEvents481 = events(481);

    const init = ActorEvents481.prototype.init;
    ActorEvents481.prototype.init = function (...args) {
        const actor = this.actor;
        const runLater = behavior.runLater;
        const runPeriodically = behavior.runPeriodically;
        for (const name of ["runLater", "runPeriodically"]) {
            const Original = behavior[name];
            behavior[name] = function (...args) {
                const [delay, callback, target] = args;
                if (target === actor) {
                    const source = Function.prototype.toString.call(callback);
                    const cap =
                        name === "runLater" &&
                        delay === 500 &&
                        source.includes("105E7") &&
                        source.includes("ChestQuantity") &&
                        source.includes("GiveAtoms");
                    const collider =
                        name === "runLater" &&
                        delay === 6000 &&
                        source.includes("AtomThreshold") &&
                        source.includes("GiveAtoms");
                    const condense = name === "runPeriodically" && delay === 6000 && source.includes("CondenseChest2B");
                    if (cap || collider || condense) {
                        args[1] = function (...args) {
                            // These callbacks only convert storage to atoms; calling base would lose the stack.
                            if (cheatState.wide.storagecap) return;
                            return Reflect.apply(callback, this, args);
                        };
                    }
                }
                return Reflect.apply(Original, this, args);
            };
        }
        try {
            return Reflect.apply(init, this, args);
        } finally {
            behavior.runLater = runLater;
            behavior.runPeriodically = runPeriodically;
        }
    };

    const anotherThing = ActorEvents481.prototype._customEvent_anotherThing;
    ActorEvents481.prototype._customEvent_anotherThing = function (...args) {
        if (!cheatState.wide.storagecap || !this._TRIGGEREDtext.includes("d")) {
            return Reflect.apply(anotherThing, this, args);
        }
        const descriptor = Object.getOwnPropertyDescriptor(this, "_DNprint");
        let printValue = this._DNprint;
        let produced = null;
        let granting = false;
        let destination = -1;
        let total = 0;
        return withStorageCapScope(
            () => {
                Object.defineProperty(this, "_DNprint", {
                    configurable: true,
                    enumerable: descriptor ? descriptor.enumerable : true,
                    get: () => printValue,
                    set(value) {
                        printValue = value;
                        if (produced === null) produced = value;
                    },
                });
                try {
                    return Reflect.apply(anotherThing, this, args);
                } finally {
                    if (descriptor) {
                        Object.defineProperty(this, "_DNprint", descriptor);
                        if (descriptor.set) descriptor.set.call(this, printValue);
                        else this._DNprint = printValue;
                    } else {
                        delete this._DNprint;
                        this._DNprint = printValue;
                    }
                }
            },
            {
                giveAtoms() {
                    return produced !== null;
                },
                setQuantity(target, key, value) {
                    if (produced !== null) {
                        if (granting && Number(key) === destination) return total;
                        if (!granting && value === 105e7) return target[key];
                    }
                    return value;
                },
                giveItem(args, callBase) {
                    if (produced === null || gga.DummyText2 !== "YESputInChest8910nocap") return callBase();
                    args[1] = Math.round(produced);
                    destination = gga.ChestOrder.indexOf(args[0]);
                    if (destination >= 0) total = Number(gga.ChestQuantity[destination]) + args[1];
                    granting = true;
                    try {
                        return callBase();
                    } finally {
                        produced = null;
                        granting = false;
                    }
                },
            }
        );
    };

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
