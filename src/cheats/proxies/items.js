/**
 * Item Definition Proxies
 *
 * Proxies for item definitions (itemDefs).
 * These replace destructive modifications with toggleable proxies.
 *
 * Cheats covered:
 * - godlike speed: Weapon attack speed override
 * - upstones rng: Upgrade stone 100% success
 * - upstones use: Upgrade stone no slot consumption
 * - equipall: Any item equippable by any class at level 1
 * - wide candytime: Custom time candy duration
 */

import { cheatState, cheatConfig } from "../core/state.js";
import { itemDefs } from "../core/globals.js";
import { createProxy } from "../utils/proxy.js";

/**
 * Setup weapon speed proxy for godlike speed cheat.
 * Intercepts the Speed property on all weapons.
 * When enabled, returns configurable speed value (default 9).
 */
export function setupWeaponSpeedProxy() {
    for (const item of Object.values(itemDefs)) {
        if (item.h?.typeGen !== "aWeapon") continue;

        createProxy(item.h, "Speed", (original) => {
            if (cheatState.godlike?.speed) {
                // Support configurable speed, default to 9
                const configSpeed = cheatConfig.godlike?.speed;
                return typeof configSpeed === "number" ? configSpeed : 9;
            }
            return original;
        });
    }
}

/**
 * Setup upgrade stone success proxy for upstones rng cheat.
 * Intercepts the Amount property (success chance) on upgrade stones.
 * When enabled, returns 100 for guaranteed success.
 */
export function setupUpstoneSuccessProxy() {
    for (const item of Object.values(itemDefs)) {
        if (item.h?.typeGen !== "dStone") continue;

        createProxy(item.h, "Amount", (original) => {
            if (cheatState.upstones?.rng) return 100;
            return original;
        });
    }
}

/**
 * Setup upgrade stone slot proxy for upstones use cheat.
 * Intercepts the Trigger property (slot consumption) on upgrade stones.
 * When enabled, returns 0 so no upgrade slot is consumed.
 */
export function setupUpstoneSlotProxy() {
    for (const item of Object.values(itemDefs)) {
        if (item.h?.typeGen !== "dStone") continue;

        createProxy(item.h, "Trigger", (original) => {
            if (cheatState.upstones?.use) return 0;
            return original;
        });
    }
}

/**
 * Setup equip all proxy for equipall cheat.
 * Intercepts Class and lvReqToEquip properties on all equipment.
 * When enabled, returns "ALL" for class and 1 for level requirement.
 */
export function setupEquipAllProxy() {
    for (const item of Object.values(itemDefs)) {
        if (!item.h) continue;

        // Proxy the Class property if it exists
        if (item.h.Class !== undefined) {
            createProxy(item.h, "Class", (original) => {
                if (cheatState.equipall) return "ALL";
                return original;
            });
        }

        // Proxy the lvReqToEquip property if it exists
        if (item.h.lvReqToEquip !== undefined) {
            createProxy(item.h, "lvReqToEquip", (original) => {
                if (cheatState.equipall) return 1;
                return original;
            });
        }
    }
}

/**
 * Setup time candy proxy for wide candytime cheat.
 * Intercepts the ID property on 1-hour time candy.
 * When enabled, returns configurable duration (default 600 = 10 hours).
 */
export function setupTimeCandyProxy() {
    const timeCandy = itemDefs.Timecandy1?.h;
    if (!timeCandy) return;

    createProxy(timeCandy, "ID", (original) => {
        if (cheatState.wide?.candytime) {
            const configuredValue = cheatConfig.wide?.candytime;
            return !isNaN(configuredValue) ? configuredValue : 600;
        }
        return original;
    });
}

/**
 * Setup all item definition proxies.
 * Called from the main proxy setup in setup.js.
 */
export function setupItemProxies() {
    setupWeaponSpeedProxy();
    setupUpstoneSuccessProxy();
    setupUpstoneSlotProxy();
    setupEquipAllProxy();
    setupTimeCandyProxy();
}
