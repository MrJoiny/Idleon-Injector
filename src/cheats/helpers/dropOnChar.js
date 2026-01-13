/**
 * Drop On Character Helper
 *
 * Drops items directly onto the current character.
 */

import { bEngine, itemDefs, events } from "../core/globals.js";

// Reference to cheatConfig (injected at runtime)
let cheatConfig = null;

/**
 * Set the cheat config reference.
 * @param {object} config
 */
export function setCheatConfig(config) {
    cheatConfig = config;
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
    const character = bEngine.getGameAttribute("OtherPlayers").h[bEngine.getGameAttribute("UserInfo")[0]];

    try {
        const itemDefinition = itemDefs[item];

        if (itemDefinition) {
            // Temporarily disable autoloot to chest
            const toChest = cheatConfig?.wide?.autoloot?.itemstochest;
            if (cheatConfig?.wide?.autoloot) {
                cheatConfig.wide.autoloot.itemstochest = false;
            }

            let x = character.getXCenter();
            let y = character.getValue("ActorEvents_20", "_PlayerNode");

            if (item.includes("SmithingRecipes"))
                actorEvents189._customBlock_DropSomething(item, 0, amount, 0, 2, y, 0, x, y);
            else actorEvents189._customBlock_DropSomething(item, amount, 0, 0, 2, y, 0, x, y);

            // Restore autoloot to chest setting
            if (cheatConfig?.wide?.autoloot) {
                cheatConfig.wide.autoloot.itemstochest = toChest;
            }

            return `Dropped ${itemDefinition.h.displayName.replace(/_/g, " ")}. (x${amount})`;
        } else return `No item found for '${item}'`;
    } catch (err) {
        return `Error: ${err}`;
    }
}
