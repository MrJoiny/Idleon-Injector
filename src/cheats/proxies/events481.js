/**
 * ActorEvents_481 Proxies
 *
 * Proxies for ActorEvents_481 functions:
 * - init (storage and Collider timers)
 * - anotherThing (printer storage deposits)
 * - WorkbenchStuff2 (better cogs RNG)
 */

import { cheatState, startupCheats } from "../core/state.js";
import { behavior, events, gga } from "../core/globals.js";
import { withStorageCapScope } from "./storageCap.js";

const hookedTimerClasses = new WeakSet();

/** Install timer interception using the registry's Script before gameReady binds globals. */
export function setupEvents481StorageTimerProxy(ActorEvents481, script) {
    if (hookedTimerClasses.has(ActorEvents481)) return;

    let startupStorageCap = false;
    let startupWide = false;
    for (const command of startupCheats) {
        if (command === "wide") {
            startupWide = !startupWide;
            startupStorageCap = startupWide;
        } else if (command === "wide storagecap") {
            startupStorageCap = !startupStorageCap;
        }
    }

    const init = ActorEvents481.prototype.init;
    ActorEvents481.prototype.init = function (...args) {
        const actor = this.actor;
        const runLater = script.runLater;
        const runPeriodically = script.runPeriodically;
        for (const name of ["runLater", "runPeriodically"]) {
            const Original = script[name];
            script[name] = function (...args) {
                const [delay, callback, target] = args;
                if (target === actor) {
                    const source = Function.prototype.toString.call(callback);
                    const cap =
                        name === "runLater" &&
                        delay === 500 &&
                        /(?:105[eE]7|1050000000)/.test(source) &&
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
                            // Before gameReady, use startup intent without running or double-toggling commands.
                            if (cheatState.wide.storagecap || (gga === null && startupStorageCap)) return;
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
            script.runLater = runLater;
            script.runPeriodically = runPeriodically;
        }
    };
    hookedTimerClasses.add(ActorEvents481);
}

/**
 * Setup all ActorEvents_481 proxies.
 *
 * NOTE: WorkbenchStuff2 intentionally deviates from "base first" pattern.
 * Better cogs cheat requires setting RNG state before calling base
 * to influence the cog quality roll.
 */
export function setupEvents481Proxies() {
    const ActorEvents481 = events(481);
    setupEvents481StorageTimerProxy(ActorEvents481, behavior);

    const anotherThing = ActorEvents481.prototype._customEvent_anotherThing;
    ActorEvents481.prototype._customEvent_anotherThing = function (...args) {
        if (!cheatState.wide.storagecap || !this._TRIGGEREDtext.includes("d")) {
            return Reflect.apply(anotherThing, this, args);
        }
        const descriptor = Object.getOwnPropertyDescriptor(this, "_DNprint");
        let printValue = this._DNprint;
        let produced = null;
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
                    if (descriptor?.get || descriptor?.set) {
                        Object.defineProperty(this, "_DNprint", descriptor);
                        if (descriptor.set) descriptor.set.call(this, printValue);
                    } else if (descriptor) {
                        Object.defineProperty(this, "_DNprint", { ...descriptor, value: printValue });
                    } else {
                        delete this._DNprint;
                        if (printValue !== undefined) {
                            this._DNprint = printValue;
                        }
                    }
                }
            },
            {
                giveAtoms() {
                    return produced !== null;
                },
                setQuantity(target, key, value) {
                    if (produced !== null && Number(value) === 105e7) return target[key];
                    return value;
                },
                giveItem(args, callBase) {
                    if (
                        produced === null ||
                        !Number.isFinite(produced) ||
                        produced <= 0 ||
                        gga.DummyText2 !== "YESputInChest8910nocap"
                    ) {
                        produced = null;
                        return callBase();
                    }
                    args[1] = Math.round(produced);
                    try {
                        return callBase();
                    } finally {
                        produced = null;
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
