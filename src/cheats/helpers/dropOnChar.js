/**
 * Drop On Character Helper
 *
 * Drops items directly onto the current character.
 */

import { itemDefs, events, gga } from "../core/globals.js";
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
 * Drop an item on the current character.
 *
 * @param {string} item - The item ID to drop
 * @param {number} amount - The quantity to drop
 * @returns {string} Result message
 */
export function dropOnChar(item, amount) {
    const actorEvents189 = events(189);

    try {
        const itemDefinition = itemDefs[item];

        if (itemDefinition) {
            // Temporarily disable autoloot to chest
            const toChest = cheatConfig.wide.autoloot.itemstochest;
            if (cheatConfig.wide.autoloot) {
                cheatConfig.wide.autoloot.itemstochest = false;
            }

            const { y, x } = getCharCords();

            if (item.includes("SmithingRecipes"))
                actorEvents189._customBlock_DropSomething(item, 0, amount, 0, 2, y, 0, x, y);
            else actorEvents189._customBlock_DropSomething(item, amount, 0, 0, 2, y, 0, x, y);

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
