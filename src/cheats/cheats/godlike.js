/**
 * Godlike Cheats
 *
 * Overpowered combat cheats:
 * - reach, crit, ability, food, hitchance, intervention
 * - speed, card, poison, respawn, hp
 */

import { registerCheats } from "../core/registration.js";
import { itemDefs, CList } from "../core/globals.js";

const TARGET_CARDS = ["Boss2A", "Boss2B", "poopBig", "OakTree", "Copper"];

function setWeaponSpeed(params) {
    const speed = params[1] || 9;
    for (const item of Object.values(itemDefs)) {
        if (item.h.typeGen === "aWeapon") {
            item.h.Speed = speed;
        }
    }
    return "All weapon speed set to Turbo. Max speed is 14: higher causes a non-attacking bug.";
}

function boostTargetCards() {
    for (const category of Object.values(CList.CardStuff)) {
        for (const card of Object.values(category)) {
            if (TARGET_CARDS.includes(card[0])) {
                card[4] = "10000";
            }
        }
    }
    return "Target cards altered with insane stats.";
}

registerCheats({
    name: "godlike",
    message: "all godlike powers.",
    canToggleSubcheats: true,
    subcheats: [
        { name: "reach", message: "reach set to 666" },
        { name: "crit", message: "crit set to 100" },
        { name: "ability", message: "no cooldown, no mana cost, cast time 0.1s." },
        { name: "food", message: "food deduction nullification" },
        { name: "hitchance", message: "hitchance set to 100" },
        { name: "intervention", message: "instant divine intervention" },
        { name: "speed", message: "weapon super speed", fn: setWeaponSpeed },
        { name: "card", message: "Efaunt, C.Efaunt, DrDef, Oak and Copper with insane stats", fn: boostTargetCards },
        { name: "poison", message: "instant bubo poison" },
        { name: "respawn", message: "instant mob respawn" },
        { name: "hp", message: "never lose hp, become invincible (when active)" },
    ],
});
