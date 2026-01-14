/**
 * Obol Rolling Helper
 *
 * Functions to roll perfect stats on obols.
 */

import { bEngine, itemDefs } from "../core/globals.js";
import { cheatConfig } from "../core/state.js";

/**
 * Roll all obols to perfect stats.
 * Rolls personal, family, all characters, and inventory obols.
 */
export function rollAllObols() {
    rollPersonalObols();
    rollFamilyObols();
    rollAllCharactersObols();
    rollInventoryObols();
}

/**
 * Roll personal obols to perfect stats.
 */
export function rollPersonalObols() {
    rollPerfectObols(
        bEngine.gameAttributes.h.ObolEquippedOrder[0],
        bEngine.gameAttributes.h.ObolEquippedMap[0],
        bEngine.gameAttributes.h.CharacterClass
    );
}

/**
 * Roll family obols to perfect stats.
 */
export function rollFamilyObols() {
    rollPerfectObols(
        bEngine.gameAttributes.h.ObolEquippedOrder[1],
        bEngine.gameAttributes.h.ObolEquippedMap[1],
        bEngine.gameAttributes.h.CharacterClass
    );
}

/**
 * Roll all characters' obols to perfect stats.
 */
export function rollAllCharactersObols() {
    Object.values(bEngine.getGameAttribute("PlayerDATABASE").h).forEach((player) => {
        rollPerfectObols(player.h.ObolEquippedOrder, player.h.ObolEquippedMap, player.h.CharacterClass);
    });
}

/**
 * Roll inventory obols to perfect stats.
 */
export function rollInventoryObols() {
    [0, 1, 2, 3].forEach((index) => {
        const obolOrder = bEngine.gameAttributes.h.ObolInventoryOrder[index];
        rollPerfectObols(
            obolOrder,
            bEngine.gameAttributes.h.ObolInventoryMap[index],
            bEngine.gameAttributes.h.CharacterClass
        );
    });
}

/**
 * Roll perfect stats on a set of obols.
 *
 * @param {Array} obolOrder - Array of obol item IDs
 * @param {Array} obolMap - Array of obol stat maps
 * @param {number} characterClass - The character class ID
 */
export function rollPerfectObols(obolOrder, obolMap, characterClass) {
    // Determine primary stat based on character class
    const primaryStat = [1, 2, 3, 4, 5].includes(characterClass)
        ? "LUK"
        : [31, 32, 33, 34, 36, 40].includes(characterClass)
        ? "WIS"
        : [7, 8, 9, 10, 12, 14, 16].includes(characterClass)
        ? "STR"
        : [19, 20, 21, 22, 25, 29].includes(characterClass)
        ? "AGI"
        : "LUK";

    // Get preferred stat from config or use primary
    const preferredStat =
        cheatConfig?.wide?.perfectobols?.preferredstat === "PRIMARY"
            ? primaryStat
            : cheatConfig?.wide?.perfectobols?.preferredstat || primaryStat;

    obolOrder.forEach((obol, index) => {
        if (["Locked", "Blank"].some((s) => obol.indexOf(s) !== -1)) return;

        const obolDef = itemDefs[obol].h;
        const obolMapItem = obolMap[index].h;
        let rollsLeft = 2;

        // Clear existing stats
        Object.keys(obolMapItem).forEach((stat) => delete obolMapItem[stat]);

        obolDef.SuperFunItemDisplayType = "Inventory";

        // Add unique stats if present
        if (obolDef.UQ1txt !== 0) {
            obolMapItem.UQ1txt = obolDef.UQ1txt;
            obolMapItem.UQ1val = 1;
            rollsLeft--;
        }
        if (obolDef.UQ2txt !== 0) {
            obolMapItem.UQ2txt = obolDef.UQ2txt;
            obolMapItem.UQ2val = 1;
            rollsLeft--;
        }

        if (obolDef.Weapon_Power > 0 && ["HEXAGON_OBOL", "SPARKLE_OBOL"].includes(obolDef.Type)) {
            // Skilling obol - add weapon power
            obolMapItem.Weapon_Power = 1;
            rollsLeft--;
        } else {
            // Non-skilling obol - add max possible preferred stat
            obolMapItem[preferredStat] = obolDef.ID + 1;
            rollsLeft--;
        }

        if (rollsLeft > 0) {
            // Add max possible LUK, or AGI if preferred stat is LUK
            obolMapItem[preferredStat === "LUK" ? "AGI" : "LUK"] = obolDef.ID + 1;
            rollsLeft--;
        }
    });
}
