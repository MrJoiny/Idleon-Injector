/**
 * Godlike Cheats
 *
 * Overpowered combat cheats:
 * - reach, crit, ability, food, hitchance, intervention
 * - speed, card, poison, respawn, hp
 */

import { registerCheats } from "../core/registration.js";

registerCheats({
    name: "godlike",
    message: "all godlike powers.",
    allowToggleChildren: true,
    subcheats: [
        { name: "reach", message: "reach set to 666" },
        { name: "crit", message: "crit set to 100" },
        { name: "ability", message: "no cooldown, no mana cost, cast time 0.1s." },
        { name: "food", message: "food deduction nullification" },
        { name: "hitchance", message: "hitchance set to 100" },
        { name: "intervention", message: "instant divine intervention" },
        { name: "speed", message: "weapon super speed (default 9)", configurable: true },
        { name: "card", message: "All cards get 100x stat multiplier" },
        { name: "poison", message: "instant bubo poison" },
        { name: "respawn", message: "instant mob respawn" },
        { name: "hp", message: "never lose hp, become invincible (when active)" },
    ],
});
