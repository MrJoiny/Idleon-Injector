/**
 * Behavior Script Proxies
 *
 * Proxies for Stencyl behavior functions:
 * - randomFloatBetween, randomInt, randomFloat (RNG manipulation)
 * - runLater (instant divine intervention)
 * - runPeriodically (instant bubo poison)
 */

import { cheatState } from "../core/state.js";
import { bEngine, behavior } from "../core/globals.js";

/**
 * Setup behavior script proxies for RNG manipulation and ability timing.
 */
export function setupBehaviorScriptProxies() {
    // Proxy randomFloatBetween for RNG manipulation
    behavior.randomFloatBetween = new Proxy(behavior.randomFloatBetween, {
        apply: function (originalFn, context, argumentsList) {
            if (cheatState.rng === "high") return argumentsList[1];
            if (cheatState.rng === "low") return argumentsList[0];
            if (cheatState.rng) return cheatState.rng;
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });

    // Proxy randomInt for RNG manipulation
    behavior.randomInt = new Proxy(behavior.randomInt, {
        apply: function (originalFn, context, argumentsList) {
            // Handle array of RNG values (for sequential manipulation)
            if (Array.isArray(cheatState.rngInt) && cheatState.rngInt.length > 0) {
                const value = cheatState.rngInt[0];
                cheatState.rngInt.shift();
                if (cheatState.rngInt.length <= 0) cheatState.rngInt = value;

                if (value === "high") return argumentsList[1];
                if (value === "low") return argumentsList[0];
                return value; // If it's a numeric value
            } else if (cheatState.rngInt === "high") {
                return argumentsList[1];
            } else if (cheatState.rngInt === "low") {
                return argumentsList[0];
            } else if (cheatState.rngInt) {
                return cheatState.rngInt;
            }

            // Force VIP book to always be max level
            if (cheatState.w3?.book && bEngine.getGameAttribute("MenuType2") == 31 && argumentsList[0] == 1) {
                return argumentsList[1];
            }

            return Reflect.apply(originalFn, context, argumentsList);
        },
    });

    // Proxy randomFloat for RNG manipulation
    behavior.randomFloat = new Proxy(behavior.randomFloat, {
        apply: function (originalFn, context, argumentsList) {
            if (cheatState.rngF === "high") return 1.0;
            if (cheatState.rngF === "low") return 0.0;
            if (cheatState.rngF) return cheatState.rngF;
            return Reflect.apply(originalFn, context, argumentsList);
        },
    });

    // Proxy runLater for instant divine intervention
    behavior.runLater = new Proxy(behavior.runLater, {
        apply: function (originalFn, context, argumentsList) {
            try {
                if (
                    cheatState.godlike?.intervention &&
                    argumentsList[0] == 2400 &&
                    argumentsList[2]?.behaviors?.behaviors?.[0]?.name == "ActorEvents_481"
                ) {
                    argumentsList[0] = 0;
                }
            } catch (e) {}

            Reflect.apply(originalFn, context, argumentsList);
        },
    });

    // Proxy runPeriodically for instant bubo poison
    behavior.runPeriodically = new Proxy(behavior.runPeriodically, {
        apply: function (originalFn, context, argumentsList) {
            try {
                if (
                    cheatState.godlike?.poison &&
                    argumentsList[0] == 2e3 &&
                    argumentsList[2]?.behaviors?.behaviors?.[0]?.name == "ActorEvents_575"
                ) {
                    argumentsList[0] = 5;
                }
            } catch (e) {}

            Reflect.apply(originalFn, context, argumentsList);
        },
    });
}
