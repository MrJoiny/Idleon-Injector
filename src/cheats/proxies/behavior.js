/**
 * Behavior Script Proxies
 *
 * Proxies for Stencyl behavior functions:
 * - randomFloatBetween, randomInt, randomFloat (RNG manipulation)
 * - runLater (instant divine intervention)
 * - runPeriodically (instant bubo poison)
 * - createRecycledActor (no damage text)
 */

import { cheatState } from "../core/state.js";
import { bEngine, behavior } from "../core/globals.js";

/**
 * Setup no damage proxy (block damage text creation).
 *
 * NOTE: Intentionally deviates from "base first" pattern.
 * When cheat is active, we must block actor creation entirely (return null)
 * before the original function runs, as calling base would create the actor.
 */
export function setupNodmgProxy() {
    const createRecycledActor = behavior.createRecycledActor;
    behavior.createRecycledActor = function (...args) {
        // Early return to block damage text actor creation entirely
        if (cheatState.wide.nodmg && typeof args[0] === "object" && args[0].ID === 10) {
            return null;
        }
        return Reflect.apply(createRecycledActor, this, args);
    };
}

/**
 * Setup behavior script proxies for RNG manipulation and ability timing.
 */
export function setupBehaviorScriptProxies() {
    // Proxy randomFloatBetween for RNG manipulation
    behavior.randomFloatBetween = new Proxy(behavior.randomFloatBetween, {
        apply(originalFn, context, args) {
            if (cheatState.rng === "high") return args[1];
            if (cheatState.rng === "low") return args[0];
            if (cheatState.rng) return cheatState.rng;
            return Reflect.apply(originalFn, context, args);
        },
    });

    // Proxy randomInt for RNG manipulation
    behavior.randomInt = new Proxy(behavior.randomInt, {
        apply(originalFn, context, args) {
            // Handle array of RNG values (for sequential manipulation)
            if (Array.isArray(cheatState.rngInt) && cheatState.rngInt.length > 0) {
                const value = cheatState.rngInt.shift();
                if (cheatState.rngInt.length === 0) cheatState.rngInt = value;

                if (value === "high") return args[1];
                if (value === "low") return args[0];
                return value;
            }

            if (cheatState.rngInt === "high") return args[1];
            if (cheatState.rngInt === "low") return args[0];
            if (cheatState.rngInt) return cheatState.rngInt;

            // Force VIP book to always be max level
            if (cheatState.w3?.book && bEngine.getGameAttribute("MenuType2") === 31 && args[0] === 1) {
                return args[1];
            }

            return Reflect.apply(originalFn, context, args);
        },
    });

    // Proxy randomFloat for RNG manipulation
    behavior.randomFloat = new Proxy(behavior.randomFloat, {
        apply(originalFn, context, args) {
            if (cheatState.rngF === "high") return 1.0;
            if (cheatState.rngF === "low") return 0.0;
            if (cheatState.rngF) return cheatState.rngF;
            return Reflect.apply(originalFn, context, args);
        },
    });

    // Proxy runLater for instant divine intervention
    behavior.runLater = new Proxy(behavior.runLater, {
        apply(originalFn, context, args) {
            const behaviorName = args[2]?.behaviors?.behaviors?.[0]?.name;
            if (cheatState.godlike?.intervention && args[0] === 2400 && behaviorName === "ActorEvents_481") {
                args[0] = 0;
            }
            Reflect.apply(originalFn, context, args);
        },
    });

    // Proxy runPeriodically for instant bubo poison
    behavior.runPeriodically = new Proxy(behavior.runPeriodically, {
        apply(originalFn, context, args) {
            const behaviorName = args[2]?.behaviors?.behaviors?.[0]?.name;
            if (cheatState.godlike?.poison && args[0] === 2e3 && behaviorName === "ActorEvents_575") {
                args[0] = 5;
            }
            Reflect.apply(originalFn, context, args);
        },
    });
}
