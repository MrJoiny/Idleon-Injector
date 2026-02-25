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
 * Drop an item on the current character, bypassing the 2E9 cap.
 *
 * @param {string} item - The item ID to drop
 * @param {number} amount - The quantity to drop
 * @returns {string} Result message
 */
export function dropOnChar(item, amount) {
    const scene  = window.behavior;
    const engine = window.behavior.engine;
    
    try {
        const itemDefinition = itemDefs[item];

        if (itemDefinition) {
            // Temporarily disable autoloot to chest
            const toChest = cheatConfig.wide.autoloot.itemstochest;
            if (cheatConfig.wide.autoloot) {
                cheatConfig.wide.autoloot.itemstochest = false;
            }

        const { y, x } = getCharCords();
        const b = item.includes("SmithingRecipes") ? 0 : amount;
        const e = item.includes("SmithingRecipes") ? amount : 0;

        engine.gameAttributes.h.dummyDisplayPopup = item;
        engine.gameAttributes.h.DummyNumber       = Math.round(b); // no 2E9 cap
        engine.gameAttributes.h.DummyNumber2      = e;

        const savedList = engine.getGameAttribute("dummyActor").slice();
        engine.gameAttributes.h.DummyList2    = savedList;
        engine.gameAttributes.h.dummyActor    = [];
        engine.getGameAttribute("dummyActor").push(0);
        engine.getGameAttribute("dummyActor").push(2);
        engine.getGameAttribute("dummyActor").push(y);
        engine.getGameAttribute("dummyActor").push(0);

        // TalentBook special case
        if (engine.getGameAttribute("dummyDisplayPopup").indexOf("TalentBook") !== -1) {
            const numStr    = "" + engine.getGameAttribute("DummyNumber");
            const firstChar = parseInt(numStr.charAt(0));
            engine.gameAttributes.h.DummyNumber2 = parseInt(numStr.substring(firstChar + 1));
            engine.gameAttributes.h.DummyNumber  = engine.getGameAttribute("CustomLists").h.TalentOrder[
                parseInt(numStr.substring(1, firstChar + 1)) | 0
            ] | 0;
        }

        scene.createRecycledActor(
            scene.getActorType(44),
            x,
            engine.getGameAttribute("NodeY")[y | 0] - 36,
            0
        );
        engine.gameAttributes.h.dummyActor = engine.getGameAttribute("DummyList2");

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
