/**
 * Miscellaneous Proxies
 *
 * Proxies that don't fit elsewhere:
 * - Ability (no cooldown, no cast time, no mana)
 * - Time candy (custom candy duration)
 * - Quest (free quest requirements)
 * - Smith (free crafting)
 */

import { cheatConfig, cheatState } from "../core/state.js";
import { cList, customMaps, itemDefs, dialogueDefs, gameContext } from "../core/globals.js";
import { deepCopy } from "../utils/deepCopy.js";

/**
 * Setup ability proxy (no cooldown, no cast time, no mana cost).
 */
export function setupAbilityProxy() {
    if (customMaps.atkMoveMap.h._isPatched) return;

    const atkMoveMap = deepCopy(customMaps.atkMoveMap.h);
    for (const value of Object.values(atkMoveMap)) {
        value.h.cooldown = 0;
        value.h.castTime = 0.1;
        value.h.manaCost = 0;
    }
    const handler = {
        get(obj, prop) {
            if (cheatState.godlike.ability) return atkMoveMap[prop];
            return Reflect.get(obj, prop);
        },
    };

    // Tag the original object so we know it's patched
    Object.defineProperty(customMaps.atkMoveMap.h, "_isPatched", { value: true, enumerable: false });

    const proxy = new Proxy(customMaps.atkMoveMap.h, handler);
    customMaps.atkMoveMap.h = proxy;
}

/**
 * Setup time candy proxy (custom candy duration).
 */
export function setupTimeCandyProxy() {
    const timeCandy = itemDefs.Timecandy1.h;
    if (timeCandy._isPatched) return;

    const originalID = timeCandy.ID;

    Object.defineProperty(timeCandy, "_isPatched", { value: true, enumerable: false });

    Object.defineProperty(timeCandy, "ID", {
        get() {
            if (cheatState.wide.candytime) {
                const configuredValue = cheatConfig.wide.candytime;
                return !isNaN(configuredValue) ? configuredValue : 600;
            }
            return originalID;
        },
        enumerable: true,
        configurable: true,
    });
}

/**
 * Setup quest proxy (free quest requirements).
 */
export function setupQuestProxy() {
    const defs = dialogueDefs.dialogueDefs.h;
    if (defs._isPatched) return;

    const defsOriginal = deepCopy(defs);
    const defsUpdated = deepCopy(defs);

    // Go over all the quest-giving NPCs
    for (const [key, value] of Object.entries(defsUpdated)) {
        for (let i = 0; i < value[1].length; i++) {
            if (value[1][i].length === 9) {
                if (value[1][i][2] === value[1][i][8]) {
                    for (let j = 0; j < value[1][i][3].length; j++) {
                        defsUpdated[key][1][i][3][j][1] = 0;
                        defsUpdated[key][1][i][3][j][3] = 0;
                    }
                } else {
                    for (let j = 0; j < value[1][i][3].length; j++) {
                        defsUpdated[key][1][i][3][j] = 0;
                    }
                }
            }
        }
    }

    Object.defineProperty(defs, "_isPatched", { value: true, enumerable: false });

    for (const key of Object.keys(defsUpdated)) {
        Object.defineProperty(defs, key, {
            get() {
                return cheatState.wide.quest ? defsUpdated[key] : defsOriginal[key];
            },
            enumerable: true,
        });
    }
}

/**
 * Setup smithing proxy (free crafting).
 */
export function setupSmithProxy() {
    const customListsScript = gameContext["scripts.CustomLists"];
    if (typeof customListsScript?.ItemToCraftCostTYPE !== "function") return;
    if (customListsScript.ItemToCraftCostTYPE._isPatched) return;

    const sizes = Object.values(cList.ItemToCraftEXP).map((element) => element.length);
    const newReqs = sizes.map((size) => new Array(size).fill([["Copper", "0"]]));

    const handler = {
        apply(originalFn, context, args) {
            if (cheatState.w1.smith) return newReqs;
            return Reflect.apply(originalFn, context, args);
        },
    };

    // Tag the original function
    Object.defineProperty(customListsScript.ItemToCraftCostTYPE, "_isPatched", { value: true, enumerable: false });

    const proxy = new Proxy(customListsScript.ItemToCraftCostTYPE, handler);
    customListsScript.ItemToCraftCostTYPE = proxy;
}
