/**
 * Multiply Cheats
 *
 * Stat multiplier cheats:
 * - damage, efficiency, afk, drop, money
 * - classexp, crystal, skillexp, shopstock, printer
 */

import { registerCheats } from "../core/registration.js";

/**
 * Value transformer for multiplier cheats.
 * Converts numeric string to a function that multiplies by that value.
 */
const multiplierTransformer = {
    valueTransformer: (val) => (!isNaN(val) ? new Function(`return t => t * ${val}`)() : val),
};

// Stat multiplier cheats
registerCheats({
    name: "multiply",
    message:
        "Multiplies stats by the number (or applies function) given. use reasonably, ridiculous numbers can cause shadowbanning!",
    subcheats: [
        {
            name: "damage",
            message: "Multiplies damage by the number given (use reasonably!)",
            configurable: multiplierTransformer,
        },
        {
            name: "efficiency",
            message: "Multiplies skill efficiency by the number given (use reasonably!)",
            configurable: multiplierTransformer,
        },
        {
            name: "afk",
            message: "Multiplies AFK % by the number given (use reasonably!)",
            configurable: multiplierTransformer,
        },
        {
            name: "drop",
            message: "Multiplies drop rate by the number given (use reasonably!)",
            configurable: multiplierTransformer,
        },
        {
            name: "money",
            message: "Multiplies coin drops by the number given (use reasonably!)",
            configurable: multiplierTransformer,
        },
        {
            name: "classexp",
            message: "Multiplies class EXP by the number given (use reasonably!)",
            configurable: multiplierTransformer,
        },
        {
            name: "crystal",
            message: "Multiplies crystal spawn rate by the number given (use reasonably!)",
            configurable: multiplierTransformer,
        },
        {
            name: "skillexp",
            message: "Multiplies skill EXP by the number given (use reasonably!)",
            configurable: multiplierTransformer,
        },
        {
            name: "shopstock",
            message: "Multiplies town shop stock by the number given (works after daily reset)",
            configurable: multiplierTransformer,
        },
        { name: "printer", message: "Multiplies sample print by x, overrides lab/god bonus", configurable: true },
    ],
});
