/**
 * Drop On Character Helper
 *
 * Drops items directly onto the current character.
 */

import { itemDefs, events, gga, behavior } from "../core/globals.js";
import { cheatConfig } from "../core/state.js";

/**
 * Get the current character's coordinates.
 *
 * @returns {{ y: number, x: number }} The character's coordinates
 */
export function getCharCords() {
    const OtherPlayer = gga.OtherPlayers.h;
    const character = OtherPlayer[gga.UserInfo[0]];
    const x = character.getXCenter();
    const y = character.getValue("ActorEvents_20", "_PlayerNode");
    return { y, x };
}

/**
 * Drop an item on the current character, bypassing the 2E9 cap.
 *
 * @param {string} item - The item ID to drop
 * @param {number} amount - The quantity to drop
 * @returns {string} Result message
 */
export function dropOnChar(item, amount) {
    try {
        const itemDefinition = itemDefs[item];

        if (itemDefinition) {
            // Temporarily disable autoloot to chest
            const toChest = cheatConfig.wide.autoloot.itemstochest;
            if (cheatConfig.wide.autoloot) {
                cheatConfig.wide.autoloot.itemstochest = false;
            }

            const { y, x } = getCharCords();

            // SmithingRecipes uses old drop method
            const actorEvents189 = events(189);
            if (item.includes("SmithingRecipes")) {
                actorEvents189._customBlock_DropSomething(item, 0, amount, 0, 2, y, 0, x, y);

                // restore autoloot and return (keep behavior consistent)
                if (cheatConfig.wide.autoloot) cheatConfig.wide.autoloot.itemstochest = toChest;
                return `Dropped ${itemDefinition.h.displayName.replace(/_/g, " ")}. (x${amount})`;
            }

            // 'Normal' drop method bypassing 2E9 cap
            gga.dummyDisplayPopup = item;
            gga.DummyNumber = Math.round(amount);
            gga.DummyNumber2 = 0;

            // Save/replace dummyActor list
            const savedList = (gga.dummyActor || []).slice();
            gga.DummyList2 = savedList;

            gga.dummyActor = [];
            gga.dummyActor.push(0);
            gga.dummyActor.push(2);
            gga.dummyActor.push(y);
            gga.dummyActor.push(0);

            // TalentBook special case
            if ((gga.dummyDisplayPopup || "").indexOf("TalentBook") !== -1) {
                const numStr = "" + gga.DummyNumber;
                const firstChar = parseInt(numStr.charAt(0), 10);

                gga.DummyNumber2 = parseInt(numStr.substring(firstChar + 1), 10) || 0;

                const idx = parseInt(numStr.substring(1, firstChar + 1), 10) | 0;
                gga.DummyNumber = gga.CustomLists?.h?.TalentOrder?.[idx] | 0;
            }

            behavior.createRecycledActor(behavior.getActorType(44), x, gga.NodeY[y | 0] - 36, 0);

            // Restore dummyActor list
            gga.dummyActor = gga.DummyList2;

            // Restore autoloot to chest setting
            if (cheatConfig.wide.autoloot) {
                cheatConfig.wide.autoloot.itemstochest = toChest;
            }

            return `Dropped ${itemDefinition.h.displayName.replace(/_/g, " ")}. (x${amount})`;
        } else return `No item found for '${item}'`;
    } catch (err) {
        return `Error: ${err}`;
    }
}
