/**
 * Godlike Cheats
 *
 * Overpowered combat cheats:
 * - reach, crit, ability, food, hitchance, intervention
 * - speed, card, poison, respawn, hp
 */

import { registerCheats } from "../core/registration.js";
import { itemDefs, CList } from "../core/globals.js";

// Godlike combat cheats
registerCheats({
    name: "godlike",
    message: "all godlike powers.",
    canToggleSubcheats: true,
    subcheats: [
        { name: "reach", message: "reach set to 666" },
        { name: "crit", message: "crit set to 100" },
        {
            name: "ability",
            message: "zero ability cooldown, mana cost nullification and cast time 0.1s.",
        },
        { name: "food", message: "food deduction nullification" },
        { name: "hitchance", message: "hitchance set to 100" },
        { name: "intervention", message: `instant divine intervention` },
        {
            name: "speed",
            message: "weapon super speed",
            fn: function (params) {
                for (const [index, element] of Object.entries(itemDefs))
                    if (element.h["typeGen"] === "aWeapon") itemDefs[index].h["Speed"] = params[1] || 9;
                return `All weapon speed are up to Turbo. \nThe max speed parameter you can set is 14: Higher will cause a non-attacking bug.`;
            },
        },
        {
            name: "card",
            message: "Efaunt, Chaotic Efaunt, Dr Defecaus, Oak Tree and Copper are altered with insane stats",
            fn: function (params) {
                const CardStuff = CList.CardStuff;
                const TargetCards = ["Boss2A", "Boss2B", "poopBig", "OakTree", "Copper"];
                for (const [key1, value1] of Object.entries(CardStuff))
                    for (const [key2, value2] of Object.entries(value1))
                        if (TargetCards.includes(value2[0])) CardStuff[key1][key2][4] = "10000";
                return `The cards Efaunt, Chaotic Efaunt, Dr Defecaus, Oak Tree and Copper have been altered with insane stats.`;
            },
        },
        { name: "poison", message: "instant bubo poison" },
        { name: "respawn", message: "instant mob respawn", configurable: true },
        { name: "hp", message: "never lose hp, become invincible (when active)" },
    ],
});
