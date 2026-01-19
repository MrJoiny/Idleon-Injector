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
 * Setup all item definition proxies.
 *
 * Iterates through itemDefs once and applies all relevant proxies
 */
export function setupItemProxies() {
    if (itemDefs._isPatched) return;
    Object.defineProperty(itemDefs, "_isPatched", { value: true, enumerable: false });

    for (const item of Object.values(itemDefs)) {
        if (!item.h) continue;

        const typeGen = item.h.typeGen;

        // Weapon speed (godlike speed)
        if (typeGen === "aWeapon") {
            createProxy(item.h, "Speed", (original) => {
                if (cheatState.godlike.speed) return cheatConfig.godlike.speed ?? 9;
                return original;
            });
        }

        // Upgrade stone (upstones rng + use)
        if (typeGen === "dStone") {
            createProxy(item.h, "Amount", (original) => {
                if (cheatState.upstones.rng) return 100;
                return original;
            });

            // Slot consumption
            createProxy(item.h, "Trigger", (original) => {
                if (cheatState.upstones.use) return 0;
                return original;
            });
        }

        // Equip all
        if (item.h.Class !== undefined) {
            createProxy(item.h, "Class", (original) => {
                if (cheatState.equipall) return "ALL";
                return original;
            });
        }

        if (item.h.lvReqToEquip !== undefined) {
            createProxy(item.h, "lvReqToEquip", (original) => {
                if (cheatState.equipall) return 1;
                return original;
            });
        }
    }

    // Time candy, single item
    const timeCandy = itemDefs.Timecandy1.h;
    if (timeCandy) {
        createProxy(timeCandy, "ID", (original) => {
            if (cheatState.wide.candytime) return cheatConfig.wide.candytime ?? 600;
            return original;
        });
    }
}
