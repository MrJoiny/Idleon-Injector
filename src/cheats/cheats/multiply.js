/**
 * Multiply Cheats
 *
 * Stat multiplier cheats:
 * - damage, efficiency, afk, drop, money
 * - classexp, crystal, skillexp, shopstock, printer, carrycap
 */

import { registerCheats } from "../core/registration.js";

// Stat multiplier cheats
registerCheats({
    name: "multiply",
    message:
        "Multiplies stats by the number (or applies function) given. use reasonably, ridiculous numbers can cause shadowbanning!",
    needsParam: true,
    subcheats: [
        {
            name: "damage",
            message: "Multiplies damage by the number given (use reasonably!)",
            configurable: true,
        },
        {
            name: "efficiency",
            message: "Multiplies skill efficiency by the number given (use reasonably!)",
            configurable: true,
        },
        {
            name: "afk",
            message: "Multiplies AFK % by the number given (use reasonably!)",
            configurable: true,
        },
        {
            name: "drop",
            message: "Multiplies drop rate by the number given (use reasonably!)",
            configurable: true,
        },
        {
            name: "money",
            message: "Multiplies coin drops by the number given (use reasonably!)",
            configurable: true,
        },
        {
            name: "classexp",
            message: "Multiplies class EXP by the number given (use reasonably!)",
            configurable: true,
        },
        {
            name: "crystal",
            message: "Multiplies crystal spawn rate by the number given (use reasonably!)",
            configurable: true,
        },
        {
            name: "skillexp",
            message: "Multiplies skill EXP by the number given (use reasonably!)",
            configurable: true,
        },
        {
            name: "shopstock",
            message: "Multiplies town shop stock by the number given (works after daily reset)",
            configurable: true,
        },
        {
            name: "printer",
            message: "Multiplies sample print by x, overrides lab/god bonus",
            configurable: true,
        },
        {
            name: "carrycap",
            message: "Multiplies carry capacity by the number given",
            configurable: true,
        },
    ],
});
